from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.db.crud import build_recent_checkins, build_summary, build_timeline
from app.db.database import SessionLocal
from app.db.models import User

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
def analytics_summary(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        return build_summary(db, user_id=current_user.id)
    finally:
        db.close()


@router.get("/timeline")
def analytics_timeline(days: int = 30, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        return {
            "days": days,
            "items": build_timeline(db, user_id=current_user.id, days=days),
        }
    finally:
        db.close()


@router.get("/recent")
def analytics_recent(limit: int = 10, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        return {
            "items": build_recent_checkins(db, user_id=current_user.id, limit=limit),
        }
    finally:
        db.close()


@router.get("/health")
def analytics_health():
    return {"status": "ok"}