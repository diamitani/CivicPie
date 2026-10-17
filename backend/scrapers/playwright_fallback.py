"""
Optional Playwright fallback for civic source pages that require JavaScript.
"""

from __future__ import annotations

import asyncio

try:
    from playwright.async_api import async_playwright
except ImportError:  # pragma: no cover - optional dependency in some dev setups
    async_playwright = None


async def fetch_rendered_html(url: str, timeout_ms: int = 20000) -> str | None:
    if async_playwright is None:
        return None

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(url, wait_until="networkidle", timeout=timeout_ms)
            return await page.content()
        finally:
            await browser.close()


def fetch_rendered_html_sync(url: str, timeout_ms: int = 20000) -> str | None:
    try:
        return asyncio.run(fetch_rendered_html(url, timeout_ms=timeout_ms))
    except RuntimeError:
        # Fallback in the unlikely event we are already inside an event loop.
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(fetch_rendered_html(url, timeout_ms=timeout_ms))
        finally:
            loop.close()
