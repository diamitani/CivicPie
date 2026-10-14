#!/usr/bin/env python3
"""Framework QA for the CivicPie data agent.

Covers: robots handling, on-disk cache (+TTL), retry/backoff on 429,
schema validation, normalize (HTML strip / date ISO), dedupe (exact +
fuzzy via difflib), review queue catching a seeded conflict,
review.py --summary, promote.py refusing without --approve, promote
approve-path writing only data-agent-promoted.json + audit log, and an
end-to-end run_source with a fake adapter.

Run from the repo root:
    python3 scripts/data-agent/tests/test_framework.py

Self-contained: local HTTP fixture server, temp dirs for staging/cache.
Exits 0 on all-pass, 1 on any failure. Prints PASS/FAIL per check.
"""

from __future__ import annotations

import http.server
import importlib.util
import json
import re
import socketserver
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DA_DIR = REPO_ROOT / "scripts" / "data-agent"

RESULTS: list[tuple[str, bool, str]] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    RESULTS.append((name, bool(cond), detail))
    print(f"[{'PASS' if cond else 'FAIL'}] {name}" + (f" — {detail}" if detail and not cond else ""))


def load(mod_name: str):
    # Register under the same names pipeline.py/review.py/promote.py use,
    # so _load_sibling() reuses these instances (shared staging paths).
    full = f"civicpie_data_agent_{mod_name}"
    if full in sys.modules:
        return sys.modules[full]
    spec = importlib.util.spec_from_file_location(full, DA_DIR / f"{mod_name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[full] = module
    spec.loader.exec_module(module)
    return module


staging = load("staging")
fetcher_mod = load("fetcher")
pipeline = load("pipeline")

# ---------------------------------------------------------------- fixtures
FIXTURE_HTML = """<html><body>
<h1>City Council</h1>
<table>
<tr><th>Ward</th><th>Name</th><th>Phone</th></tr>
<tr><td>Ward 48</td><td><b>Leni Manaa-Hoppenworth</b></td><td>773-555-0100</td></tr>
<tr><td>Ward 1</td><td>Daniel La Spata</td><td></td></tr>
</table>
</body></html>"""

FIXTURE_JSON = json.dumps({"elections": [{"date": "2026-11-03", "name": "General Election"}]})

HITS: dict[str, int] = {}


class Handler(http.server.BaseHTTPRequestHandler):
    def _count(self):
        HITS[self.path] = HITS.get(self.path, 0) + 1

    def do_GET(self):
        self._count()
        if self.path == "/robots.txt":
            body = "User-agent: *\nDisallow: /blocked\n"
            self._send(200, body, "text/plain")
        elif self.path == "/blocked":
            self._send(200, "should not be fetched", "text/html")
        elif self.path == "/ok.html":
            self._send(200, FIXTURE_HTML, "text/html")
        elif self.path == "/data.json":
            self._send(200, FIXTURE_JSON, "application/json")
        elif self.path == "/flaky":
            if HITS["/flaky"] == 1:
                self.send_response(429)
                self.send_header("Retry-After", "0")
                self.end_headers()
                self.wfile.write(b"slow down")
            else:
                self._send(200, "recovered", "text/plain")
        else:
            self._send(404, "nope", "text/plain")

    def _send(self, code, body, ctype):
        data = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *a):
        pass


def start_server():
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), Handler)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{port}"


def fake_adapter_source(tmp: Path, base: str) -> dict:
    """Write a fake adapter module into tmp/adapters and return a source cfg."""
    adir = tmp / "adapters"
    adir.mkdir()
    (adir / "fake_test.py").write_text(
        "import re\n"
        "URLS = []\n"  # set by test via get_urls
        "def get_urls(ctx):\n"
        "    return [ctx['source']['ctx_base'] + '/ok.html']\n"
        "def parse(payload, ctx):\n"
        "    rows = re.findall(r'<tr><td>Ward (\\d+)</td><td>(.*?)</td><td>(.*?)</td></tr>', payload['body'])\n"
        "    recs = []\n"
        "    for ward, name, phone in rows:\n"
        "        name = re.sub(r'<[^>]+>', '', name)\n"
        "        recs.append({\n"
        "            'record_type': 'official',\n"
        "            'office_id': 'test-alderman',\n"
        "            'district_id': f'test-ward-{ward}',\n"
        "            'full_name': name.strip(),\n"
        "            'contact': {'phone': phone.strip() or None},\n"
        "            'source_id': 'fake-test',\n"
        "            'source_key': f'fake-test:alderman:{ward}',\n"
        "            'source_url': payload['url'],\n"
        "            'scraped_at': ctx['fetched_at'],\n"
        "        })\n"
        "    return recs\n",
        encoding="utf-8")
    return {
        "id": "fake-test", "adapter": "fake_test",
        "rate_limit_rps": 10.0, "respect_robots": False,
        "ctx_base": base,
    }


