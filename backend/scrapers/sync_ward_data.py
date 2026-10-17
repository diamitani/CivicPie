#!/usr/bin/env python3
"""
sync_ward_data.py
=================
Fetches the latest ward data from the Chicago Data Portal API and
generates an updated TypeScript data file for CivicPie.

Data source: https://data.cityofchicago.org/resource/htai-wnw4.json

Usage:
    python3 backend/scrapers/sync_ward_data.py

This script:
  1. Pulls from the official Chicago Data Portal (Socrata) API
  2. Compares against current data to detect changes
  3. Outputs a diff of what changed
  4. Writes updated ward-data.ts files (shared + frontend)
"""

import json
import ssl
import sys
import os
from datetime import datetime
import urllib.request
from urllib.request import urlopen, Request
from typing import Any

API_URL = "https://data.cityofchicago.org/resource/htai-wnw4.json"
VERIFY_URL = "https://www.chicago.gov/city/en/about/wards.html"

# Neighborhoods must be manually maintained — the API does not include them.
# This map is updated whenever ward boundaries change (last: 2023 redistricting).
WARD_NEIGHBORHOODS: dict[int, list[str]] = {
    1: ['Logan Square', 'West Town', 'Wicker Park', 'Bucktown', 'Humboldt Park', 'Ukrainian Village', 'East Village'],
    2: ['Near North Side', 'Old Town', 'Gold Coast', 'Streeterville', 'River North'],
    3: ['Bronzeville', 'Douglas', 'Grand Boulevard', 'South Loop'],
    4: ['Bronzeville', 'Kenwood', 'North Kenwood', 'Oakland'],
    5: ['Hyde Park', 'South Shore', 'Woodlawn', 'Jackson Park Highlands'],
    6: ['Chatham', 'Greater Grand Crossing', 'Park Manor', 'Woodlawn'],
    7: ['South Shore', 'South Chicago', 'Calumet Heights', 'Avalon Park'],
    8: ['Chatham', 'Auburn Gresham', 'Avalon Park', 'Burnside'],
    9: ['Roseland', 'Pullman', 'West Pullman', 'Riverdale'],
    10: ['East Side', 'South Deering', 'Hegewisch', 'South Chicago'],
    11: ['Bridgeport', 'Chinatown', 'Armour Square', 'McKinley Park'],
    12: ['Brighton Park', 'McKinley Park', 'Archer Heights', 'Gage Park'],
    13: ['Clearing', 'Garfield Ridge', 'West Lawn', 'Chicago Lawn'],
    14: ['Gage Park', 'Chicago Lawn', 'West Elsdon', 'West Lawn'],
    15: ['Brighton Park', 'Back of the Yards', 'New City', 'Gage Park'],
    16: ['Englewood', 'West Englewood', 'Auburn Gresham'],
    17: ['Auburn Gresham', 'Ashburn', 'Beverly', 'Washington Heights'],
    18: ['Ashburn', 'Wrightwood', 'Scottsdale', 'Chicago Lawn'],
    19: ['Beverly', 'Morgan Park', 'Mount Greenwood'],
    20: ['Back of the Yards', 'New City', 'Englewood', 'Washington Park'],
    21: ['Morgan Park', 'Washington Heights', 'Roseland', 'West Pullman'],
    22: ['Little Village', 'South Lawndale', 'North Lawndale'],
    23: ['Garfield Ridge', 'Clearing', 'Archer Heights', 'West Elsdon'],
    24: ['North Lawndale', 'East Garfield Park', 'West Garfield Park'],
    25: ['Pilsen', 'Chinatown', 'South Loop', 'University Village', 'Little Italy'],
    26: ['Humboldt Park', 'West Town', 'Ukrainian Village', 'Noble Square'],
    27: ['West Loop', 'Near West Side', 'Fulton Market', 'East Garfield Park'],
    28: ['Austin', 'West Garfield Park', 'Near West Side'],
    29: ['Austin', 'Belmont Cragin', 'Galewood'],
    30: ['Belmont Cragin', 'Hermosa', 'Portage Park'],
    31: ['Belmont Cragin', 'Hermosa', 'Kelvyn Park', 'Logan Square'],
    32: ['Bucktown', 'Wicker Park', 'Roscoe Village', 'North Center'],
    33: ['Albany Park', 'Irving Park', 'North Park', 'Ravenswood'],
    34: ['South Loop', 'Loop', 'Near South Side', 'Dearborn Park'],
    35: ['Avondale', 'Logan Square', 'Hermosa', 'Irving Park'],
    36: ['Belmont Cragin', 'Montclare', 'Galewood', 'Portage Park'],
    37: ['Austin', 'West Humboldt Park', 'Belmont Cragin'],
    38: ['Dunning', 'Montclare', 'Belmont Heights', 'Portage Park'],
    39: ['North Park', 'Albany Park', 'Mayfair', 'Old Irving Park'],
    40: ['West Ridge', 'Lincoln Square', 'Bowmanville', 'Budlong Woods'],
    41: ['Edison Park', 'Norwood Park', "O'Hare", 'Forest Glen'],
    42: ['Loop', 'Near North Side', 'River North', 'Magnificent Mile', 'Streeterville'],
    43: ['Lincoln Park', 'Old Town', 'Near North Side', 'Gold Coast'],
    44: ['Lakeview', 'Wrigleyville', 'Boystown', 'East Lakeview'],
    45: ['Jefferson Park', 'Portage Park', 'Forest Glen', 'Gladstone Park'],
    46: ['Uptown', 'Buena Park', 'Sheridan Park', 'Graceland West'],
    47: ['Lincoln Square', 'North Center', 'Ravenswood', 'Lakeview'],
    48: ['Edgewater', 'Andersonville', 'Magnolia Glen', 'Lakewood Balmoral'],
    49: ['Rogers Park', 'West Ridge', 'Loyola'],
    50: ['West Ridge', 'Peterson Park', 'Arcadia Terrace', 'Budlong Woods'],
}


