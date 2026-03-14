"""seed test user budgets

Revision ID: f7a8b9c0d1e2
Revises: e5f6a7b8c9d0
Create Date: 2026-03-14

Adds monthly budgets for the test user covering FY 2025-26.
"""
from typing import Sequence, Union
import uuid
from datetime import date

from alembic import op
import sqlalchemy as sa

revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TENANT_ID = uuid.UUID('00000000-0000-0000-0000-000000000001')
USER_ID   = uuid.UUID('00000000-0000-0000-0000-000000000002')

# FY 2025-26
START = date(2025, 4, 1)
END   = date(2026, 3, 31)


def upgrade() -> None:
    conn = op.get_bind()

    # Safety: skip if tenant doesn't exist
    exists = conn.execute(
        sa.text("SELECT 1 FROM tenants WHERE id = :id"),
        {'id': str(TENANT_ID)},
    ).fetchone()
    if not exists:
        return

    # Idempotent: skip if budgets already seeded
    already = conn.execute(
        sa.text("SELECT 1 FROM budgets WHERE tenant_id = :tid LIMIT 1"),
        {'tid': str(TENANT_ID)},
    ).fetchone()
    if already:
        return

    def cat_id(name: str) -> str | None:
        row = conn.execute(
            sa.text("SELECT id FROM categories WHERE name = :n AND is_system = TRUE"),
            {'n': name},
        ).fetchone()
        return str(row[0]) if row else None

    budgets = [
        # (category_name, monthly_amount)
        ('Groceries',       4000),
        ('Restaurants',     3000),
        ('Coffee',           600),
        ('Rent',           25000),
        ('Utilities',       2500),
        ('Internet',        1000),
        ('Fuel',            5000),
        ('Streaming',       1200),
        ('Shopping',        8000),
        ('Medical',         3000),
        ('Travel',         20000),
        ('Investment',     10000),
    ]

    for cat_name, amount in budgets:
        cid = cat_id(cat_name)
        if not cid:
            continue
        conn.execute(sa.text("""
            INSERT INTO budgets
                (id, tenant_id, user_id, category_id, amount, period, start_date, end_date,
                 created_at, updated_at)
            VALUES
                (:id, :tid, :uid, :cid, :amount, 'MONTHLY', :start, :end, now(), now())
        """), {
            'id':     str(uuid.uuid4()),
            'tid':    str(TENANT_ID),
            'uid':    str(USER_ID),
            'cid':    cid,
            'amount': amount,
            'start':  START,
            'end':    END,
        })


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text("DELETE FROM budgets WHERE tenant_id = :tid"),
        {'tid': str(TENANT_ID)},
    )