def point_staging_at(tmp: Path):
    d = tmp / "staging"
    d.mkdir(parents=True, exist_ok=True)
    staging.STAGING_DIR = d
    staging.RECORDS_FILE = d / "records.jsonl"
    staging.REVIEW_FILE = d / "review_queue.jsonl"
    staging.PROMOTIONS_LOG = d / "promotions.log"


def run_case(name, fn):
    try:
        fn()
    except AssertionError as e:
        check(name, False, str(e) or "assertion failed")
    except Exception as e:  # noqa: BLE001
        check(name, False, f"{type(e).__name__}: {e}")


# ---------------------------------------------------------------- tests
def test_robots_and_fetch(base, tmp):
    HITS.clear()
    cache = tmp / "cache1"
    f = fetcher_mod.PoliteFetcher(cache, rate_limit_rps=10, respect_robots=True)
    assert "CivicPie-DataAgent/1.0" in f.session.headers["User-Agent"], "honest UA"
    r = f.get(base + "/blocked")
    check("robots: disallowed URL blocked", r.blocked_by_robots and HITS.get("/blocked", 0) == 0,
          f"hits={HITS.get('/blocked', 0)}")
    r2 = f.get(base + "/ok.html")
    check("robots: allowed URL fetched", r2.ok and "Leni" in r2.body)

    f2 = fetcher_mod.PoliteFetcher(tmp / "cache2", rate_limit_rps=10, respect_robots=False)
    HITS.clear()
    r3 = f2.get(base + "/blocked")
    check("robots: respect_robots=false bypasses check", r3.ok and HITS.get("/blocked", 0) == 1)


def test_cache_and_ttl(base, tmp):
    HITS.clear()
    cache = tmp / "cache3"
    f = fetcher_mod.PoliteFetcher(cache, rate_limit_rps=10, respect_robots=False)
    r1 = f.get(base + "/ok.html")
    r2 = f.get(base + "/ok.html")
    check("cache: second fetch served from cache",
          r1.ok and r2.from_cache and HITS.get("/ok.html", 0) == 1,
          f"hits={HITS.get('/ok.html', 0)}")
    # age the cache entry past the 7-day TTL
    for p in cache.glob("*.json"):
        data = json.loads(p.read_text())
        data["fetched_epoch"] = 0
        p.write_text(json.dumps(data))
    r3 = f.get(base + "/ok.html")
    check("cache: expired TTL refetches", not r3.from_cache and HITS.get("/ok.html", 0) == 2)


def test_backoff(base, tmp):
    HITS.clear()
    f = fetcher_mod.PoliteFetcher(tmp / "cache4", rate_limit_rps=10, respect_robots=False)
    r = f.get(base + "/flaky")
    check("backoff: 429 retried then succeeds", r.ok and r.body == "recovered"
          and HITS.get("/flaky", 0) == 2, f"hits={HITS.get('/flaky', 0)}")


def test_normalize_and_validate():
    rec = {
        "record_type": "official", "office_id": "CHI-Alderman ",
        "district_id": "IL-Chicago-Ward-48",
        "full_name": " <b>Leni</b> Manaa-Hoppenworth ",
        "term_start": "Sep 18, 2026", "term_end": "2026-09-18T00:00:00Z",
        "contact": {"phone": "773-555-0100"},
        "source_id": "x", "source_key": "x:1",
        "source_url": "https://example.org", "scraped_at": "2026-09-18T20:00:00Z",
    }
    n = pipeline.normalize_record(rec)
    check("normalize: HTML stripped", n["full_name"] == "Leni Manaa-Hoppenworth", n["full_name"])
    check("normalize: date → ISO", n["term_start"] == "2026-09-18", n["term_start"])
    check("normalize: ids lowercased", n["office_id"] == "chi-alderman" and n["district_id"] == "il-chicago-ward-48")
    check("normalize: contact defaults filled",
          n["contact"]["email"] is None and n["contact"]["phone"] == "773-555-0100")

    check("validate: good record passes", pipeline.validate_record(n) == [])
    bad = dict(n); del bad["source_key"]
    check("validate: missing source_key rejected",
          any("source_key" in p for p in pipeline.validate_record(bad)))
    bad2 = dict(n); del bad2["source_url"]; del bad2["scraped_at"]
    probs = pipeline.validate_record(bad2)
    check("validate: provenance mandatory",
          any("source_url" in p for p in probs) and any("scraped_at" in p for p in probs))
    bad3 = dict(n); bad3["record_type"] = "press-release"
    check("validate: bad record_type rejected",
          any("record_type" in p for p in pipeline.validate_record(bad3)))


