from datetime import datetime, date

from sqlalchemy import Boolean, Date, DateTime, Float, Integer, String, Text

from app.db.database import Base
from sqlalchemy.orm import Mapped, mapped_column


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class DailyCheckin(Base):
    __tablename__ = "daily_checkins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)

    checkin_date: Mapped[date] = mapped_column(Date, index=True)
    raw_message: Mapped[str] = mapped_column(Text)

    tone: Mapped[str] = mapped_column(String(50), index=True)
    intensity: Mapped[float] = mapped_column(Float)

    selected_thread: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    day_score: Mapped[int] = mapped_column(Integer, index=True)

    strain_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    strong_distress_detected: Mapped[bool] = mapped_column(Boolean, default=False)

    themes_json: Mapped[str] = mapped_column(Text, default="[]")
    positive_points_json: Mapped[str] = mapped_column(Text, default="[]")
    negative_points_json: Mapped[str] = mapped_column(Text, default="[]")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)