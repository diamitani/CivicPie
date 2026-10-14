"""Master CSV export + Supabase/Postgres loader.

The internal SQLAlchemy database (officials graph + agencies) is exported to
the *master schema* the Next.js app reads (see supabase/migrations/
202610140001_master_officials_rls.sql): sources, offices, districts, officials,
agencies, contact_points. CSVs live in data/master/ so the dataset is
diffable in git and loadable anywhere.

Natural keys make loading idempotent and non-duplicating:
  * officials.source_key -- Congress reuses the seed convention `bioguide:<id>`
    so rows upsert onto the existing seed instead of duplicating it.
  * agencies.source_key, districts.district_id, offices.office_id, sources.source_id

President/VP are NOT exported: data/seed/executive_officials.json owns them.
"""

from __future__ import annotations

import csv
import json
import os
from pathlib import Path
from typing import Any, Iterable, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from backend.db.models import Agency, Jurisdiction, Office, OfficialTerm
from backend.models.official import GovernmentLevel

MASTER_DIR = Path(__file__).resolve().parents[2] / "data" / "master"

SOURCES = [
    ("congress-legislators", "unitedstates/congress-legislators", "https://github.com/unitedstates/congress-legislators", "dataset", "CC0"),
    ("fjc-judges", "Federal Judicial Center Biographical Directory", "https://www.fjc.gov/history/judges", "dataset", "Public domain"),
    ("census-counties", "U.S. Census Bureau national_county", "https://www.census.gov/library/reference/code-lists/ansi.html", "dataset", "Public domain"),
    ("federal-register", "Federal Register agencies API", "https://www.federalregister.gov/developers/documentation/api/v1", "api", "Public domain"),
    ("state-exec-seed", "Hand-curated state constitutional officers", None, "manual", None),
]

# office_id -> (title, level, branch, term_years, is_elected). Pre-existing ids
# mirror src/lib/civic/offices.ts so titles stay consistent in both modes.
OFFICES = {
    "us-president": ("President of the United States", "federal", "executive", 4, True),
    "us-vp": ("Vice President of the United States", "federal", "executive", 4, True),
    "us-vice-president": ("Vice President of the United States", "federal", "executive", 4, True),
    "us-cabinet": ("Cabinet Secretary", "federal", "executive", None, False),
    "us-senate": ("U.S. Senator", "federal", "legislative", 6, True),
    "us-house": ("U.S. Representative", "federal", "legislative", 2, True),
    "us-judge-scotus": ("Justice of the Supreme Court", "federal", "judicial", None, False),
    "us-judge-appeals": ("U.S. Circuit Judge", "federal", "judicial", None, False),
    "us-judge-district": ("U.S. District Judge", "federal", "judicial", None, False),
    "us-judge-cit": ("Judge, Court of International Trade", "federal", "judicial", None, False),
    "gen-state-rep": ("State Representative", "state", "legislative", None, True),
    "gen-state-sen": ("State Senator", "state", "legislative", None, True),
    "gen-state-exec": ("State Executive Officer", "state", "executive", None, True),
    "il-state-rep": ("Illinois State Representative", "state", "legislative", 2, True),
    "il-state-sen": ("Illinois State Senator", "state", "legislative", None, True),
    "state-governor": ("Governor", "state", "executive", 4, True),
    "state-attorney-general": ("Attorney General", "state", "executive", 4, True),
    "chi-alderman": ("Alderperson", "local", "legislative", 4, True),
    "gen-mayor": ("Mayor", "local", "executive", None, True),
    "gen-city-council": ("City Council Member", "local", "legislative", None, True),
}

HEADERS = {
    "sources": ["source_id", "name", "url", "source_type", "license"],
    "offices": ["office_id", "title", "level", "branch", "term_length_years", "is_elected"],
    "districts": ["district_id", "district_type", "district_name", "district_number", "city", "state_abbr", "source_id", "external_refs"],
    "officials": ["office_id", "district_id", "full_name", "first_name", "last_name", "party", "is_incumbent",
                  "term_start", "term_end", "photo_url", "biography", "source_id", "source_key", "external_ids", "social"],
    "agencies": ["name", "level", "agency_type", "parent_source_key", "description", "website", "city", "state_abbr",
                 "source_id", "source_key", "external_refs"],
    "contact_points": ["official_source_key", "agency_source_key", "kind", "label", "value", "is_primary", "source_id"],
}


def office_id_for(office: Office) -> Optional[str]:
    t, c = office.title, office.chamber
    if t == "U.S. Senator":
        return "us-senate"
    if t == "U.S. Representative":
        return "us-house"
    if t == "Governor":
        return "state-governor"
    if t == "Attorney General":
        return "state-attorney-general"
    if c == "scotus":
        return "us-judge-scotus"
    return {"appeals": "us-judge-appeals", "district": "us-judge-district", "cit": "us-judge-cit"}.get(c or "")