def _rec(key, name, district, **kw):
    r = {"record_type": "official", "office_id": "test", "district_id": district,
         "full_name": name, "source_id": "t", "source_key": key,
         "source_url": "https://example.org", "scraped_at": "2026-09-18T20:00:00Z",
         "contact": {}, "external_ids": {}, "conflicts": []}
    r.update(kw)
    return r


def test_dedupe_exact(tmp):
    point_staging_at(tmp / "s1")
    staged = [_rec("t:alderman:48", "Leni Manaa-Hoppenworth", "d-48", contact={"phone": "1"})]
    for r in staged:
        staging.append_record(r)

    same = [_rec("t:alderman:48", "Leni Manaa-Hoppenworth", "d-48", contact={"phone": "1"})]
    parts = pipeline.dedupe(same, staging.read_records())
    check("dedupe: identical source_key+content → unchanged",
          len(parts["unchanged"]) == 1 and not parts["new"] and not parts["changed"])

    changed = [_rec("t:alderman:48", "Leni Manaa-Hoppenworth", "d-48", contact={"phone": "2"})]
    parts = pipeline.dedupe(changed, staging.read_records())
    check("dedupe: same key, new content → changed queue",
          len(parts["changed"]) == 1 and not parts["new"])


def test_dedupe_fuzzy(tmp):
    point_staging_at(tmp / "s2")
    staging.append_record(_rec("t:alderman:48", "Leni Manaa-Hoppenworth", "d-48"))
    cand = _rec("other:alderman:48", "Leni Manaa Hoppenworth", "d-48")  # hyphen dropped, new key
    parts = pipeline.dedupe([cand], staging.read_records())
    check("dedupe: fuzzy name+district → possible_duplicate",
          len(parts["possible_duplicate"]) == 1 and not parts["new"])

    other_district = _rec("other:alderman:49", "Leni Manaa Hoppenworth", "d-49")
    parts = pipeline.dedupe([other_district], staging.read_records())
    check("dedupe: different district → new (no false fuzzy)",
          len(parts["new"]) == 1 and not parts["possible_duplicate"])


def test_review_queue_conflict(tmp):
    point_staging_at(tmp / "s3")
    existing = _rec("t:alderman:1", "Daniel La Spata", "d-1", party="Democratic")
    incoming = _rec("t:alderman:1", "Daniel La Spata", "d-1", party="Independent")
    staging.append_record(existing)
    parts = pipeline.dedupe([incoming], staging.read_records())
    assert len(parts["changed"]) == 1
    item = parts["changed"][0]
    staging.append_review(record=item["record"], existing=item["existing"], reason="changed")
    q = staging.read_review()
    check("review queue: seeded conflict captured",
          len(q) == 1 and q[0]["reason"] == "changed"
          and q[0]["record"]["source_key"] == "t:alderman:1")


def test_review_summary_cli(tmp):
    point_staging_at(tmp / "s4")
    staging.append_record(_rec("t:alderman:48", "Leni Manaa-Hoppenworth", "d-48"))
    staging.append_review(
        record=_rec("t:alderman:1", "Daniel La Spata", "d-1", party="Independent"),
        existing=_rec("t:alderman:1", "Daniel La Spata", "d-1", party="Democratic"),
        reason="changed")
    # review.py runs in a SUBPROCESS, so it reads staging.py's real constants.
    # Swap fixture files into the real staging dir, run, then restore.
    real_dir = DA_DIR / "staging"
    real_dir.mkdir(parents=True, exist_ok=True)
    backups = {}
    for name in ("records.jsonl", "review_queue.jsonl"):
        p = real_dir / name
        backups[name] = p.read_bytes() if p.exists() else None
    try:
        srcdir = Path(staging.RECORDS_FILE).parent
        for name in ("records.jsonl", "review_queue.jsonl"):
            src = srcdir / name
            dst = real_dir / name
            if src.exists():
                dst.write_bytes(src.read_bytes())
            elif dst.exists():
                dst.unlink()
        proc = subprocess.run(
            [sys.executable, str(DA_DIR / "review.py"), "--summary"],
            cwd=REPO_ROOT, capture_output=True, text=True, timeout=60)
        ok = (proc.returncode == 0 and "new (staged, awaiting review):      1" in proc.stdout
              and "changed (same key, new content):    1" in proc.stdout
              and "party" in proc.stdout)
        check("review.py --summary: counts + diffs", ok, proc.stderr[:200] or proc.stdout[:200])

        proc2 = subprocess.run(
            [sys.executable, "-m", "scripts.data-agent.review", "--summary"],
            cwd=REPO_ROOT, capture_output=True, text=True, timeout=60)
        check("review.py via -m scripts.data-agent.review",
              proc2.returncode == 0 and "CivicPie data-agent review" in proc2.stdout,
              proc2.stderr[:200])
    finally:
        for name, data in backups.items():
            p = real_dir / name
            if data is None:
                if p.exists():
                    p.unlink()
            else:
                p.write_bytes(data)
        point_staging_at(tmp / "s4")


