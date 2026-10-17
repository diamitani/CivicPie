"""Deterministic backend QA scan (stdlib only), modeled on the jev-backend-qa checklist.

    python -m backend.qa.backend_checks --repo . [--json-out findings.json]

Exit 0 = clean, 1 = findings, 2 = secret found. Checks: secrets in tracked
files, tracked .env files, SQL tables without RLS or policies, non-idempotent
migrations, service-role keys in client code, env vars read by code but absent
from .env.example, FastAPI list routes without a bounded limit, and routes
that do not require auth (flagged as a tripwire: confirm "public by design").
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

SECRET_PATTERNS = {
    "aws_access_key": r"AKIA[0-9A-Z]{16}",
    "private_key": r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    "slack_token": r"xox[baprs]-[0-9A-Za-z-]{10,}",
    "github_token": r"gh[pousr]_[A-Za-z0-9]{36,}",
    "stripe_live": r"sk_live_[0-9A-Za-z]{16,}",
    "anthropic_key": r"sk-ant-[A-Za-z0-9_-]{20,}",
    "openai_key": r"sk-[A-Za-z0-9]{32,}",
    "google_api_key": r"AIza[0-9A-Za-z_-]{35}",
    "jwt": r"eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}",
    "pg_url_with_password": r"postgres(?:ql)?://[^:/\s]+:(?!password|pass|xxx|\*+|<|your)[^@\s]{6,}@",
}
PLACEHOLDER = re.compile(r"(xxx|\.\.\.|<redacted>|your[_-]|example|placeholder|changeme|dummy)", re.I)
SKIP_DIRS = {"node_modules", ".git", ".next", "__pycache__", ".pytest_cache"}
TEXT_EXT = {".py", ".ts", ".tsx", ".js", ".mjs", ".json", ".sql", ".md", ".yaml", ".yml", ".toml", ".env", ".example", ".txt", ".cfg", ".ini", ".sh"}


def tracked_files(repo: Path) -> list[Path]:
    # tracked + untracked-but-not-ignored, so pre-commit runs see new files
    out = subprocess.run(["git", "-C", str(repo), "ls-files", "--cached", "--others", "--exclude-standard"],
                         capture_output=True, text=True).stdout.split("\n")
    return [repo / f for f in out if f and (repo / f).is_file()]


def add(findings, check, path, line, detail, severity="medium"):
    findings.append({"check": check, "file": str(path), "line": line, "severity": severity, "detail": detail})


def scan(repo: Path) -> list[dict]:
    findings: list[dict] = []
    files = [f for f in tracked_files(repo) if not (set(f.relative_to(repo).parts) & SKIP_DIRS)]

    # --- secrets (value is never recorded) + tracked env files
    for f in files:
        rel = f.relative_to(repo)
        if re.match(r"^\.env(\.|$)", f.name) and f.name != ".env.example":
            add(findings, "tracked_env_file", rel, 1, "env file is tracked by git", "high")
        if f.suffix not in TEXT_EXT and not f.name.startswith(".env") or f.stat().st_size > 2_000_000:
            continue
        try:
            lines = f.read_text(encoding="utf-8", errors="ignore").splitlines()
        except OSError:
            continue
        for i, line in enumerate(lines, 1):
            if PLACEHOLDER.search(line):
                continue
            for name, pat in SECRET_PATTERNS.items():
                if re.search(pat, line):
                    add(findings, "secret", rel, i, f"possible {name}", "critical")

    # --- SQL: RLS + idempotency
    sql_files = [f for f in files if f.suffix == ".sql"]
    all_sql = "\n".join(f.read_text(errors="ignore") for f in sql_files).lower()
    for f in sql_files:
        text = f.read_text(errors="ignore")
        for m in re.finditer(r"create\s+table\s+(?!if\s+not\s+exists)(?:public\.)?(\w+)", text, re.I):
            add(findings, "non_idempotent_migration", f.relative_to(repo), text[:m.start()].count("\n") + 1,
                f"create table {m.group(1)} without IF NOT EXISTS", "low")
        for m in re.finditer(r"create\s+table\s+if\s+not\s+exists\s+(?:public\.)?(\w+)", text, re.I):
            t = m.group(1).lower()
            has_rls = re.search(rf"alter\s+table\s+(?:public\.)?{t}\s+enable\s+row\s+level\s+security", all_sql) or \
                (re.search(r"foreach\s+t\s+in\s+array\s+array\[([^\]]*)\]", all_sql, re.S) and
                 any(f"'{t}'" in g for g in re.findall(r"foreach\s+t\s+in\s+array\s+array\[([^\]]*)\]", all_sql, re.S)))
            if not has_rls:
                add(findings, "table_without_rls", f.relative_to(repo), text[:m.start()].count("\n") + 1,
                    f"table {t} has no RLS enabled in any migration", "high")

    # --- env inventory: process.env.X / os.environ[...] vs .env.example
    example = repo / ".env.example"
    declared = set(re.findall(r"^([A-Z][A-Z0-9_]+)=", example.read_text(), re.M)) if example.exists() else set()
    framework = {"NODE_ENV", "PORT", "VERCEL", "VERCEL_ENV", "VERCEL_URL", "CI", "HOME", "PATH", "NEXT_RUNTIME", "PLAYWRIGHT_BROWSERS_PATH",
                 "HTTPS_PROXY", "https_proxy", "E2E_SELENIUM", "CHROMEDRIVER_PATH"}
    seen = {}
    for f in files:
        if f.suffix in {".ts", ".tsx", ".js", ".mjs", ".py"} and "tests" not in f.parts:
            txt = f.read_text(errors="ignore")
            for m in re.finditer(r"process\.env\.([A-Z][A-Z0-9_]+)|os\.environ(?:\.get)?\(?\[?[\"']([A-Z][A-Z0-9_]+)", txt):
                name = m.group(1) or m.group(2)
                seen.setdefault(name, (f.relative_to(repo), txt[:m.start()].count("\n") + 1))
    for name, (p, ln) in sorted(seen.items()):
        if name not in declared and name not in framework:
            add(findings, "env_not_in_example", p, ln, f"{name} is read but missing from .env.example", "low")

    # --- service-role key in client-reachable code
    for f in files:
        if f.suffix in {".ts", ".tsx", ".js"} and ("src/app" in str(f) or "components" in str(f) or "frontend" in str(f)):
            txt = f.read_text(errors="ignore")
            if re.search(r"SERVICE_ROLE", txt) and "use client" in txt:
                add(findings, "service_role_in_client", f.relative_to(repo), 1, "service-role key referenced in a client component", "critical")

    # --- FastAPI routes: bounded lists + auth tripwire
    for f in files:
        if f.suffix == ".py" and "api" in f.parts:
            txt = f.read_text(errors="ignore")
            for m in re.finditer(r"@router\.(get|post|put|delete|patch)\(\"([^\"]*)\"", txt):
                line = txt[:m.start()].count("\n") + 1
                body = txt[m.end(): m.end() + 900]
                nxt = re.search(r"\n@router\.", body)
                body = body[: nxt.start()] if nxt else body
                if m.group(1) != "get":
                    add(findings, "write_route_without_auth", f.relative_to(repo), line, f"{m.group(1).upper()} {m.group(2)} has no auth dependency", "high")
                if m.group(1) == "get" and "limit" in body and not re.search(r"le=\d+", body):
                    add(findings, "unbounded_list", f.relative_to(repo), line, f"GET {m.group(2)} limit has no upper bound", "medium")
                if m.group(1) == "get" and "Depends(get_current" not in body:
                    add(findings, "route_without_auth", f.relative_to(repo), line, f"GET {m.group(2)}: confirm public by design", "info")
    return findings


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=".")
    ap.add_argument("--json-out")
    a = ap.parse_args()
    findings = scan(Path(a.repo).resolve())
    if a.json_out:
        Path(a.json_out).write_text(json.dumps(findings, indent=2))
    by = {}
    for f in findings:
        by.setdefault(f["check"], []).append(f)
    for check, fs in sorted(by.items()):
        print(f"[{fs[0]['severity']:8}] {check}: {len(fs)}")
        for f in fs[:8]:
            print(f"    {f['file']}:{f['line']}  {f['detail']}")
    if any(f["check"] == "secret" for f in findings):
        return 2
    return 1 if any(f["severity"] != "info" for f in findings) else 0


if __name__ == "__main__":
    sys.exit(main())
