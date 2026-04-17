"""Database connection helpers (stub — wire SQLite/SQLAlchemy when ready)."""

from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]


def get_db_path() -> Path:
    """Default SQLite file at backend/wellbeing.db."""
    return BACKEND_ROOT / "wellbeing.db"