def test_promote_refusal():
    proc = subprocess.run(
        [sys.executable, str(DA_DIR / "promote.py")],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=60)
    target = REPO_ROOT / "data" / "seed" / "data-agent-promoted.json"
    check("promote.py: refuses without --approve",
          proc.returncode == 2 and "REFUSAL" in proc.stderr
          and not target.exists(),
          f"rc={proc.returncode} stderr={proc.stderr[:120]}")


def test_promote_approve_path(tmp):
    point_staging_at(tmp / "s5")
    rec = _rec("t:alderman:48", "Leni Manaa-Hoppenworth", "d-48")
    staging.append_record(rec)
    target = REPO_ROOT / "data" / "seed" / "data-agent-promoted.json"
    assert not target.exists(), "precondition: promote target absent"
    try:
        promote = load("promote")
        res = promote.promote(["t:alderman:48"])
        data = json.loads(target.read_text(encoding="utf-8"))
        check("promote: approved record lands in data-agent-promoted.json",
              res["promoted"] and len(data) == 1
              and data[0]["source_key"] == "t:alderman:48")
        check("promote: staged copy removed after promotion",
              staging.read_records() == [])
        log = staging.PROMOTIONS_LOG.read_text(encoding="utf-8")
        check("promote: audit log written", "t:alderman:48" in log and "promoted 1" in log)

        # second promotion of a key with a pending review entry → skipped w/o --force
        rec2 = _rec("t:alderman:1", "Daniel La Spata", "d-1")
        staging.append_record(rec2)
        staging.append_review(record=dict(rec2, party="X"),
                              existing=rec2, reason="changed")
        res2 = promote.promote(["t:alderman:1"])
        check("promote: key with open review entry skipped without --force",
              not res2["promoted"] and "t:alderman:1" in res2["skipped"])
        res3 = promote.promote(["t:alderman:1"], force=True)
        check("promote: --force overrides the review gate",
              len(res3["promoted"]) == 1)
    finally:
        if target.exists():
            target.unlink()  # leave production seed dir exactly as found


def test_end_to_end(base, tmp):
    point_staging_at(tmp / "s6")
    source = fake_adapter_source(tmp, base)
    stats = pipeline.run_source(
        source, dry_run=False,
        adapters_dir=tmp / "adapters", cache_dir=tmp / "cache5")
    check("e2e: run_source stages 2 new records",
          stats["new"] == 2 and stats["unchanged"] == 0 and not stats["errors"],
          json.dumps(stats))
    staged = staging.read_records()
    keys = sorted(r["source_key"] for r in staged)
    check("e2e: staged keys stable", keys == ["fake-test:alderman:1", "fake-test:alderman:48"], str(keys))
    check("e2e: provenance mandatory on staged records",
          all(r.get("source_url") and r.get("scraped_at") for r in staged))

    stats2 = pipeline.run_source(
        source, dry_run=False,
        adapters_dir=tmp / "adapters", cache_dir=tmp / "cache5")
    check("e2e: second run → all unchanged, no dup staging",
          stats2["unchanged"] == 2 and stats2["new"] == 0
          and len(staging.read_records()) == 2, json.dumps(stats2))

    # missing adapter degrades gracefully
    bad = dict(source); bad["adapter"] = "does_not_exist"
    stats3 = pipeline.run_source(bad, adapters_dir=tmp / "adapters", cache_dir=tmp / "cache5")
    check("e2e: missing adapter → error recorded, not raised",
          len(stats3["errors"]) == 1 and stats3["new"] == 0)


def main() -> int:
    srv, base = start_server()
    tmp = Path(tempfile.mkdtemp(prefix="civicpie-qa-"))
    try:
        run_case("robots/fetch", lambda: test_robots_and_fetch(base, tmp))
        run_case("cache/ttl", lambda: test_cache_and_ttl(base, tmp))
        run_case("backoff", lambda: test_backoff(base, tmp))
        run_case("normalize/validate", test_normalize_and_validate)
        run_case("dedupe-exact", lambda: test_dedupe_exact(tmp))
        run_case("dedupe-fuzzy", lambda: test_dedupe_fuzzy(tmp))
        run_case("review-queue", lambda: test_review_queue_conflict(tmp))
        run_case("review-cli", lambda: test_review_summary_cli(tmp))
        run_case("promote-refusal", test_promote_refusal)
        run_case("promote-approve", lambda: test_promote_approve_path(tmp))
        run_case("end-to-end", lambda: test_end_to_end(base, tmp))
    finally:
        srv.shutdown()

    failed = [r for r in RESULTS if not r[1]]
    print(f"\n{len(RESULTS) - len(failed)}/{len(RESULTS)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
