"""seed march 2026 transactions for test user

Revision ID: e5f6a7b8c9d0
Revises: c3e1f2a4b5d6
Create Date: 2026-03-14

Adds March 2026 transactions to the test user so the Reports
"This Month" view shows data.
"""
from typing import Sequence, Union
import uuid
from datetime import date

from alembic import op
import sqlalchemy as sa

revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'c3e1f2a4b5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TENANT_ID = uuid.UUID('00000000-0000-0000-0000-000000000001')
ACC_CHK   = uuid.UUID('00000000-0000-0000-0000-000000000010')
ACC_SAV   = uuid.UUID('00000000-0000-0000-0000-000000000011')
ACC_CRD   = uuid.UUID('00000000-0000-0000-0000-000000000012')


def upgrade() -> None:
    conn = op.get_bind()

    # Skip if test tenant doesn't exist (safety guard)
    exists = conn.execute(
        sa.text("SELECT 1 FROM tenants WHERE id = :id"),
        {'id': str(TENANT_ID)},
    ).fetchone()
    if not exists:
        return

    # Skip if March 2026 transactions already seeded (idempotent)
    already = conn.execute(
        sa.text(
            "SELECT 1 FROM transactions "
            "WHERE tenant_id = :tid AND date >= '2026-03-01' AND date <= '2026-03-31' "
            "LIMIT 1"
        ),
        {'tid': str(TENANT_ID)},
    ).fetchone()
    if already:
        return

    def cat_id(name: str) -> uuid.UUID | None:
        row = conn.execute(
            sa.text("SELECT id FROM categories WHERE name = :n AND is_system = TRUE"),
            {'n': name},
        ).fetchone()
        return row[0] if row else None

    salary_cat     = cat_id('Salary')
    groceries_cat  = cat_id('Groceries')
    rent_cat       = cat_id('Rent')
    utilities_cat  = cat_id('Utilities')
    fuel_cat       = cat_id('Fuel')
    restaurant_cat = cat_id('Restaurants')
    streaming_cat  = cat_id('Streaming')
    coffee_cat     = cat_id('Coffee')
    internet_cat   = cat_id('Internet')
    investment_cat = cat_id('Investment')

    txns = []

    def txn(account_id, amount, ttype, description, cat, txn_date, merchant=None):
        txns.append({
            'id': str(uuid.uuid4()),
            'tenant_id': str(TENANT_ID),
            'account_id': str(account_id),
            'category_id': str(cat) if cat else None,
            'amount': amount,
            'type': ttype,
            'description': description,
            'merchant': merchant,
            'date': txn_date,
            'is_recurring': False,
            'notes': None,
        })

    # Salary
    txn(ACC_CHK, 120000, 'CREDIT', 'Salary - Test Corp',    salary_cat,     date(2026, 3,  1), 'Test Corp Payroll')
    # Rent
    txn(ACC_CHK,  25000, 'DEBIT',  'House Rent',            rent_cat,       date(2026, 3,  5), 'Landlord')
    # Groceries (twice)
    txn(ACC_CRD,   3100, 'DEBIT',  'Grocery Shopping',      groceries_cat,  date(2026, 3,  8), 'BigBasket')
    txn(ACC_CRD,   2750, 'DEBIT',  'Grocery Shopping',      groceries_cat,  date(2026, 3, 22), 'BigBasket')
    # Utilities
    txn(ACC_CHK,   1950, 'DEBIT',  'Electricity Bill',      utilities_cat,  date(2026, 3, 15), 'BESCOM')
    # Internet
    txn(ACC_CRD,    999, 'DEBIT',  'Internet Bill',         internet_cat,   date(2026, 3, 10), 'Airtel Broadband')
    # Fuel (twice)
    txn(ACC_CRD,   2600, 'DEBIT',  'Fuel',                  fuel_cat,       date(2026, 3, 12), 'HPCL Petrol Pump')
    txn(ACC_CRD,   2200, 'DEBIT',  'Fuel',                  fuel_cat,       date(2026, 3, 27), 'HPCL Petrol Pump')
    # Restaurants
    txn(ACC_CRD,   2100, 'DEBIT',  'Food Order',            restaurant_cat, date(2026, 3,  7), 'Zomato')
    txn(ACC_CRD,   1750, 'DEBIT',  'Food Order',            restaurant_cat, date(2026, 3, 20), 'Swiggy')
    # Coffee
    txn(ACC_CRD,    480, 'DEBIT',  'Coffee',                coffee_cat,     date(2026, 3, 16), 'Starbucks')
    # Streaming subscriptions
    txn(ACC_CRD,    649, 'DEBIT',  'Netflix Subscription',  streaming_cat,  date(2026, 3, 12), 'Netflix')
    txn(ACC_CRD,    119, 'DEBIT',  'Spotify Subscription',  streaming_cat,  date(2026, 3, 12), 'Spotify')
    txn(ACC_CRD,    299, 'DEBIT',  'Amazon Prime',          streaming_cat,  date(2026, 3, 12), 'Amazon Prime')
    # SIP
    txn(ACC_SAV,  10000, 'DEBIT',  'Mutual Fund SIP',       investment_cat, date(2026, 3,  7), 'Zerodha Coin')

    for t in txns:
        conn.execute(sa.text("""
            INSERT INTO transactions
                (id, tenant_id, account_id, category_id, amount, type, description,
                 merchant, date, is_recurring, notes, created_at, updated_at)
            VALUES
                (:id, :tenant_id, :account_id, :category_id, :amount, :type, :description,
                 :merchant, :date, :is_recurring, :notes, now(), now())
        """), t)


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text(
        "DELETE FROM transactions "
        "WHERE tenant_id = :tid AND date >= '2026-03-01' AND date <= '2026-03-31'"
    ), {'tid': str(TENANT_ID)})
