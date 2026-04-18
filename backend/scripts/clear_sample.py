"""
Remove synthetic check-ins created by ``seed_sample``.

Usage (from ``backend/``):

  python -m scripts.clear_sample --email you@example.com
  python -m scripts.clear_sample --email you@example.com --batch-id demo
"""

from __future__ import annotations

import argparse
import sys

from sqlalchemy import func

from app.db.crud import delete_sample_checkins
from app.db.database import SessionLocal, ensure_sqlite_sample_columns
from app.db.models import User


def main() -> None:
    parser = argparse.ArgumentParser(description="Delete sample check-ins.")
    parser.add_argument("--email", required=True, help="User whose sample rows to remove.")
    parser.add_argument(
        "--batch-id",
        default=None,
        help="If set, only delete rows with this seed_batch_id; otherwise delete all sample rows for the user.",
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

        n = delete_sample_checkins(db, user_id=user.id, seed_batch_id=args.batch_id)
        scope = f"batch {args.batch_id!r}" if args.batch_id else "all sample batches"
        print(f"Deleted {n} sample row(s) for user id={user.id} ({scope}).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
