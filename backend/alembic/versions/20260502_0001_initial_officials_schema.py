"""initial officials schema

Revision ID: 20260502_0001
Revises:
Create Date: 2026-05-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260502_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


GOV_LEVEL = sa.Enum("federal", "state", "county", "city", "local", name="governmentlevel")
BRANCH = sa.Enum("legislative", "executive", "judicial", name="branch")
PARTY = sa.Enum(
    "democrat",
    "republican",
    "independent",
    "libertarian",
    "green",
    "other",
    name="party",
)


def upgrade() -> None:
    op.create_table(
        "jurisdictions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ocd_id", sa.String(length=255), unique=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("level", GOV_LEVEL, nullable=False),
        sa.Column("state_code", sa.String(length=2)),
        sa.Column("classification", sa.String(length=64)),
        sa.Column("parent_id", sa.Integer(), sa.ForeignKey("jurisdictions.id")),
        sa.Column("website", sa.String(length=512)),
        sa.Column("extra_data", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_jurisdictions_ocd_id", "jurisdictions", ["ocd_id"])
    op.create_index("ix_jurisdictions_level", "jurisdictions", ["level"])
    op.create_index("ix_jurisdictions_state_code", "jurisdictions", ["state_code"])
    op.create_index("ix_jurisdictions_parent_id", "jurisdictions", ["parent_id"])
    op.create_index("ix_jurisdictions_state_level", "jurisdictions", ["state_code", "level"])

    op.create_table(
        "districts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "jurisdiction_id",
            sa.Integer(),
            sa.ForeignKey("jurisdictions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ocd_id", sa.String(length=255), unique=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("district_type", sa.String(length=64), nullable=False),
        sa.Column("identifier", sa.String(length=64)),
        sa.Column("population", sa.Integer()),
        sa.Column("geojson", sa.JSON()),
        sa.Column("demographics", sa.JSON()),
        sa.Column("extra_data", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_districts_jurisdiction_id", "districts", ["jurisdiction_id"])
    op.create_index("ix_districts_identifier", "districts", ["identifier"])
    op.create_index("ix_districts_ocd_id", "districts", ["ocd_id"])

    op.create_table(
        "offices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "jurisdiction_id",
            sa.Integer(),
            sa.ForeignKey("jurisdictions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "district_id",
            sa.Integer(),
            sa.ForeignKey("districts.id", ondelete="SET NULL"),
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("branch", BRANCH, nullable=False),
        sa.Column("chamber", sa.String(length=64)),
        sa.Column("seat", sa.String(length=64)),
        sa.Column("is_elected", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("term_length_years", sa.Integer()),
        sa.Column("extra_data", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint(
            "jurisdiction_id", "title", "district_id", "seat", name="uq_office_identity"
        ),
    )
    op.create_index("ix_offices_jurisdiction_id", "offices", ["jurisdiction_id"])
    op.create_index("ix_offices_district_id", "offices", ["district_id"])
    op.create_index("ix_offices_branch", "offices", ["branch"])

    op.create_table(
        "people",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("first_name", sa.String(length=128)),
        sa.Column("middle_name", sa.String(length=128)),
        sa.Column("last_name", sa.String(length=128)),
        sa.Column("suffix", sa.String(length=32)),
        sa.Column("nickname", sa.String(length=128)),
        sa.Column("gender", sa.String(length=32)),
        sa.Column("birth_date", sa.Date()),
        sa.Column("photo_url", sa.String(length=512)),
        sa.Column("biography", sa.Text()),
        sa.Column("bioguide_id", sa.String(length=32), unique=True),
        sa.Column("openstates_id", sa.String(length=64), unique=True),
        sa.Column("govtrack_id", sa.Integer(), unique=True),
        sa.Column("fec_id", sa.String(length=32)),
        sa.Column("votesmart_id", sa.Integer(), unique=True),
        sa.Column("icpsr_id", sa.Integer(), unique=True),
        sa.Column("google_civic_id", sa.String(length=128)),
        sa.Column("extra_ids", sa.JSON()),
        sa.Column("extra_data", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_people_full_name", "people", ["full_name"])
    op.create_index("ix_people_last_name", "people", ["last_name"])
    op.create_index("ix_people_bioguide_id", "people", ["bioguide_id"])
    op.create_index("ix_people_openstates_id", "people", ["openstates_id"])
    op.create_index("ix_people_fec_id", "people", ["fec_id"])
    op.create_index("ix_people_google_civic_id", "people", ["google_civic_id"])

    op.create_table(
        "ingestion_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_key", sa.String(length=64), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="running"),
        sa.Column("records_seen", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_inserted", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_updated", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("records_failed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text()),
        sa.Column("parameters", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ingestion_runs_source_key", "ingestion_runs", ["source_key"])
    op.create_index("ix_ingestion_runs_status", "ingestion_runs", ["status"])

    op.create_table(
        "official_terms",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "person_id",
            sa.Integer(),
            sa.ForeignKey("people.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "office_id",
            sa.Integer(),
            sa.ForeignKey("offices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("party", PARTY),
        sa.Column("party_label", sa.String(length=64)),
        sa.Column("start_date", sa.Date()),
        sa.Column("end_date", sa.Date()),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("contact_email", sa.String(length=255)),
        sa.Column("contact_phone", sa.String(length=64)),
        sa.Column("office_address", sa.String(length=512)),
        sa.Column("office_city", sa.String(length=128)),
        sa.Column("office_state", sa.String(length=2)),
        sa.Column("office_zip", sa.String(length=16)),
        sa.Column("official_website", sa.String(length=512)),
        sa.Column("twitter_handle", sa.String(length=128)),
        sa.Column("facebook_url", sa.String(length=512)),
        sa.Column("instagram_handle", sa.String(length=128)),
        sa.Column("linkedin_url", sa.String(length=512)),
        sa.Column("youtube_url", sa.String(length=512)),
        sa.Column("last_election_date", sa.Date()),
        sa.Column("last_election_vote_pct", sa.Float()),
        sa.Column("next_election_date", sa.Date()),
        sa.Column("committees", sa.JSON()),
        sa.Column("extra_data", sa.JSON()),
        sa.Column(
            "last_ingestion_run_id",
            sa.Integer(),
            sa.ForeignKey("ingestion_runs.id", ondelete="SET NULL"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("person_id", "office_id", "start_date", name="uq_term_identity"),
    )
    op.create_index("ix_terms_person_id", "official_terms", ["person_id"])
    op.create_index("ix_terms_office_id", "official_terms", ["office_id"])
    op.create_index("ix_terms_party", "official_terms", ["party"])
    op.create_index("ix_terms_start_date", "official_terms", ["start_date"])
    op.create_index("ix_terms_end_date", "official_terms", ["end_date"])
    op.create_index("ix_terms_is_current", "official_terms", ["is_current"])
    op.create_index("ix_terms_last_ingestion_run_id", "official_terms", ["last_ingestion_run_id"])
    op.create_index("ix_terms_office_current", "official_terms", ["office_id", "is_current"])

    op.create_table(
        "data_sources",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(length=64), unique=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("url", sa.String(length=512)),
        sa.Column("description", sa.Text()),
        sa.Column("coverage_levels", sa.JSON()),
        sa.Column("coverage_states", sa.JSON()),
        sa.Column("auth_type", sa.String(length=64)),
        sa.Column("rate_limit", sa.String(length=128)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("data_sources")
    op.drop_index("ix_terms_office_current", table_name="official_terms")
    op.drop_index("ix_terms_last_ingestion_run_id", table_name="official_terms")
    op.drop_index("ix_terms_is_current", table_name="official_terms")
    op.drop_index("ix_terms_end_date", table_name="official_terms")
    op.drop_index("ix_terms_start_date", table_name="official_terms")
    op.drop_index("ix_terms_party", table_name="official_terms")
    op.drop_index("ix_terms_office_id", table_name="official_terms")
    op.drop_index("ix_terms_person_id", table_name="official_terms")
    op.drop_table("official_terms")
    op.drop_index("ix_ingestion_runs_status", table_name="ingestion_runs")
    op.drop_index("ix_ingestion_runs_source_key", table_name="ingestion_runs")
    op.drop_table("ingestion_runs")
    op.drop_index("ix_people_google_civic_id", table_name="people")
    op.drop_index("ix_people_fec_id", table_name="people")
    op.drop_index("ix_people_openstates_id", table_name="people")
    op.drop_index("ix_people_bioguide_id", table_name="people")
    op.drop_index("ix_people_last_name", table_name="people")
    op.drop_index("ix_people_full_name", table_name="people")
    op.drop_table("people")
    op.drop_index("ix_offices_branch", table_name="offices")
    op.drop_index("ix_offices_district_id", table_name="offices")
    op.drop_index("ix_offices_jurisdiction_id", table_name="offices")
    op.drop_table("offices")
    op.drop_index("ix_districts_ocd_id", table_name="districts")
    op.drop_index("ix_districts_identifier", table_name="districts")
    op.drop_index("ix_districts_jurisdiction_id", table_name="districts")
    op.drop_table("districts")
    op.drop_index("ix_jurisdictions_state_level", table_name="jurisdictions")
    op.drop_index("ix_jurisdictions_parent_id", table_name="jurisdictions")
    op.drop_index("ix_jurisdictions_state_code", table_name="jurisdictions")
    op.drop_index("ix_jurisdictions_level", table_name="jurisdictions")
    op.drop_index("ix_jurisdictions_ocd_id", table_name="jurisdictions")
    op.drop_table("jurisdictions")

    PARTY.drop(op.get_bind(), checkfirst=True)
    BRANCH.drop(op.get_bind(), checkfirst=True)
    GOV_LEVEL.drop(op.get_bind(), checkfirst=True)
