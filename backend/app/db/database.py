from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./wellbeing.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_sqlite_sample_columns() -> None:
    """Migrate older SQLite DBs: add sample-data columns if missing."""
    from sqlalchemy import inspect, text

    try:
        insp = inspect(engine)
        if "daily_checkins" not in insp.get_table_names():
            return
    except Exception:
        return

    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(daily_checkins)")).fetchall()
        col_names = {r[1] for r in rows}
        if "is_sample" not in col_names:
            conn.execute(
                text("ALTER TABLE daily_checkins ADD COLUMN is_sample INTEGER DEFAULT 0")
            )
        if "seed_batch_id" not in col_names:
            conn.execute(
                text("ALTER TABLE daily_checkins ADD COLUMN seed_batch_id VARCHAR(64)")
            )