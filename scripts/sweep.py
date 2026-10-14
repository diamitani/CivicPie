#!/usr/bin/env python3
"""
CivicPie Weekly Data Sweeper
Pulls live civic data from Chicago Data Portal.
Updates JSON files in public/data/
"""

import json, os, sys, time, hashlib
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data"
CACHE_DIR = Path.home() / ".civicpie" / "sweeper_cache"
USER_AGENT = "CivicPie/2.0 (civicpie.com)"
NOW = datetime.now(timezone.utc).isoformat()

def ensure_dirs():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

def cached_fetch(url, cache_key=None, ttl=86400):
    if cache_key is None: cache_key = hashlib.md5(url.encode()).hexdigest()
    cp = CACHE_DIR / f"{cache_key}.json"
    if cp.exists() and time.time() - cp.stat().st_mtime < ttl:
        try:
            with open(cp) as f: return json.load(f)
        except: pass
    req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    try:
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            with open(cp, "w") as f: json.dump(data, f)
            time.sleep(0.3)
            return data
    except Exception as e:
        print(f"  SKIP {url[:80]} — {e}")
        return None

def save(filename, data):
    p = OUTPUT_DIR / filename
    p.write_text(json.dumps(data, indent=2))
    print(f"  -> {filename} ({p.stat().st_size:,}B)")

# ─── Sweeps ──────────────────────────────────────────────────────────────────

def sweep_alderpersons():
    print("\n[1/4] Chicago Alderpersons")
    url = "https://data.cityofchicago.org/resource/htai-wnw4.json?$limit=60"
    raw = cached_fetch(url, "chi_alders", 86400)
    if not raw: return
    officials = []
    for r in raw:
        if not r.get("alderman"): continue
        n = r["alderman"]
        if "," in n:
            parts = n.split(",", 1)
            n = f"{parts[1].strip()} {parts[0].strip()}"
        officials.append({
            "id": f"chi-ward-{r.get('ward','')}",
            "name": n, "title": f"Alderperson Ward {r.get('ward','')}",
            "level": "City", "party": "Nonpartisan",
            "contact": {"phone": r.get("ward_phone"), "email": r.get("email")},
        })
    save("chicago_alderpersons.json", {"generated_at": NOW, "count": len(officials), "officials": officials})
    print(f"  {len(officials)} alderpersons")

def sweep_wards():
    print("\n[2/4] Chicago Ward Offices")
    url = "https://data.cityofchicago.org/resource/htai-wnw4.json?$select=ward,ward_phone,email"
    raw = cached_fetch(url, "chi_wards", 86400)
    if not raw: return
    wards = [{"ward": r.get("ward"), "phone": r.get("ward_phone"), "email": r.get("email")} for r in raw if r.get("ward")]
    save("chicago_ward_offices.json", {"generated_at": NOW, "wards": wards})
    print(f"  {len(wards)} ward offices")

def sweep_events():
    print("\n[3/4] Civic Events Calendar")
    events = [
        {"id": "cc-meeting", "title": "Chicago City Council Meeting", "category": "City Council",
         "description": "Monthly meeting of the full Chicago City Council.", "date": "1st Wednesday monthly",
         "time": "10:00 AM", "location": "City Hall, 121 N LaSalle St", "recurring": True,
         "link": "https://www.chicago.gov/city/en/depts/cityclerk.html", "tags": ["city-council", "public-meeting"]},
        {"id": "ward-night", "title": "Ward Night — Meet Your Alderperson", "category": "Community",
         "description": "Community meeting with your ward alderperson.", "date": "1st & 3rd Monday",
         "time": "6:00 PM", "location": "Your Ward Office", "recurring": True, "tags": ["community", "ward"]},
        {"id": "caps-beat", "title": "CAPS Beat Meeting", "category": "Public Safety",
         "description": "Chicago Alternative Policing Strategy community meeting.", "date": "Monthly",
         "location": "Your Police District", "recurring": True, "tags": ["public-safety"]},
        {"id": "elections-board", "title": "Board of Elections Meeting", "category": "Elections",
         "description": "Public meeting of the Chicago Board of Elections.", "date": "Monthly",
         "location": "69 W Washington St", "recurring": True, "link": "https://chicagoelections.gov", "tags": ["elections"]},
    ]
    save("civic_calendar.json", {"generated_at": NOW, "events": events})
    print(f"  {len(events)} events")

def sweep_elections():
    print("\n[4/4] Election Deadlines")
    deadlines = [
        {"id": "il-2026", "name": "2026 IL General Election", "date": "2026-11-03",
         "reg_deadline": "2026-10-20", "early_vote": "2026-10-17", "level": "State",
         "state": "IL", "reg_url": "https://ova.elections.il.gov/", "source": "IL Board of Elections"},
        {"id": "chi-2027", "name": "2027 Chicago Municipal", "date": "2027-02-25",
         "reg_deadline": "2027-02-11", "level": "City", "state": "IL",
         "reg_url": "https://ova.elections.il.gov/", "source": "Chicago Board of Elections"},
        {"id": "us-2028", "name": "2028 Presidential General", "date": "2028-11-07",
         "reg_deadline": "2028-10-17", "level": "Federal", "state": "IL",
         "reg_url": "https://ova.elections.il.gov/", "source": "US EAC"},
    ]
    save("election_deadlines.json", {"generated_at": NOW, "deadlines": deadlines})
    print(f"  {len(deadlines)} deadlines")

def write_index():
    files = sorted(OUTPUT_DIR.glob("*.json"))
    datasets = {}
    for f in files:
        try:
            d = json.loads(f.read_text())
            c = len(d) if isinstance(d, (list, dict)) else 1
        except: c = 0
        datasets[f.name] = {"size": f.stat().st_size, "count": c}
    idx = {"version": "3.0.0", "generated_at": NOW, "sweep_last": NOW, "datasets": datasets,
           "total": len(datasets), "total_bytes": sum(d["size"] for d in datasets.values())}
    save("master_index.json", idx)
    print(f"\nMASTER: {len(datasets)} files, {idx['total_bytes']:,} bytes")

if __name__ == "__main__":
    print(f"CivicPie Weekly Sweeper — {NOW}")
    ensure_dirs()
    sweep_alderpersons()
    sweep_wards()
    sweep_events()
    sweep_elections()
    write_index()
    print("Done. Data in public/data/")
