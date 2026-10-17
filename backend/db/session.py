"""SQLAlchemy engine + session factory.

DATABASE_URL is read from the environment. For local dev without Postgres,
falls back to a file-backed SQLite DB so the ingestion pipeline can be
exercised end-to-end on a fresh checkout.
"""

import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


def _build_engine() -> Engine:
    url = os.environ.get("DATABASE_URL", "sqlite:///./civicpie.db")
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, future=True, pool_pre_ping=True, connect_args=connect_args)


engine: Engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a request-scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
