"""perf: add composite indexes on transactions for query performance

Revision ID: a1b2c3d4e5f6
Revises: f7a8b9c0d1e2
Create Date: 2026-03-15 00:00:00.000000
"""
from alembic import op

revision = "a1b2c3d4e5f6"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Composite index: tenant + date — used by every date-range report/advisory query
    op.create_index(
        "ix_transactions_tenant_date",
        "transactions",
        ["tenant_id", "date"],
    )
    # Composite index: tenant + account — used by transaction list filtered by account
    op.create_index(
        "ix_transactions_tenant_account",
        "transactions",
        ["tenant_id", "account_id"],
    )
    # Composite index: tenant + category — used by budget progress & spending-by-category
    op.create_index(
        "ix_transactions_tenant_category",
        "transactions",
        ["tenant_id", "category_id"],
    )
    # Composite index: tenant + type + date — used by income/expense aggregations
    op.create_index(
        "ix_transactions_tenant_type_date",
        "transactions",
        ["tenant_id", "type", "date"],
    )


def downgrade() -> None:
    op.drop_index("ix_transactions_tenant_type_date", table_name="transactions")
    op.drop_index("ix_transactions_tenant_category", table_name="transactions")
    op.drop_index("ix_transactions_tenant_account", table_name="transactions")
    op.drop_index("ix_transactions_tenant_date", table_name="transactions")
