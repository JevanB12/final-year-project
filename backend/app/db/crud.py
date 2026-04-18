import json
from collections import Counter
from datetime import date, timedelta
from statistics import mean
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import DailyCheckin


POSITIVE_POINT_EXCLUDE = {
    "good",
    "great",
    "nice",
    "fine",
    "okay",
    "ok",
    "alright",
}

NEGATIVE_POINT_EXCLUDE = {
    "a lot",
    "bit",
    "a bit",
    "too much",
    "quite a lot",
}

POSITIVE_POINT_LABEL_MAP = {
    "productive": "productivity",
    "rested": "rest",
    "calm": "calmness",
    "motivated": "motivation",
    "energised": "energy",
    "energized": "energy",
}

NEGATIVE_POINT_LABEL_MAP = {
    "tired": "low energy",
    "drained": "low energy",
    "exhausted": "low energy",
    "overwhelmed": "overwhelm",
    "stressed": "stress",
    "anxious": "anxiety",
    "rough": "difficult day",
    "behind": "falling behind",
    "pressure": "pressure",
}


def create_checkin(
    db: Session,
    *,
    user_id: int,
    checkin_date: date,
    raw_message: str,
    tone: str,
    intensity: float,
    selected_thread: str | None,
    day_score: int,
    strain_detected: bool,
    strong_distress_detected: bool,
    themes: list[str],
    positive_points: list[str],
    negative_points: list[str],
    is_sample: bool = False,
    seed_batch_id: str | None = None,
) -> DailyCheckin:
    checkin = DailyCheckin(
        user_id=user_id,
        checkin_date=checkin_date,
        raw_message=raw_message,
        tone=tone,
        intensity=float(intensity),
        selected_thread=selected_thread,
        day_score=day_score,
        strain_detected=strain_detected,
        strong_distress_detected=strong_distress_detected,
        themes_json=json.dumps(themes),
        positive_points_json=json.dumps(positive_points),
        negative_points_json=json.dumps(negative_points),
        is_sample=is_sample,
        seed_batch_id=seed_batch_id,
    )

    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    return checkin


def get_recent_checkins(db: Session, *, user_id: int, limit: int = 30) -> list[DailyCheckin]:
    return (
        db.query(DailyCheckin)
        .filter(DailyCheckin.user_id == user_id)
        .order_by(DailyCheckin.checkin_date.desc(), DailyCheckin.created_at.desc())
        .limit(limit)
        .all()
    )


def get_checkins_since(db: Session, *, user_id: int, days: int) -> list[DailyCheckin]:
    start_date = date.today() - timedelta(days=days - 1)
    return (
        db.query(DailyCheckin)
        .filter(DailyCheckin.user_id == user_id)
        .filter(DailyCheckin.checkin_date >= start_date)
        .order_by(DailyCheckin.checkin_date.asc(), DailyCheckin.created_at.asc())
        .all()
    )


