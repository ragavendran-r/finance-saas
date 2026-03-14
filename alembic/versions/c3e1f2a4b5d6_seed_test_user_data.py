"""seed test user data

Revision ID: c3e1f2a4b5d6
Revises: bad4610d09f9
Create Date: 2026-03-14

Seeds a test tenant, user, accounts, and transactions for development/testing.

  Email    : testuser@abc.com
  Password : pwd123
  Tenant   : Test Corp (slug: test-corp)
"""
from typing import Sequence, Union
import uuid
from datetime import date

from alembic import op
import sqlalchemy as sa

revision: str = 'c3e1f2a4b5d6'
down_revision: Union[str, None] = 'bad4610d09f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# ---------------------------------------------------------------------------
# Deterministic UUIDs so re-runs are idempotent
# ---------------------------------------------------------------------------
TENANT_ID  = uuid.UUID('00000000-0000-0000-0000-000000000001')
USER_ID    = uuid.UUID('00000000-0000-0000-0000-000000000002')
ACC_CHK    = uuid.UUID('00000000-0000-0000-0000-000000000010')  # Checking
ACC_SAV    = uuid.UUID('00000000-0000-0000-0000-000000000011')  # Savings
ACC_CRD    = uuid.UUID('00000000-0000-0000-0000-000000000012')  # Credit
ACC_INV    = uuid.UUID('00000000-0000-0000-0000-000000000013')  # Investment
ACC_CSH    = uuid.UUID('00000000-0000-0000-0000-000000000014')  # Cash

# bcrypt hash of "pwd123"
PWD_HASH = '$2b$12$kde75zRV2JJJZH/Xq3oIH.tYeUyVRn8a9SuyBoNnFgeg5PdVRzD8G'

# FY 2025-26 salary months (April 2025 – February 2026)
SALARY_MONTHS = [
    date(2025, 4, 1), date(2025, 5, 1), date(2025, 6, 2),
    date(2025, 7, 1), date(2025, 8, 1), date(2025, 9, 1),
    date(2025, 10, 1), date(2025, 11, 3), date(2025, 12, 1),
    date(2026, 1, 1), date(2026, 2, 3),
]


