"""seed system categories

Revision ID: bad4610d09f9
Revises: 58d724b8178d
Create Date: 2026-03-13

"""
from typing import Sequence, Union
import uuid
from alembic import op
import sqlalchemy as sa

revision: str = 'bad4610d09f9'
down_revision: Union[str, None] = '58d724b8178d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (name, icon, color, parent_name)
CATEGORIES = [
    ("Food & Dining", "🍽️", "#F97316", None),
    ("Groceries", "🛒", "#84CC16", "Food & Dining"),
    ("Restaurants", "🍜", "#EF4444", "Food & Dining"),
    ("Coffee", "☕", "#92400E", "Food & Dining"),

    ("Transport", "🚗", "#3B82F6", None),
    ("Fuel", "⛽", "#6B7280", "Transport"),
    ("Public Transit", "🚌", "#06B6D4", "Transport"),
    ("Taxi & Ride Share", "🚕", "#F59E0B", "Transport"),

    ("Shopping", "🛍️", "#EC4899", None),
    ("Clothing", "👕", "#A855F7", "Shopping"),
    ("Electronics", "📱", "#6366F1", "Shopping"),

    ("Housing", "🏠", "#10B981", None),
    ("Rent", "🏡", "#059669", "Housing"),
    ("Utilities", "💡", "#F59E0B", "Housing"),
    ("Internet", "🌐", "#0EA5E9", "Housing"),

    ("Health", "❤️", "#EF4444", None),
    ("Medical", "🏥", "#DC2626", "Health"),
    ("Pharmacy", "💊", "#9333EA", "Health"),
    ("Fitness", "🏋️", "#16A34A", "Health"),

    ("Entertainment", "🎬", "#8B5CF6", None),
    ("Streaming", "📺", "#7C3AED", "Entertainment"),
    ("Games", "🎮", "#4F46E5", "Entertainment"),

    ("Education", "📚", "#0284C7", None),
    ("Travel", "✈️", "#0891B2", None),
    ("Insurance", "🛡️", "#64748B", None),
    ("Savings", "💰", "#16A34A", None),
    ("Investment", "📈", "#15803D", None),
    ("Income", "💵", "#22C55E", None),
    ("Salary", "💼", "#4ADE80", "Income"),
    ("Freelance", "🖥️", "#86EFAC", "Income"),
    ("Other", "📌", "#94A3B8", None),
]


def upgrade() -> None:
    meta = sa.MetaData()
    categories = sa.Table(
        'categories', meta,
        sa.Column('id', sa.UUID),
        sa.Column('tenant_id', sa.UUID, nullable=True),
        sa.Column('name', sa.String),
        sa.Column('icon', sa.String, nullable=True),
        sa.Column('color', sa.String, nullable=True),
        sa.Column('parent_id', sa.UUID, nullable=True),
        sa.Column('is_system', sa.Boolean),
    )

    conn = op.get_bind()
    parent_ids: dict[str, uuid.UUID] = {}

    # First pass: top-level categories
    top_level = [r for r in CATEGORIES if r[3] is None]
    top_rows = []
    for name, icon, color, _ in top_level:
        cat_id = uuid.uuid4()
        parent_ids[name] = cat_id
        top_rows.append({
            'id': cat_id, 'tenant_id': None, 'name': name,
            'icon': icon, 'color': color, 'parent_id': None, 'is_system': True,
        })
    conn.execute(categories.insert(), top_rows)

    # Second pass: child categories
    child_rows = []
    for name, icon, color, parent_name in CATEGORIES:
        if parent_name is not None:
            child_rows.append({
                'id': uuid.uuid4(), 'tenant_id': None, 'name': name,
                'icon': icon, 'color': color,
                'parent_id': parent_ids.get(parent_name), 'is_system': True,
            })
    if child_rows:
        conn.execute(categories.insert(), child_rows)


def downgrade() -> None:
    op.execute("DELETE FROM categories WHERE is_system = TRUE")