def _district_id(office: Office, term: OfficialTerm, oid: str) -> Optional[str]:
    st = (term.office_state or "").lower()
    if oid == "us-senate":
        return f"us-senate-{st}"
    if oid == "us-house":
        ident = office.district.identifier if office.district else None
        if ident is None:
            return None
        return f"us-house-{st}-al" if str(ident) == "0" else f"us-house-{st}-{int(ident):02d}"
    if oid in ("state-governor", "state-attorney-general"):
        return f"us-state-{st}"
    return None


def _j(v: Any) -> str:
    return json.dumps(v, sort_keys=True, separators=(",", ":")) if v else "{}"


def _b(v: bool) -> str:
    return "true" if v else "false"


def export_master(session: Session, out_dir: Path = MASTER_DIR) -> dict[str, int]:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    rows: dict[str, list[list]] = {k: [] for k in HEADERS}
    used_offices: set[str] = set()
    districts: dict[str, list] = {}

    rows["sources"] = [[s[0], s[1], s[2] or "", s[3], s[4] or ""] for s in SOURCES]

    terms = session.scalars(
        select(OfficialTerm)
        .where(OfficialTerm.is_current.is_(True))
        .options(
            joinedload(OfficialTerm.person),
            joinedload(OfficialTerm.office).joinedload(Office.district),
            joinedload(OfficialTerm.office).joinedload(Office.jurisdiction),
        )
    ).unique().all()
    for t in sorted(terms, key=lambda x: x.id):
        office, p = t.office, t.person
        oid = office_id_for(office)
        if oid is None:
            continue
        used_offices.add(oid)
        did = _district_id(office, t, oid)
        if did and did not in districts:
            if oid == "us-senate":
                districts[did] = [did, "us_senate", f"{t.office_state} (U.S. Senate)", "", "", t.office_state, "congress-legislators", "{}"]
            elif oid == "us-house":
                num = office.district.identifier
                districts[did] = [did, "us_house", office.district.name, "" if str(num) == "0" else str(num), "", t.office_state, "congress-legislators", "{}"]
            else:
                districts[did] = [did, "state", t.office_state, "", "", t.office_state, "state-exec-seed", "{}"]
        ids = {k: v for k, v in {
            "bioguide": p.bioguide_id, "govtrack": p.govtrack_id, "icpsr": p.icpsr_id,
            "votesmart": p.votesmart_id, "fjc": p.fjc_id, "fec": p.fec_id,
            **{k: v for k, v in (p.extra_ids or {}).items() if k in ("wikipedia", "wikidata", "opensecrets", "ballotpedia", "wikipedia_url")},
        }.items() if v}
        if oid in ("us-senate", "us-house"):
            key, src = f"bioguide:{p.bioguide_id}", "congress-legislators"
        elif oid.startswith("us-judge"):
            key, src = f"fjc:{p.fjc_id}:{office.seat}", "fjc-judges"
        else:
            key, src = f"state-exec:{(t.office_state or '').upper()}:{oid.removeprefix('state-')}", "state-exec-seed"
        social = {k: v for k, v in {"twitter": t.twitter_handle, "facebook": t.facebook_url,
                                    "instagram": t.instagram_handle, "youtube": t.youtube_url}.items() if v}
        rows["officials"].append([
            oid, did or "", p.full_name, p.first_name or "", p.last_name or "", t.party_label or "",
            _b(True), t.start_date or "", t.end_date or "", p.photo_url or "", p.biography or "",
            src, key, _j(ids), _j(social),
        ])
        for kind, label, val in (
            ("phone", "Office", t.contact_phone), ("email", "Office", t.contact_email),
            ("website", "Official", t.official_website), ("address", "Office", t.office_address),
        ):
            if val:
                rows["contact_points"].append([key, "", kind, label, val, _b(kind == "email" or kind == "phone"), src])

    for j in session.scalars(select(Jurisdiction).where(Jurisdiction.level == GovernmentLevel.COUNTY)):
        d = j.extra_data or {}
        fips = d.get("fips")
        if not fips:
            continue
        districts[f"us-county-{fips}"] = [f"us-county-{fips}", "county", j.name, fips, "", j.state_code,
                                          "census-counties", _j({"ocd_id": j.ocd_id, "fips": fips})]

    by_id = {a.id: a for a in session.scalars(select(Agency))}
    for a in sorted(by_id.values(), key=lambda x: x.id):
        parent = by_id.get(a.parent_id)
        rows["agencies"].append([
            a.name, a.level, "department" if not a.parent_id else "sub-agency",
            f"fr-agency:{parent.source_id}" if parent else "", a.description or "", a.website or "",
            "", "", "federal-register", f"fr-agency:{a.source_id}",
            _j({"slug": a.slug, "short_name": a.short_name}),
        ])

    rows["offices"] = [[oid, *OFFICES[oid][:3], OFFICES[oid][3] or "", _b(OFFICES[oid][4])] for oid in sorted(OFFICES)]
    rows["districts"] = sorted(districts.values(), key=lambda r: r[0])
    rows["officials"].sort(key=lambda r: r[12])
    rows["contact_points"].sort(key=lambda r: (r[0], r[2], r[4]))

    counts = {}
    for name, header in HEADERS.items():
        with open(out_dir / f"{name}.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f, lineterminator="\n")
            w.writerow(header)
            w.writerows(rows[name])
        counts[name] = len(rows[name])
    return counts


# ---------------------------------------------------------------- loader ----

def _read(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _n(v: str):
    return v if v != "" else None


def load_master_to_postgres(dsn: Optional[str] = None, master_dir: Path = MASTER_DIR) -> dict[str, int]:
    """Idempotently upsert data/master/*.csv into a Postgres/Supabase database
    that has the master schema (supabase/migrations). Re-running never duplicates."""
    import psycopg2
    from psycopg2.extras import execute_values

    dsn = dsn or os.environ.get("DATABASE_URL")
    if not dsn:
        raise RuntimeError("load-master requires DATABASE_URL (Supabase Postgres connection string).")
    master_dir = Path(master_dir)
    counts: dict[str, int] = {}
    conn = psycopg2.connect(dsn)
    try:
        with conn, conn.cursor() as cur:
            def upsert(table, cols, key, rs, update_cols):
                if not rs:
                    return
                sets = ", ".join(f"{c}=excluded.{c}" for c in update_cols)
                execute_values(
                    cur,
                    f"insert into public.{table} ({', '.join(cols)}) values %s "
                    f"on conflict ({key}) do update set {sets}",
                    [[r[c] for c in cols] for r in rs], page_size=1000,
                )
                counts[table] = len(rs)

            src = [{k: _n(v) for k, v in r.items()} for r in _read(master_dir / "sources.csv")]
            upsert("sources", ["source_id", "name", "url", "source_type", "license"], "source_id", src, ["name", "url", "source_type", "license"])
            off = [{**{k: _n(v) for k, v in r.items()}} for r in _read(master_dir / "offices.csv")]
            for r in off:
                r["is_elected"] = r["is_elected"] == "true"
            upsert("offices", ["office_id", "title", "level", "branch", "term_length_years", "is_elected"], "office_id", off, ["title", "level", "branch", "term_length_years", "is_elected"])
            dis = [{k: _n(v) for k, v in r.items()} for r in _read(master_dir / "districts.csv")]
            upsert("districts", ["district_id", "district_type", "district_name", "district_number", "city", "state_abbr", "source_id", "external_refs"], "district_id", dis, ["district_type", "district_name", "district_number", "state_abbr", "external_refs"])
            ofc = [{k: _n(v) for k, v in r.items()} for r in _read(master_dir / "officials.csv")]
            for r in ofc:
                r["is_incumbent"] = r["is_incumbent"] == "true"
            upsert("officials", ["office_id", "district_id", "full_name", "first_name", "last_name", "party", "is_incumbent", "term_start", "term_end", "photo_url", "biography", "source_id", "source_key", "external_ids", "social"], "source_key", ofc, ["office_id", "district_id", "full_name", "first_name", "last_name", "party", "term_start", "term_end", "photo_url", "biography", "external_ids", "social"])
            ag = [{k: _n(v) for k, v in r.items()} for r in _read(master_dir / "agencies.csv")]
            upsert("agencies", ["name", "level", "agency_type", "description", "website", "city", "state_abbr", "source_id", "source_key", "external_refs"], "source_key", ag, ["name", "level", "agency_type", "description", "website", "external_refs"])
            for r in ag:  # second pass: parent links
                if r["parent_source_key"]:
                    cur.execute(
                        "update public.agencies c set parent_agency_id = p.agency_id from public.agencies p "
                        "where c.source_key=%s and p.source_key=%s",
                        (r["source_key"], r["parent_source_key"]),
                    )
            # contact_points: replace this loader's rows wholesale (no natural key).
            cps = _read(master_dir / "contact_points.csv")
            cur.execute("delete from public.contact_points where source_id = any(%s)", (sorted({r["source_id"] for r in cps}),))
            execute_values(
                cur,
                "insert into public.contact_points (official_id, kind, label, value, is_primary, source_id) "
                "select o.official_id, v.kind, v.label, v.value, v.is_primary::boolean, v.source_id "
                "from (values %s) as v(official_source_key, kind, label, value, is_primary, source_id) "
                "join public.officials o on o.source_key = v.official_source_key",
                [(r["official_source_key"], r["kind"], _n(r["label"]), r["value"], r["is_primary"], r["source_id"]) for r in cps],
                page_size=1000,
            )
            counts["contact_points"] = len(cps)
    finally:
        conn.close()
    return counts