def _loads_list(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        data = json.loads(value)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def _clean_point_label(
    item: str,
    *,
    label_map: dict[str, str],
    exclude: set[str],
) -> str | None:
    cleaned = item.strip().lower()
    if not cleaned or cleaned in exclude:
        return None
    return label_map.get(cleaned, cleaned)


def _top_items(
    rows: list[DailyCheckin],
    attr_name: str,
    top_n: int = 5,
    *,
    label_map: dict[str, str] | None = None,
    exclude: set[str] | None = None,
) -> list[dict[str, Any]]:
    counter: Counter[str] = Counter()
    label_map = label_map or {}
    exclude = exclude or set()

    for row in rows:
        for item in _loads_list(getattr(row, attr_name, "[]")):
            if not isinstance(item, str):
                continue

            cleaned = item.strip()
            if not cleaned:
                continue

            if label_map or exclude:
                final_label = _clean_point_label(
                    cleaned,
                    label_map=label_map,
                    exclude=exclude,
                )
                if not final_label:
                    continue
                counter[final_label] += 1
            else:
                counter[cleaned] += 1

    return [{"label": label, "count": count} for label, count in counter.most_common(top_n)]


def _tone_counts(rows: list[DailyCheckin]) -> dict[str, int]:
    counts = {"positive": 0, "neutral": 0, "negative": 0}
    for row in rows:
        tone = row.tone if row.tone in counts else "neutral"
        counts[tone] += 1
    return counts


def _current_streak(rows: list[DailyCheckin]) -> int:
    unique_dates = sorted({row.checkin_date for row in rows}, reverse=True)

    if not unique_dates:
        return 0

    streak = 0
    expected = unique_dates[0]

    for day in unique_dates:
        if day == expected:
            streak += 1
            expected = expected - timedelta(days=1)
        else:
            break

    return streak


def build_summary(db: Session, *, user_id: int) -> dict[str, Any]:
    rows_7 = get_checkins_since(db, user_id=user_id, days=7)
    rows_30 = get_checkins_since(db, user_id=user_id, days=30)

    avg_7 = round(mean([row.day_score for row in rows_7]), 2) if rows_7 else None
    avg_30 = round(mean([row.day_score for row in rows_30]), 2) if rows_30 else None

    tone_counts_30 = _tone_counts(rows_30)
    most_common_tone = None
    if rows_30:
        most_common_tone = max(tone_counts_30, key=tone_counts_30.get)

    strain_count_30 = sum(1 for row in rows_30 if row.strain_detected)

    return {
        "average_score_7_days": avg_7,
        "average_score_30_days": avg_30,
        "tone_counts_30_days": tone_counts_30,
        "most_common_tone_30_days": most_common_tone,
        "top_themes": _top_items(rows_30, "themes_json", top_n=5),
        "top_positive_points": _top_items(
            rows_30,
            "positive_points_json",
            top_n=5,
            label_map=POSITIVE_POINT_LABEL_MAP,
            exclude=POSITIVE_POINT_EXCLUDE,
        ),
        "top_negative_points": _top_items(
            rows_30,
            "negative_points_json",
            top_n=5,
            label_map=NEGATIVE_POINT_LABEL_MAP,
            exclude=NEGATIVE_POINT_EXCLUDE,
        ),
        "strain_days_30_days": strain_count_30,
        "checkin_streak": _current_streak(rows_30),
        "total_checkins_30_days": len(rows_30),
    }


def build_timeline(db: Session, *, user_id: int, days: int = 30) -> list[dict[str, Any]]:
    rows = get_checkins_since(db, user_id=user_id, days=days)

    return [
        {
            "id": row.id,
            "date": row.checkin_date.isoformat(),
            "tone": row.tone,
            "day_score": row.day_score,
            "selected_thread": row.selected_thread,
            "intensity": row.intensity,
            "strain_detected": row.strain_detected,
        }
        for row in rows
    ]


def build_recent_checkins(db: Session, *, user_id: int, limit: int = 10) -> list[dict[str, Any]]:
    rows = get_recent_checkins(db, user_id=user_id, limit=limit)

    return [
        {
            "id": row.id,
            "date": row.checkin_date.isoformat(),
            "raw_message": row.raw_message,
            "tone": row.tone,
            "day_score": row.day_score,
            "selected_thread": row.selected_thread,
            "themes": _loads_list(row.themes_json),
            "positive_points": _loads_list(row.positive_points_json),
            "negative_points": _loads_list(row.negative_points_json),
        }
        for row in rows
    ]


def delete_sample_checkins(
    db: Session,
    *,
    user_id: int,
    seed_batch_id: str | None = None,
) -> int:
    """Remove synthetic check-ins for a user. If ``seed_batch_id`` is set, only that batch."""
    q = db.query(DailyCheckin).filter(
        DailyCheckin.user_id == user_id,
        DailyCheckin.is_sample.is_(True),
    )
    if seed_batch_id is not None:
        q = q.filter(DailyCheckin.seed_batch_id == seed_batch_id)
    deleted = q.delete(synchronize_session=False)
    db.commit()
    return deleted