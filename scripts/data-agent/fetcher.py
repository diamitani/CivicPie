"""Polite HTTP fetcher for the CivicPie data agent (PRD §5).

Responsibilities:
  * honest User-Agent on every request
  * robots.txt honored per source (urllib.robotparser), cached per host
  * per-source rate limiting (minimum interval between requests)
  * on-disk cache (7-day TTL) under <cache_dir>/<sha256(url)>.json
  * retries with exponential backoff on 429 / 5xx (honors Retry-After)

Never raises for HTTP problems — every outcome comes back as a FetchResult
so the pipeline can log and continue.  No secrets are read here; adapters
pass API keys in via their own request params/headers.
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from urllib import robotparser
from urllib.parse import urlparse

import requests

USER_AGENT = "CivicPie-DataAgent/1.0 (+https://civicpie.com)"
CACHE_TTL_SECONDS = 7 * 24 * 3600
MAX_RETRIES = 3
BASE_BACKOFF_SECONDS = 1.0
RETRY_STATUSES = {429, 500, 502, 503, 504}


@dataclass
class FetchResult:
    url: str
    status: int | None = None          # None = never got an HTTP response
    headers: dict = field(default_factory=dict)
    body: str = ""
    from_cache: bool = False
    fetched_at: str = ""               # ISO-8601 UTC
    blocked_by_robots: bool = False
    error: str = ""                    # set when status is None

    @property
    def ok(self) -> bool:
        return self.status == 200 and not self.blocked_by_robots

    def payload(self) -> dict:
        """Shape handed to adapter.parse()."""
        return {
            "url": self.url,
            "status": self.status,
            "headers": self.headers,
            "body": self.body,
            "from_cache": self.from_cache,
            "fetched_at": self.fetched_at,
        }


def _utcnow_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


class PoliteFetcher:
    def __init__(
        self,
        cache_dir: str | Path,
        rate_limit_rps: float = 1.0,
        respect_robots: bool = True,
        session: requests.Session | None = None,
    ):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.min_interval = 1.0 / rate_limit_rps if rate_limit_rps > 0 else 0.0
        self.respect_robots = respect_robots
        self.session = session or requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})
        self._last_request: dict[str, float] = {}   # host -> monotonic time
        self._robots: dict[str, robotparser.RobotFileParser | None] = {}

    # ---------------- cache ----------------
    def _cache_path(self, url: str) -> Path:
        digest = hashlib.sha256(url.encode("utf-8")).hexdigest()
        return self.cache_dir / f"{digest}.json"

    def _read_cache(self, url: str) -> FetchResult | None:
        p = self._cache_path(url)
        if not p.exists():
            return None
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None
        age = time.time() - data.get("fetched_epoch", 0)
        if age > CACHE_TTL_SECONDS:
            return None
        if data.get("url") != url:
            return None
        return FetchResult(
            url=url,
            status=data.get("status"),
            headers=data.get("headers", {}),
            body=data.get("body", ""),
            from_cache=True,
            fetched_at=data.get("fetched_at", ""),
        )

    def _write_cache(self, result: FetchResult) -> None:
        if not result.ok:
            return  # only cache successful fetches
        data = {
            "url": result.url,
            "fetched_epoch": time.time(),
            "fetched_at": result.fetched_at,
            "status": result.status,
            "headers": {k: str(v) for k, v in result.headers.items()},
            "body": result.body,
        }
        try:
            self._cache_path(result.url).write_text(
                json.dumps(data), encoding="utf-8"
            )
        except OSError:
            pass  # cache is best-effort

    # ---------------- robots ----------------
    def _robots_parser(self, url: str) -> robotparser.RobotFileParser | None:
        host = urlparse(url).netloc.lower()
        if host in self._robots:
            return self._robots[host]
        parser: robotparser.RobotFileParser | None = None
        try:
            robots_url = f"{urlparse(url).scheme}://{host}/robots.txt"
            resp = self.session.get(robots_url, timeout=15)
            if resp.status_code == 200:
                parser = robotparser.RobotFileParser()
                parser.parse(resp.text.splitlines())
        except requests.RequestException:
            parser = None  # fail open: unreachable robots.txt ≠ a ban
        self._robots[host] = parser
        return parser

    def allowed(self, url: str) -> bool:
        if not self.respect_robots:
            return True
        parser = self._robots_parser(url)
        if parser is None:
            return True
        return parser.can_fetch(USER_AGENT, url)

    # ---------------- rate limit ----------------
    def _throttle(self, url: str) -> None:
        host = urlparse(url).netloc.lower()
        now = time.monotonic()
        last = self._last_request.get(host, 0.0)
        wait = self.min_interval - (now - last)
        if wait > 0:
            time.sleep(wait)
        self._last_request[host] = time.monotonic()

    # ---------------- fetch ----------------
    def _request_once(self, url: str) -> requests.Response:
        self._throttle(url)
        return self.session.get(url, timeout=30)

    def get(self, url: str, *, force_refresh: bool = False) -> FetchResult:
        """Fetch a URL politely. Never raises."""
        if self.respect_robots and not self.allowed(url):
            return FetchResult(url=url, blocked_by_robots=True,
                               error="disallowed by robots.txt")

        if not force_refresh:
            cached = self._read_cache(url)
            if cached is not None:
                return cached

        last_error = ""
        for attempt in range(MAX_RETRIES + 1):
            try:
                resp = self._request_once(url)
            except requests.RequestException as exc:
                last_error = f"{type(exc).__name__}: {exc}"
            else:
                if resp.status_code == 200:
                    result = FetchResult(
                        url=url,
                        status=200,
                        headers=dict(resp.headers),
                        body=resp.text,
                        fetched_at=_utcnow_iso(),
                    )
                    self._write_cache(result)
                    return result
                if resp.status_code in RETRY_STATUSES and attempt < MAX_RETRIES:
                    last_error = f"HTTP {resp.status_code}"
                    retry_after = resp.headers.get("Retry-After")
                    try:
                        delay = float(retry_after) if retry_after else BASE_BACKOFF_SECONDS * (2 ** attempt)
                    except ValueError:
                        delay = BASE_BACKOFF_SECONDS * (2 ** attempt)
                    time.sleep(min(delay, 60.0))
                    continue
                return FetchResult(url=url, status=resp.status_code,
                                   headers=dict(resp.headers),
                                   body=resp.text[:2000],
                                   fetched_at=_utcnow_iso(),
                                   error=f"HTTP {resp.status_code}")
            if attempt < MAX_RETRIES:
                time.sleep(BASE_BACKOFF_SECONDS * (2 ** attempt))

        return FetchResult(url=url, status=None, fetched_at=_utcnow_iso(),
                           error=f"failed after {MAX_RETRIES + 1} attempts: {last_error}")