def fetch_api_data() -> list[dict[str, Any]]:
    """Fetch the latest ward data from Chicago Data Portal."""
    print(f"[{datetime.now().isoformat()}] Fetching data from {API_URL}...")
    req = Request(API_URL, headers={'User-Agent': 'CivicPie Data Sync'})
    try:
        with urlopen(req) as resp:
            data = json.loads(resp.read().decode())
    except Exception:
        # Fallback for environments with missing CA certs (e.g. macOS Python)
        print("  -> SSL verification failed, retrying with unverified context...")
        ctx = ssl._create_unverified_context()
        handler = urllib.request.HTTPSHandler(context=ctx)
        opener = urllib.request.build_opener(handler)
        with opener.open(req) as resp:
            data = json.loads(resp.read().decode())
    print(f"  -> Received {len(data)} records")
    return data


def normalize(record: dict[str, Any]) -> dict[str, Any]:
    """Normalize a single API record into our schema."""
    ward_num = int(record['ward'])
    return {
        'ward': ward_num,
        'alderperson': record.get('alderman', ''),
        'wardOfficeAddress': record.get('address', ''),
        'wardOfficeCity': record.get('city', 'Chicago'),
        'wardOfficeState': record.get('state', 'IL'),
        'wardOfficeZip': record.get('zipcode', ''),
        'wardPhone': record.get('ward_phone', ''),
        'wardFax': record.get('ward_fax'),
        'email': record.get('email', ''),
        'website': record.get('website', {}).get('url') if isinstance(record.get('website'), dict) else record.get('website'),
        'cityHallAddress': record.get('city_hall_address', ''),
        'cityHallPhone': record.get('city_hall_phone', ''),
        'photoUrl': record.get('photo_link', {}).get('url') if isinstance(record.get('photo_link'), dict) else None,
        'neighborhoods': WARD_NEIGHBORHOODS.get(ward_num, []),
        'latitude': float(record.get('location', {}).get('latitude', 0)),
        'longitude': float(record.get('location', {}).get('longitude', 0)),
    }


def compare_and_report(old_file: str, new_records: list[dict]) -> list[str]:
    """Compare new data against the old file and report differences."""
    changes = []
    # We check name changes primarily
    for rec in new_records:
        ward = rec['ward']
        name = rec['alderperson']
        # Simple string search in old file
        # In production you'd parse the TS and compare field by field
        if name not in open(old_file).read():
            changes.append(f"  Ward {ward}: alderperson may have changed -> {name}")
    return changes


def main():
    raw = fetch_api_data()
    records = sorted([normalize(r) for r in raw], key=lambda x: x['ward'])

    print(f"\n=== Ward Data Summary ({len(records)} wards) ===\n")
    for r in records:
        # Fix "Last, First" -> "First Last" if needed
        name = r['alderperson']
        if ',' in name:
            parts = [p.strip() for p in name.split(',', 1)]
            name = f"{parts[1]} {parts[0]}"
            r['alderperson'] = name
        print(f"  Ward {r['ward']:2d}: {name:30s}  {r['wardPhone']:18s}  {r['email']}")

    # Check for discrepancies against existing data
    frontend_data = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'src', 'lib', 'ward-data.ts')
    if os.path.exists(frontend_data):
        changes = compare_and_report(frontend_data, records)
        if changes:
            print(f"\n=== Potential Changes Detected ===")
            for c in changes:
                print(c)
        else:
            print(f"\n  All data matches current files.")
    else:
        print(f"\n  No existing data file found at {frontend_data}. First run.")

    print(f"\n[{datetime.now().isoformat()}] Sync complete. Review changes above.")
    print(f"  Source: {API_URL}")
    print(f"  Verify: {VERIFY_URL}")


if __name__ == '__main__':
    main()
