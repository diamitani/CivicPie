"""Read-only API over the elected-officials / agencies database."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from backend.db import get_db
from backend.db.models import Agency, Jurisdiction, Office, OfficialTerm, Person

router = APIRouter(prefix="/api", tags=["civic"])


def _official(term: OfficialTerm) -> dict:
    office, person = term.office, term.person
    juris = office.jurisdiction
    return {
        "id": term.id,
        "person_id": person.id,
        "name": person.full_name,
        "photo_url": person.photo_url,
        "title": office.title,
        "branch": office.branch.value,
        "chamber": office.chamber,
        "level": juris.level.value,
        "jurisdiction": juris.name,
        "state": juris.state_code or term.office_state,
        "district": office.district.name if office.district else None,
        "party": term.party_label,
        "start_date": term.start_date,
        "end_date": term.end_date,
        "is_current": term.is_current,
        "email": term.contact_email,
        "phone": term.contact_phone,
        "website": term.official_website,
        "twitter": term.twitter_handle,
        "facebook": term.facebook_url,
    }


def _term_query():
    return (
        select(OfficialTerm)
        .join(OfficialTerm.office)
        .join(Office.jurisdiction)
        .join(OfficialTerm.person)
        .options(
            joinedload(OfficialTerm.person),
            joinedload(OfficialTerm.office).joinedload(Office.jurisdiction),
            joinedload(OfficialTerm.office).joinedload(Office.district),
        )
    )


@router.get("/stats")
def stats(db: Session = Depends(get_db)) -> dict:
    by_level = dict(
        db.execute(
            select(Jurisdiction.level, func.count(OfficialTerm.id))
            .select_from(OfficialTerm)
            .join(OfficialTerm.office)
            .join(Office.jurisdiction)
            .where(OfficialTerm.is_current.is_(True))
            .group_by(Jurisdiction.level)
        ).all()
    )
    by_branch = dict(
        db.execute(
            select(Office.branch, func.count(OfficialTerm.id))
            .select_from(OfficialTerm)
            .join(OfficialTerm.office)
            .where(OfficialTerm.is_current.is_(True))
            .group_by(Office.branch)
        ).all()
    )
    juris = dict(db.execute(select(Jurisdiction.level, func.count()).group_by(Jurisdiction.level)).all())
    return {
        "current_officials": sum(by_level.values()),
        "officials_by_level": {k.value: v for k, v in by_level.items()},
        "officials_by_branch": {k.value: v for k, v in by_branch.items()},
        "jurisdictions_by_level": {k.value: v for k, v in juris.items()},
        "agencies": db.scalar(select(func.count()).select_from(Agency)),
    }


@router.get("/officials")
def list_officials(
    q: Optional[str] = None,
    level: Optional[str] = None,
    state: Optional[str] = Query(None, min_length=2, max_length=2),
    branch: Optional[str] = None,
    party: Optional[str] = None,
    current: bool = True,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict:
    stmt = _term_query()
    if current:
        stmt = stmt.where(OfficialTerm.is_current.is_(True))
    if q:
        stmt = stmt.where(Person.full_name.ilike(f"%{q}%"))
    if level:
        stmt = stmt.where(Jurisdiction.level == level)
    if state:
        stmt = stmt.where(
            or_(Jurisdiction.state_code == state.upper(), OfficialTerm.office_state == state.upper())
        )
    if branch:
        stmt = stmt.where(Office.branch == branch)
    if party:
        stmt = stmt.where(OfficialTerm.party_label.ilike(party))
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery()))
    rows = db.scalars(stmt.order_by(Person.last_name, Person.full_name).limit(limit).offset(offset)).unique().all()
    return {"total": total, "limit": limit, "offset": offset, "results": [_official(t) for t in rows]}


@router.get("/officials/{term_id}")
def get_official(term_id: int, db: Session = Depends(get_db)) -> dict:
    term = db.scalars(_term_query().where(OfficialTerm.id == term_id)).unique().first()
    if term is None:
        raise HTTPException(status_code=404, detail="Official not found")
    data = _official(term)
    p = term.person
    data.update(
        biography=p.biography,
        birth_date=p.birth_date,
        gender=p.gender,
        committees=term.committees,
        office_address=term.office_address,
        external_ids={k: v for k, v in {
            "bioguide": p.bioguide_id, "openstates": p.openstates_id, "govtrack": p.govtrack_id,
            "fec": p.fec_id, "fjc": p.fjc_id, **(p.extra_ids or {}),
        }.items() if v},
    )
    return data


@router.get("/jurisdictions")
def list_jurisdictions(
    q: Optional[str] = None,
    level: Optional[str] = None,
    state: Optional[str] = Query(None, min_length=2, max_length=2),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(Jurisdiction)
    if q:
        stmt = stmt.where(Jurisdiction.name.ilike(f"%{q}%"))
    if level:
        stmt = stmt.where(Jurisdiction.level == level)
    if state:
        stmt = stmt.where(Jurisdiction.state_code == state.upper())
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Jurisdiction.name).limit(limit).offset(offset)).all()
    return {
        "total": total,
        "results": [
            {"id": j.id, "name": j.name, "level": j.level.value, "state": j.state_code,
             "ocd_id": j.ocd_id, "website": j.website, "details": j.extra_data}
            for j in rows
        ],
    }


@router.get("/agencies")
def list_agencies(
    q: Optional[str] = None,
    parent_id: Optional[int] = None,
    top_level: bool = False,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(Agency)
    if q:
        stmt = stmt.where(or_(Agency.name.ilike(f"%{q}%"), Agency.short_name.ilike(f"%{q}%")))
    if parent_id is not None:
        stmt = stmt.where(Agency.parent_id == parent_id)
    if top_level:
        stmt = stmt.where(Agency.parent_id.is_(None))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Agency.name).limit(limit).offset(offset)).all()
    return {
        "total": total,
        "results": [
            {"id": a.id, "name": a.name, "short_name": a.short_name, "level": a.level,
             "parent_id": a.parent_id, "description": a.description, "website": a.website,
             "wikipedia_url": a.wikipedia_url}
            for a in rows
        ],
    }
