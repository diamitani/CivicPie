"""ORM models for the elected officials database.

Schema design notes:

The graph models real-world relationships rather than flattening every official
into one row, because the same person frequently holds multiple offices over
time and the same office is held by many people across terms. Normalising lets
us track succession (Mayor of Chicago in 2019 vs 2023) and joint office-holding
without duplicating bio data.

Core nodes:
    Jurisdiction -- a governing body (US, Illinois, Cook County, City of Chicago,
                    Chicago School District 299). Self-referential parent_id
                    forms the federal -> state -> county -> city -> special hierarchy.
    District     -- a geographic constituency within a jurisdiction (IL-07,
                    Ward 25, State Senate District 13). Optional GeoJSON.
    Office       -- a position within a jurisdiction/district (US Senator from IL,
                    Mayor of Chicago, 25th Ward Alderperson). One row per seat.
    Person       -- a human being. Stable across offices/terms.
    OfficialTerm -- the join table that says "this Person held this Office from
                    YYYY-MM-DD to YYYY-MM-DD with these contact details and
                    party affiliation." This is where most query traffic lands.

Provenance:
    DataSource   -- registry of every upstream API/scraper (Congress.gov,
                    OpenStates, Google Civic, ProPublica, state SoS sites).
    IngestionRun -- one row per pipeline execution, for observability and
                    rollback. OfficialTerm rows reference the run that
                    last touched them via `last_ingestion_run_id`.

Key indices and constraints are added inline; tier-2/3/4 ingestion will append
specialised columns via Alembic migrations rather than overloading this file.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.session import Base
from backend.models.official import Branch, GovernmentLevel, Party


def _enum_col(enum_cls, name: str) -> SAEnum:
    """Build SQLAlchemy Enum that persists `.value` rather than `.name`.

    This matches the lowercase enum types declared in the Alembic migration
    (and Postgres native enum types), so the same DB works in dev (SQLite)
    and prod (Postgres) without case mismatches.
    """
    return SAEnum(
        enum_cls,
        name=name,
        values_callable=lambda c: [m.value for m in c],
        native_enum=True,
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Jurisdiction(Base, TimestampMixin):
    __tablename__ = "jurisdictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ocd_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    level: Mapped[GovernmentLevel] = mapped_column(_enum_col(GovernmentLevel, "governmentlevel"), nullable=False, index=True)
    state_code: Mapped[Optional[str]] = mapped_column(String(2), index=True)
    classification: Mapped[Optional[str]] = mapped_column(String(64))
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("jurisdictions.id"), index=True)
    website: Mapped[Optional[str]] = mapped_column(String(512))
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON)

    parent = relationship("Jurisdiction", remote_side=[id], backref="children")
    districts = relationship("District", back_populates="jurisdiction", cascade="all, delete-orphan")
    offices = relationship("Office", back_populates="jurisdiction", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_jurisdictions_state_level", "state_code", "level"),
    )


class District(Base, TimestampMixin):
    __tablename__ = "districts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    jurisdiction_id: Mapped[int] = mapped_column(
        ForeignKey("jurisdictions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ocd_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    district_type: Mapped[str] = mapped_column(String(64), nullable=False)
    identifier: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    population: Mapped[Optional[int]] = mapped_column(Integer)
    geojson: Mapped[Optional[dict]] = mapped_column(JSON)
    demographics: Mapped[Optional[dict]] = mapped_column(JSON)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON)

    jurisdiction = relationship("Jurisdiction", back_populates="districts")
    offices = relationship("Office", back_populates="district")

    # Note: no uniqueness on (jurisdiction_id, district_type, identifier).
    # Federal Congressional districts share identifier "1" across all 50 states
    # under a single US jurisdiction; we rely on `ocd_id` (already unique) for
    # disambiguation. Sources without OCD IDs accept potential dupes.
    __table_args__ = ()


class Office(Base, TimestampMixin):
    __tablename__ = "offices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    jurisdiction_id: Mapped[int] = mapped_column(
        ForeignKey("jurisdictions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    district_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("districts.id", ondelete="SET NULL"), index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    branch: Mapped[Branch] = mapped_column(_enum_col(Branch, "branch"), nullable=False, index=True)
    chamber: Mapped[Optional[str]] = mapped_column(String(64))
    seat: Mapped[Optional[str]] = mapped_column(String(64))
    is_elected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    term_length_years: Mapped[Optional[int]] = mapped_column(Integer)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON)

    jurisdiction = relationship("Jurisdiction", back_populates="offices")
    district = relationship("District", back_populates="offices")
    terms = relationship("OfficialTerm", back_populates="office", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint(
            "jurisdiction_id", "title", "district_id", "seat", name="uq_office_identity"
        ),
    )


class Person(Base, TimestampMixin):
    __tablename__ = "people"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    first_name: Mapped[Optional[str]] = mapped_column(String(128))
    middle_name: Mapped[Optional[str]] = mapped_column(String(128))
    last_name: Mapped[Optional[str]] = mapped_column(String(128), index=True)
    suffix: Mapped[Optional[str]] = mapped_column(String(32))
    nickname: Mapped[Optional[str]] = mapped_column(String(128))
    gender: Mapped[Optional[str]] = mapped_column(String(32))
    birth_date: Mapped[Optional[datetime]] = mapped_column(Date)
    photo_url: Mapped[Optional[str]] = mapped_column(String(512))
    biography: Mapped[Optional[str]] = mapped_column(Text)

    # External identifiers -- the primary join keys when we re-ingest.
    bioguide_id: Mapped[Optional[str]] = mapped_column(String(32), unique=True, index=True)
    openstates_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True, index=True)
    govtrack_id: Mapped[Optional[int]] = mapped_column(Integer, unique=True)
    fec_id: Mapped[Optional[str]] = mapped_column(String(32), index=True)
    votesmart_id: Mapped[Optional[int]] = mapped_column(Integer, unique=True)
    icpsr_id: Mapped[Optional[int]] = mapped_column(Integer, unique=True)
    fjc_id: Mapped[Optional[str]] = mapped_column(String(32), unique=True, index=True)
    google_civic_id: Mapped[Optional[str]] = mapped_column(String(128), index=True)

    extra_ids: Mapped[Optional[dict]] = mapped_column(JSON)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON)

    terms = relationship("OfficialTerm", back_populates="person", cascade="all, delete-orphan")


class OfficialTerm(Base, TimestampMixin):
    """The actual "X holds office Y" record. One row per (person, office, term)."""

    __tablename__ = "official_terms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    person_id: Mapped[int] = mapped_column(
        ForeignKey("people.id", ondelete="CASCADE"), nullable=False, index=True
    )
    office_id: Mapped[int] = mapped_column(
        ForeignKey("offices.id", ondelete="CASCADE"), nullable=False, index=True
    )

    party: Mapped[Optional[Party]] = mapped_column(_enum_col(Party, "party"), index=True)
    party_label: Mapped[Optional[str]] = mapped_column(String(64))

    start_date: Mapped[Optional[datetime]] = mapped_column(Date, index=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(Date, index=True)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    # Term-scoped contact info -- aldermen change phone numbers when they take office.
    contact_email: Mapped[Optional[str]] = mapped_column(String(255))
    contact_phone: Mapped[Optional[str]] = mapped_column(String(64))
    office_address: Mapped[Optional[str]] = mapped_column(String(512))
    office_city: Mapped[Optional[str]] = mapped_column(String(128))
    office_state: Mapped[Optional[str]] = mapped_column(String(2))
    office_zip: Mapped[Optional[str]] = mapped_column(String(16))
    official_website: Mapped[Optional[str]] = mapped_column(String(512))

    # Social
    twitter_handle: Mapped[Optional[str]] = mapped_column(String(128))
    facebook_url: Mapped[Optional[str]] = mapped_column(String(512))
    instagram_handle: Mapped[Optional[str]] = mapped_column(String(128))
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(512))
    youtube_url: Mapped[Optional[str]] = mapped_column(String(512))

    # Election
    last_election_date: Mapped[Optional[datetime]] = mapped_column(Date)
    last_election_vote_pct: Mapped[Optional[float]] = mapped_column(Float)
    next_election_date: Mapped[Optional[datetime]] = mapped_column(Date)

    # Committees and assignments stored as JSON so each level can shape its own.
    committees: Mapped[Optional[list]] = mapped_column(JSON)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON)

    last_ingestion_run_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("ingestion_runs.id", ondelete="SET NULL"), index=True
    )

    person = relationship("Person", back_populates="terms")
    office = relationship("Office", back_populates="terms")
    last_ingestion_run = relationship("IngestionRun")

    __table_args__ = (
        UniqueConstraint("person_id", "office_id", "start_date", name="uq_term_identity"),
        Index("ix_terms_office_current", "office_id", "is_current"),
    )


class DataSource(Base, TimestampMixin):
    """Registry of every upstream API/scraper feeding the database."""

    __tablename__ = "data_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[Optional[str]] = mapped_column(String(512))
    description: Mapped[Optional[str]] = mapped_column(Text)
    coverage_levels: Mapped[Optional[list]] = mapped_column(JSON)
    coverage_states: Mapped[Optional[list]] = mapped_column(JSON)
    auth_type: Mapped[Optional[str]] = mapped_column(String(64))
    rate_limit: Mapped[Optional[str]] = mapped_column(String(128))
    notes: Mapped[Optional[str]] = mapped_column(Text)


class IngestionRun(Base, TimestampMixin):
    """One row per pipeline invocation. Used for observability + rollback."""

    __tablename__ = "ingestion_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_key: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="running", index=True)
    records_seen: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    records_inserted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    records_updated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    records_failed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    parameters: Mapped[Optional[dict]] = mapped_column(JSON)
