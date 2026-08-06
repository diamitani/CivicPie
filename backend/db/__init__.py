"""Database layer: SQLAlchemy ORM models, session, and engine for CivicPie.

The schema is the canonical store for every elected official in the United States,
from federal down to special-district level. Pydantic models in `backend/models`
remain the API/serialization layer; ORM models here are the persistence layer.
"""

from backend.db.session import Base, SessionLocal, engine, get_db
from backend.db.models import (
    Jurisdiction,
    District,
    Office,
    Person,
    OfficialTerm,
    DataSource,
    IngestionRun,
)

__all__ = [
    "Base",
    "SessionLocal",
    "engine",
    "get_db",
    "Jurisdiction",
    "District",
    "Office",
    "Person",
    "OfficialTerm",
    "DataSource",
    "IngestionRun",
]
