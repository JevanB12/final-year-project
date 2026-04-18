"""
Insert synthetic daily check-ins for analytics demos. Uses the same NLP pipeline as POST /chat.

Usage (from ``backend/`` directory, venv active):

  python -m scripts.seed_sample --email you@example.com
  python -m scripts.seed_sample --email you@example.com --days 40 --batch-id demo-feb
"""

from __future__ import annotations

import argparse
import sys
from datetime import date, timedelta

from sqlalchemy import func

from app.chat.analysis import analyze_first_message
from app.db.crud import create_checkin
from app.db.database import SessionLocal, ensure_sqlite_sample_columns
from app.db.models import User

# Varied opening lines — analysis + DB fields are derived automatically.
SAMPLE_MESSAGES: list[str] = [
    "Pretty good day overall, got some work done and felt calm in the evening.",
    "Exhausted today, couldn't sleep properly and my mind wouldn't switch off about uni work.",
    "Mixed day — nice lunch with a friend but deadlines are stressing me out.",
    "I've been skipping meals again and I know that's not helping my energy.",
    "Went to the gym for the first time in weeks, felt a bit better after.",
    "Sleep has been all over the place, random bedtimes and I'm tired all afternoon.",
    "Really overwhelmed with assignments, feels like I'm falling behind everyone.",
    "Today was okay, nothing special, just plodding through.",
    "Feeling isolated lately, haven't spoken to many people this week.",
    "Struggled to focus in the library, kept getting distracted by my phone.",
    "Actually rested well last night for once, woke up less groggy.",
    "Too much on at once — work, family stuff, no time to breathe.",
    "Meals have been irregular because my schedule is chaotic.",
    "Anxious about an exam coming up, hard to relax even when I'm home.",
    "Bit more positive today — got outside for a walk and cleared my head.",
    "Burnt out from staying up late every night this week.",
    "Routine has gone out the window since the timetable changed.",
    "Stressed but also proud I handed something in on time.",
    "Low energy all day, maybe I need to fix my sleep pattern.",
    "Rough morning but the afternoon picked up after I talked to someone.",
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed sample check-ins for analytics.")
    parser.add_argument("--email", required=True, help="User account to attach rows to (must exist).")
    parser.add_argument("--days", type=int, default=35, help="How many distinct past days (default 35).")
    parser.add_argument(
        "--batch-id",
        default="demo",
        help="Tag rows so you can delete this batch only (default: demo).",
    )
    args = parser.parse_args()

    ensure_sqlite_sample_columns()

    db = SessionLocal()
    try:
        email_norm = args.email.strip().lower()
        user = db.query(User).filter(func.lower(User.email) == email_norm).first()
        if user is None:
            print(f"No user found with email: {args.email!r}", file=sys.stderr)
            sys.exit(1)

        created = 0
        for i in range(args.days):
            checkin_date = date.today() - timedelta(days=i)
            raw = SAMPLE_MESSAGES[i % len(SAMPLE_MESSAGES)]
            a = analyze_first_message(raw)
            create_checkin(
                db,
                user_id=user.id,
                checkin_date=checkin_date,
                raw_message=raw,
                tone=a.tone,
                intensity=a.intensity,
                selected_thread=a.selected_thread,
                day_score=a.day_score,
                strain_detected=a.strain,
                strong_distress_detected=a.strong_distress,
                themes=a.themes,
                positive_points=a.positive_points,
                negative_points=a.negative_points,
                is_sample=True,
                seed_batch_id=args.batch_id,
            )
            created += 1

        print(f"Created {created} sample check-ins for user id={user.id} ({user.email!r}), batch={args.batch_id!r}.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
