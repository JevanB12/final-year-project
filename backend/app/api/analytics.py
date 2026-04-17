from fastapi import APIRouter

from app.db.crud import build_recent_checkins, build_summary, build_timeline
from app.db.database import SessionLocal

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
def analytics_summary():
    db = SessionLocal()
    try:
        return build_summary(db, user_id=1)
    finally:
        db.close()


@router.get("/timeline")
def analytics_timeline(days: int = 30):
    db = SessionLocal()
    try:
        return {
            "days": days,
            "items": build_timeline(db, user_id=1, days=days),
        }
    finally:
        db.close()


@router.get("/recent")
def analytics_recent(limit: int = 10):
    db = SessionLocal()
    try:
        return {
            "items": build_recent_checkins(db, user_id=1, limit=limit),
        }
    finally:
        db.close()


@router.get("/health")
def analytics_health():
    return {"status": "ok"}