"""Headless-browser helpers (Playwright primary, Selenium cross-check).

Used for (a) end-to-end checks of our own API/docs and (b) probing
JavaScript-rendered government sites when planning scrapers.

Chromium comes from $PLAYWRIGHT_BROWSERS_PATH. Selenium needs a chromedriver
whose major version matches that Chromium: set CHROMEDRIVER_PATH (a matching
driver is available from storage.googleapis.com/chrome-for-testing-public/
<version>/linux64/chromedriver-linux64.zip).
"""

from __future__ import annotations

import glob
import os
from dataclasses import dataclass
from typing import Optional

UA = "CivicPie Bot (civic engagement platform; +https://civicpie.com)"


def chromium_path() -> Optional[str]:
    base = os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")
    hits = sorted(glob.glob(os.path.join(base, "chromium-*", "chrome-linux", "chrome")))
    return hits[-1] if hits else None


@dataclass
class Page:
    url: str
    status: Optional[int]
    title: str
    text: str
    html_len: int
    links: int
    mailto: int
    tel: int
    error: Optional[str] = None


def _proxy() -> Optional[dict]:
    url = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    return {"server": url} if url else None


def playwright_fetch(url: str, wait_ms: int = 1500, timeout_ms: int = 25000) -> Page:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chromium_path(), args=["--no-sandbox"], proxy=_proxy())
        try:
            ctx = browser.new_context(user_agent=UA)
            page = ctx.new_page()
            try:
                resp = page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
                page.wait_for_timeout(wait_ms)
                hrefs = page.eval_on_selector_all("a[href]", "els => els.map(e => e.getAttribute('href'))")
                return Page(
                    url=url, status=resp.status if resp else None, title=page.title(),
                    text=page.inner_text("body")[:200000], html_len=len(page.content()),
                    links=len(hrefs), mailto=sum(h.startswith("mailto:") for h in hrefs),
                    tel=sum(h.startswith("tel:") for h in hrefs),
                )
            except Exception as exc:  # network/timeouts are data, not crashes
                return Page(url, None, "", "", 0, 0, 0, 0, error=f"{type(exc).__name__}: {str(exc)[:160]}")
        finally:
            browser.close()


def selenium_driver():
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service

    opts = webdriver.ChromeOptions()
    opts.binary_location = chromium_path() or ""
    for a in ("--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", f"--user-agent={UA}"):
        opts.add_argument(a)
    driver_path = os.environ.get("CHROMEDRIVER_PATH")
    service = Service(driver_path) if driver_path else Service()
    return webdriver.Chrome(service=service, options=opts)


def selenium_fetch(url: str, wait_s: float = 1.5) -> Page:
    import time

    try:
        d = selenium_driver()
    except Exception as exc:
        return Page(url, None, "", "", 0, 0, 0, 0, error=f"selenium unavailable: {str(exc)[:160]}")
    try:
        d.set_page_load_timeout(25)
        d.get(url)
        time.sleep(wait_s)
        hrefs = [a.get_attribute("href") or "" for a in d.find_elements("css selector", "a[href]")]
        return Page(url, None, d.title, d.find_element("tag name", "body").text[:200000], len(d.page_source),
                    len(hrefs), sum(h.startswith("mailto:") for h in hrefs), sum(h.startswith("tel:") for h in hrefs))
    except Exception as exc:
        return Page(url, None, "", "", 0, 0, 0, 0, error=f"{type(exc).__name__}: {str(exc)[:160]}")
    finally:
        d.quit()