def upgrade() -> None:
    conn = op.get_bind()

    # ------------------------------------------------------------------
    # Guard: skip if test tenant already exists (idempotent)
    # ------------------------------------------------------------------
    exists = conn.execute(
        sa.text("SELECT 1 FROM tenants WHERE id = :id"),
        {'id': str(TENANT_ID)},
    ).fetchone()
    if exists:
        return

    # ------------------------------------------------------------------
    # Look up system category IDs by name
    # ------------------------------------------------------------------
    def cat_id(name: str) -> uuid.UUID | None:
        row = conn.execute(
            sa.text("SELECT id FROM categories WHERE name = :n AND is_system = TRUE"),
            {'n': name},
        ).fetchone()
        return row[0] if row else None

    salary_cat    = cat_id('Salary')
    groceries_cat = cat_id('Groceries')
    rent_cat      = cat_id('Rent')
    utilities_cat = cat_id('Utilities')
    fuel_cat      = cat_id('Fuel')
    restaurant_cat = cat_id('Restaurants')
    streaming_cat = cat_id('Streaming')
    medical_cat   = cat_id('Medical')
    investment_cat = cat_id('Investment')
    shopping_cat  = cat_id('Shopping')
    travel_cat    = cat_id('Travel')
    coffee_cat    = cat_id('Coffee')
    internet_cat  = cat_id('Internet')

    # ------------------------------------------------------------------
    # Tenant
    # ------------------------------------------------------------------
    conn.execute(sa.text("""
        INSERT INTO tenants (id, name, slug, is_active, created_at, updated_at)
        VALUES (:id, :name, :slug, TRUE, now(), now())
    """), {'id': str(TENANT_ID), 'name': 'Test Corp', 'slug': 'test-corp'})

    # ------------------------------------------------------------------
    # User
    # ------------------------------------------------------------------
    conn.execute(sa.text("""
        INSERT INTO users (id, tenant_id, email, hashed_password, full_name, role, is_active, created_at, updated_at)
        VALUES (:id, :tid, :email, :pwd, :name, :role, TRUE, now(), now())
    """), {
        'id': str(USER_ID), 'tid': str(TENANT_ID),
        'email': 'testuser@abc.com', 'pwd': PWD_HASH,
        'name': 'Test User', 'role': 'ADMIN',
    })

    # ------------------------------------------------------------------
    # Accounts
    # ------------------------------------------------------------------
    accounts = [
        (ACC_CHK, 'HDFC Salary Account', 'CHECKING',  'INR',  85000,  'HDFC Bank'),
        (ACC_SAV, 'HDFC Savings',         'SAVINGS',   'INR', 250000,  'HDFC Bank'),
        (ACC_CRD, 'HDFC Credit Card',     'CREDIT',    'INR', -45000,  'HDFC Bank'),
        (ACC_INV, 'Zerodha Portfolio',    'INVESTMENT', 'INR', 180000, 'Zerodha'),
        (ACC_CSH, 'Cash Wallet',          'CASH',      'INR',   5000,  None),
    ]
    for aid, name, atype, currency, balance, institution in accounts:
        conn.execute(sa.text("""
            INSERT INTO accounts (id, tenant_id, user_id, name, type, currency, balance,
                                  institution_name, is_active, created_at, updated_at)
            VALUES (:id, :tid, :uid, :name, :type, :cur, :bal, :inst, TRUE, now(), now())
        """), {
            'id': str(aid), 'tid': str(TENANT_ID), 'uid': str(USER_ID),
            'name': name, 'type': atype, 'cur': currency,
            'bal': balance, 'inst': institution,
        })

    # ------------------------------------------------------------------
    # Transactions
    # ------------------------------------------------------------------
    txns = []

    def txn(account_id, amount, ttype, description, cat_id, txn_date, merchant=None, notes=None):
        txns.append({
            'id': str(uuid.uuid4()),
            'tenant_id': str(TENANT_ID),
            'account_id': str(account_id),
            'category_id': str(cat_id) if cat_id else None,
            'amount': amount,
            'type': ttype,
            'description': description,
            'merchant': merchant,
            'date': txn_date,
            'is_recurring': False,
            'notes': notes,
        })

    # Monthly salary credits (11 months)
    for d in SALARY_MONTHS:
        txn(ACC_CHK, 120000, 'CREDIT', 'Salary - Test Corp', salary_cat, d, 'Test Corp Payroll')

    # Monthly rent (10 months Apr 2025 – Jan 2026)
    for month in range(4, 14):
        yr, mo = (2025, month) if month <= 12 else (2026, month - 12)
        txn(ACC_CHK, 25000, 'DEBIT', 'House Rent', rent_cat, date(yr, mo, 5), 'Landlord')

    # Groceries (~twice a month)
    grocery_dates = [
        date(2025, 4, 8), date(2025, 4, 22), date(2025, 5, 7), date(2025, 5, 20),
        date(2025, 6, 10), date(2025, 6, 24), date(2025, 7, 9), date(2025, 7, 23),
        date(2025, 8, 6), date(2025, 8, 21), date(2025, 9, 10), date(2025, 9, 25),
        date(2025, 10, 8), date(2025, 10, 22), date(2025, 11, 5), date(2025, 11, 19),
        date(2025, 12, 10), date(2025, 12, 26), date(2026, 1, 9), date(2026, 1, 23),
    ]
    grocery_amounts = [3200, 2800, 3400, 2600, 3100, 2900, 3300, 2700,
                       3500, 2500, 3200, 2800, 3400, 2600, 3100, 2900,
                       3800, 3200, 3000, 2700]
    for d, amt in zip(grocery_dates, grocery_amounts):
        txn(ACC_CRD, amt, 'DEBIT', 'Grocery Shopping', groceries_cat, d, 'BigBasket')

    # Utilities — monthly
    for month, amt in [(4, 1800), (5, 1650), (6, 2100), (7, 2400), (8, 2200),
                       (9, 1900), (10, 1700), (11, 1600), (12, 1750), (1, 1850)]:
        yr = 2025 if month >= 4 else 2026
        txn(ACC_CHK, amt, 'DEBIT', 'Electricity Bill', utilities_cat, date(yr, month, 15), 'BESCOM')

    # Internet — monthly ₹999
    for month in range(4, 14):
        yr, mo = (2025, month) if month <= 12 else (2026, month - 12)
        txn(ACC_CRD, 999, 'DEBIT', 'Internet Bill', internet_cat, date(yr, mo, 10), 'Airtel Broadband')

    # Fuel — twice a month
    fuel_data = [
        (date(2025, 4, 12), 2500), (date(2025, 4, 28), 2200),
        (date(2025, 5, 11), 2600), (date(2025, 5, 27), 2100),
        (date(2025, 6, 15), 2400), (date(2025, 6, 29), 2300),
        (date(2025, 7, 13), 2700), (date(2025, 7, 28), 2100),
        (date(2025, 8, 12), 2500), (date(2025, 8, 26), 2200),
        (date(2025, 9, 14), 2400), (date(2025, 9, 29), 2100),
        (date(2025, 10, 12), 2600), (date(2025, 10, 27), 2300),
        (date(2025, 11, 10), 2500), (date(2025, 11, 25), 2200),
        (date(2025, 12, 14), 2800), (date(2025, 12, 29), 2400),
        (date(2026, 1, 13), 2500), (date(2026, 1, 28), 2100),
    ]
    for d, amt in fuel_data:
        txn(ACC_CRD, amt, 'DEBIT', 'Fuel', fuel_cat, d, 'HPCL Petrol Pump')

    # Restaurants — a few times a month
    restaurant_data = [
        (date(2025, 4, 19), 1800, 'Swiggy'), (date(2025, 5, 3), 2200, 'Zomato'),
        (date(2025, 5, 17), 1500, 'Swiggy'), (date(2025, 6, 7), 3200, 'Restaurant'),
        (date(2025, 6, 22), 1900, 'Zomato'), (date(2025, 7, 5), 2100, 'Swiggy'),
        (date(2025, 7, 19), 2800, 'Restaurant'), (date(2025, 8, 9), 1700, 'Zomato'),
        (date(2025, 8, 23), 2300, 'Swiggy'), (date(2025, 9, 13), 2000, 'Restaurant'),
        (date(2025, 9, 27), 1600, 'Zomato'), (date(2025, 10, 11), 2500, 'Swiggy'),
        (date(2025, 10, 25), 3100, 'Restaurant'), (date(2025, 11, 8), 1800, 'Zomato'),
        (date(2025, 11, 22), 2200, 'Swiggy'), (date(2025, 12, 6), 4500, 'Restaurant'),
        (date(2025, 12, 20), 2800, 'Zomato'), (date(2026, 1, 11), 1900, 'Swiggy'),
        (date(2026, 1, 25), 2400, 'Restaurant'),
    ]
    for d, amt, merchant in restaurant_data:
        txn(ACC_CRD, amt, 'DEBIT', 'Food Order', restaurant_cat, d, merchant)

    # Coffee
    coffee_data = [
        (date(2025, 4, 10), 450), (date(2025, 5, 14), 520), (date(2025, 6, 18), 380),
        (date(2025, 7, 22), 490), (date(2025, 8, 15), 420), (date(2025, 9, 19), 510),
        (date(2025, 10, 16), 440), (date(2025, 11, 13), 480), (date(2025, 12, 11), 520),
        (date(2026, 1, 18), 460),
    ]
    for d, amt in coffee_data:
        txn(ACC_CRD, amt, 'DEBIT', 'Coffee', coffee_cat, d, 'Starbucks')

    # Streaming subscriptions
    streaming_services = [
        ('Netflix', 649), ('Spotify', 119), ('Amazon Prime', 299),
    ]
    for month in range(4, 14):
        yr, mo = (2025, month) if month <= 12 else (2026, month - 12)
        for service, price in streaming_services:
            txn(ACC_CRD, price, 'DEBIT', f'{service} Subscription', streaming_cat,
                date(yr, mo, 12), service)

    # Medical
    txn(ACC_CRD, 3500, 'DEBIT', 'Doctor Consultation', medical_cat, date(2025, 6, 30), 'Apollo Hospital')
    txn(ACC_CRD, 1800, 'DEBIT', 'Pharmacy', medical_cat, date(2025, 9, 15), 'MedPlus')
    txn(ACC_CRD, 4200, 'DEBIT', 'Health Checkup', medical_cat, date(2025, 12, 3), 'Manipal Hospital')
    txn(ACC_CRD, 2100, 'DEBIT', 'Pharmacy', medical_cat, date(2026, 1, 20), 'MedPlus')

    # Shopping
    txn(ACC_CRD, 8500,  'DEBIT', 'Clothing Purchase', shopping_cat, date(2025, 7, 14), 'Myntra')
    txn(ACC_CRD, 15000, 'DEBIT', 'Electronics',       shopping_cat, date(2025, 10, 15), 'Amazon')
    txn(ACC_CRD, 6200,  'DEBIT', 'Diwali Shopping',   shopping_cat, date(2025, 11, 1),  'Flipkart')
    txn(ACC_CRD, 4800,  'DEBIT', 'Clothing Purchase', shopping_cat, date(2026, 1, 15),  'Myntra')

    # Travel
    txn(ACC_CHK, 18000, 'DEBIT', 'Flight Booking', travel_cat, date(2025, 5, 25), 'IndiGo')
    txn(ACC_CHK, 22000, 'DEBIT', 'Holiday Booking', travel_cat, date(2025, 12, 15), 'MakeMyTrip')

    # SIP / Investment transfers
    for month in range(4, 14):
        yr, mo = (2025, month) if month <= 12 else (2026, month - 12)
        txn(ACC_SAV, 10000, 'DEBIT', 'Mutual Fund SIP', investment_cat, date(yr, mo, 7), 'Zerodha Coin')

    # Savings account interest credits (quarterly)
    txn(ACC_SAV, 2100, 'CREDIT', 'Savings Interest', salary_cat, date(2025, 6, 30), 'HDFC Bank')
    txn(ACC_SAV, 2250, 'CREDIT', 'Savings Interest', salary_cat, date(2025, 9, 30), 'HDFC Bank')
    txn(ACC_SAV, 2180, 'CREDIT', 'Savings Interest', salary_cat, date(2025, 12, 31), 'HDFC Bank')

    # Credit card payment from checking
    for month, amt in [(5, 40000), (6, 38000), (7, 42000), (8, 36000), (9, 41000),
                       (10, 38500), (11, 43000), (12, 45000), (1, 39000)]:
        yr = 2025 if month >= 5 else 2026
        txn(ACC_CHK, amt, 'DEBIT', 'Credit Card Payment', None, date(yr, month, 18), 'HDFC Bank')

    # Insert all transactions
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
    conn.execute(sa.text("DELETE FROM transactions WHERE tenant_id = :tid"), {'tid': str(TENANT_ID)})
    conn.execute(sa.text("DELETE FROM accounts    WHERE tenant_id = :tid"), {'tid': str(TENANT_ID)})
    conn.execute(sa.text("DELETE FROM users       WHERE tenant_id = :tid"), {'tid': str(TENANT_ID)})
    conn.execute(sa.text("DELETE FROM tenants     WHERE id        = :tid"), {'tid': str(TENANT_ID)})
