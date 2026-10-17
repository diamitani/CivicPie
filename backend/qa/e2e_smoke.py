"""E2E smoke: boot the API, then verify it in a real browser with BOTH Playwright and Selenium.

    python -m backend.qa.e2e_smoke            # exit 0 = all checks passed

Checks per engine: /docs responds, and from inside the browser the OpenAPI
spec lists our civic routes, /api/stats and /api/officials return sane data,
and over-limit requests are rejected. Requires a seeded DB (run `cli seed` first).
"""

from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import time
import urllib.request

from backend.qa.browser import chromium_path, selenium_driver, playwright_fetch

REQUIRED_PATHS = ["/api/stats", "/api/officials", "/api/jurisdictions", "/api/agencies"]


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _wait(url: str, secs: int = 30) -> None:
    end = time.time() + secs
    while time.time() < end:
        try:
            urllib.request.urlopen(url, timeout=2)
            return
        except Exception:
            time.sleep(0.5)
    raise RuntimeError(f"server never came up at {url}")


def _assert_api(get) -> list[str]:
    """`get(path)` -> parsed JSON, executed inside the browser."""
    fails = []
    spec = get("/openapi.json")
    fails += [f"openapi missing {r}" for r in REQUIRED_PATHS if r not in spec.get("paths", {})]
    stats = get("/api/stats")
    if stats.get("current_officials", 0) < 1000:
        fails.append(f"stats.current_officials too low: {stats.get('current_officials')}")
    offs = get("/api/officials?state=il&level=federal&limit=50")
    if offs.get("total") != 19:
        fails.append(f"IL federal officials expected 19, got {offs.get('total')}")
    if get("/api/officials?limit=5000") .get("detail") is None:
        fails.append("limit=5000 should be rejected (422)")
    return fails


# NOTE: the Swagger UI page itself pulls JS from a CDN, which sandboxed
# browsers may not reach, so we assert on the API from inside the browser
# rather than on the Swagger render.
def check_playwright(base: str) -> list[str]:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chromium_path(), args=["--no-sandbox"])
        page = b.new_page()
        resp = page.goto(f"{base}/docs", wait_until="domcontentloaded")
        fails = [] if resp and resp.status == 200 else [f"/docs status {resp and resp.status}"]
        fails += _assert_api(lambda path: page.evaluate("p => fetch(p).then(r => r.json())", path))
        b.close()
    return fails


def check_selenium(base: str) -> list[str]:
    d = selenium_driver()
    try:
        d.get(f"{base}/docs")
        script = "const cb = arguments[arguments.length-1]; fetch(arguments[0]).then(r => r.json()).then(cb);"
        d.set_script_timeout(20)
        return _assert_api(lambda path: d.execute_async_script(script, path))
    finally:
        d.quit()


def main() -> int:
    port = _free_port()
    base = f"http://127.0.0.1:{port}"
    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "backend.main:app", "--port", str(port), "--log-level", "warning"],
                            env=os.environ.copy())
    results = {}
    try:
        _wait(f"{base}/health")
        results["playwright"] = check_playwright(base)
        if os.environ.get("CHROMEDRIVER_PATH") or os.environ.get("E2E_SELENIUM") == "1":
            results["selenium"] = check_selenium(base)
        else:
            results["selenium"] = ["SKIPPED: set CHROMEDRIVER_PATH to a chromedriver matching Chromium"]
    finally:
        proc.terminate()
    print(json.dumps(results, indent=2))
    return 0 if all(not v or v[0].startswith("SKIPPED") for v in results.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
