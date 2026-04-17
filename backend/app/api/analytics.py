from typing import Dict

from fastapi import APIRouter

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/health")
def analytics_health() -> Dict[str, str]:
    return {"status": "stub"}
