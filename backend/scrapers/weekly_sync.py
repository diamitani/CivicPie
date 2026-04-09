#!/usr/bin/env python3
"""
Weekly Chicago civic sync.

Fetches official citywide and ward-level sources, snapshots the pages, extracts
community-facing civic signals, and optionally publishes normalized records to
Supabase.
"""

from __future__ import annotations

import argparse
from dataclasses import asdict
from datetime import datetime, timezone
from hashlib import sha1
import json
import os
from pathlib import Path
import re
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup
import requests

from source_registry import CivicSource, build_source_registry
from playwright_fallback import fetch_rendered_html_sync

USER_AGENT = "CivicPie Weekly Sync Bot (public-interest civic data collection)"

CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "meetings": ("meeting", "agenda", "hearing", "town hall", "committee", "minutes"),
    "elections": ("election", "vote", "voter", "ballot", "candidate", "polling"),
    "volunteer": ("volunteer", "cleanup", "service day", "community event"),
    "community-news": ("news", "newsletter", "announcement", "update", "community"),
    "city-services": ("311", "service", "permit", "safety", "street", "sanitation"),
}

MONTH_PATTERN = r"(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}"


def slugify(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return normalized or "item"


def fetch_html(source: CivicSource, use_playwright: bool) -> tuple[str, str, bool]:
    response = requests.get(
        source.url,
        timeout=30,
        headers={"User-Agent": USER_AGENT},
        allow_redirects=True,
    )
    response.raise_for_status()
    html = response.text
    final_url = response.url
    used_playwright = False

    if use_playwright and ("enable javascript" in html.lower() or len(html) < 700):
        rendered = fetch_rendered_html_sync(final_url)
        if rendered:
            html = rendered
            used_playwright = True

    return html, final_url, used_playwright


def detect_category(text: str, href: str) -> str | None:
    haystack = f"{text} {href}".lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            return category
    return None


def extract_raw_date(snippet: str) -> str | None:
    match = re.search(MONTH_PATTERN, snippet.lower())
    return match.group(0) if match else None


def extract_items(source: CivicSource, final_url: str, html: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    soup = BeautifulSoup(html, "html.parser")
    title = soup.title.string.strip() if soup.title and soup.title.string else source.title
    headings = [heading.get_text(" ", strip=True) for heading in soup.select("h1, h2")[:8]]
    text_content = soup.get_text(" ", strip=True)

    page_record = {
        "source_id": source.source_id,
        "title": title,
        "jurisdiction": source.jurisdiction,
        "source_type": source.source_type,
        "url": final_url,
        "ward_number": source.ward_number,
        "status": "active",
        "metadata": {
            "headings": headings,
            "excerpt": text_content[:500],
            **(source.metadata or {}),
        },
    }

    seen_urls: set[str] = set()
    items: list[dict[str, Any]] = []
    for anchor in soup.find_all("a", href=True):
        label = anchor.get_text(" ", strip=True)
        href = urljoin(final_url, anchor["href"])

        if not label or href in seen_urls:
            continue

        category = detect_category(label, href)
        if not category:
            continue

        container_text = anchor.parent.get_text(" ", strip=True)
        snippet = container_text[:280] if container_text else label
        raw_date = extract_raw_date(snippet)
        item_key = f"{source.source_id}-{slugify(label)}-{sha1(href.encode('utf-8')).hexdigest()[:10]}"

        items.append(
            {
                "item_key": item_key,
                "source_id": source.source_id,
                "title": label[:180],
                "summary": snippet,
                "category": category,
                "url": href,
                "raw_date_text": raw_date,
                "confidence": 0.55 if category in {"community-news", "volunteer"} else 0.75,
                "metadata": {
                    "source_url": final_url,
                    "source_title": title,
                    "source_type": source.source_type,
                },
                "active": True,
            }
        )
        seen_urls.add(href)

    return page_record, items


def load_previous_hashes(latest_dir: Path) -> dict[str, str]:
    pages_path = latest_dir / "pages.json"
    if not pages_path.exists():
        return {}
    previous_pages = json.loads(pages_path.read_text())
    return {page["source_id"]: page["content_hash"] for page in previous_pages}


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def publish_to_supabase(
    run_record: dict[str, Any],
    sources: list[dict[str, Any]],
    items: list[dict[str, Any]],
    diffs: list[dict[str, Any]],
) -> bool:
    supabase_url = os.environ.get("SUPABASE_URL")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_role_key:
        return False

    def upsert(table: str, rows: list[dict[str, Any]], on_conflict: str) -> None:
        if not rows:
            return
        response = requests.post(
            f"{supabase_url}/rest/v1/{table}?on_conflict={on_conflict}",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
            data=json.dumps(rows),
            timeout=60,
        )
        response.raise_for_status()

    upsert("scrape_runs", [run_record], "run_key")
    upsert("civic_sources", sources, "source_id")
    upsert("civic_items", items, "item_key")
    upsert("reconcile_diffs", diffs, "diff_key")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Run weekly Chicago civic sync")
    parser.add_argument(
        "--output-dir",
        default="backend/data/weekly_sync",
        help="Directory where scrape snapshots should be written.",
    )
    parser.add_argument(
        "--use-playwright",
        action="store_true",
        help="Use Playwright fallback for JavaScript-heavy pages when needed.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Limit number of sources processed for local testing.",
    )
    args = parser.parse_args()

    started_at = datetime.now(timezone.utc)
    output_base = Path(args.output_dir)
    latest_dir = output_base / "latest"
    previous_hashes = load_previous_hashes(latest_dir)

    registry = build_source_registry()
    if args.limit:
        registry = registry[: args.limit]

    run_key = started_at.strftime("%Y%m%dT%H%M%SZ")
    run_dir = output_base / run_key

    pages: list[dict[str, Any]] = []
    items: list[dict[str, Any]] = []
    diffs: list[dict[str, Any]] = []
    used_playwright = False

    for source in registry:
        try:
            html, final_url, source_used_playwright = fetch_html(source, args.use_playwright)
            page_record, page_items = extract_items(source, final_url, html)
            content_hash = sha1(html.encode("utf-8")).hexdigest()
            page_record["content_hash"] = content_hash
            page_record["last_checked_at"] = datetime.now(timezone.utc).isoformat()
            pages.append(page_record)
            items.extend(page_items)
            used_playwright = used_playwright or source_used_playwright

            previous_hash = previous_hashes.get(source.source_id)
            if previous_hash and previous_hash != content_hash:
                diffs.append(
                    {
                        "diff_key": f"{run_key}-{source.source_id}",
                        "run_key": run_key,
                        "source_id": source.source_id,
                        "diff_type": "content_hash_changed",
                        "old_value": previous_hash,
                        "new_value": content_hash,
                        "severity": "medium",
                        "reviewed": False,
                    }
                )
        except Exception as exc:  # pragma: no cover - network and parser issues are runtime concerns
            diffs.append(
                {
                    "diff_key": f"{run_key}-{source.source_id}-error",
                    "run_key": run_key,
                    "source_id": source.source_id,
                    "diff_type": "scrape_error",
                    "old_value": None,
                    "new_value": str(exc),
                    "severity": "high",
                    "reviewed": False,
                }
            )

    completed_at = datetime.now(timezone.utc)
    manifest = {
        "run_key": run_key,
        "started_at": started_at.isoformat(),
        "completed_at": completed_at.isoformat(),
        "source_count": len(pages),
        "item_count": len(items),
        "diff_count": len(diffs),
        "used_playwright": used_playwright,
    }

    for target_dir in (run_dir, latest_dir):
        write_json(target_dir / "manifest.json", manifest)
        write_json(target_dir / "pages.json", pages)
        write_json(target_dir / "community_items.json", items)
        write_json(target_dir / "diffs.json", diffs)
        write_json(target_dir / "source_registry.json", [asdict(source) for source in registry])

    run_record = {
        "run_key": run_key,
        "started_at": started_at.isoformat(),
        "completed_at": completed_at.isoformat(),
        "status": "completed",
        "output_dir": str(run_dir),
        "source_count": len(pages),
        "item_count": len(items),
        "used_playwright": used_playwright,
    }

    published = publish_to_supabase(run_record, pages, items, diffs)
    manifest["published_to_supabase"] = published
    write_json(run_dir / "manifest.json", manifest)
    write_json(latest_dir / "manifest.json", manifest)

    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
