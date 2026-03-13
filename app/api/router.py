from fastapi import APIRouter

from app.api.v1 import auth, accounts, transactions, categories, budgets, reports, users, tax_advisory

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(budgets.router, prefix="/budgets", tags=["budgets"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(tax_advisory.router, prefix="/tax-advisory", tags=["tax-advisory"])
