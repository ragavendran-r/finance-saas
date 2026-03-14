"""Integration tests for reports endpoints."""

import pytest

from tests.helpers import auth_headers, register_and_login


async def setup_tenant_data(client, token):
    """Create an account, category, and some transactions for a tenant."""
    # Create account
    acct_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "Main Account", "type": "checking", "balance": "5000.00"},
        headers=auth_headers(token),
    )
    account = acct_resp.json()

    # Create category
    cat_resp = await client.post(
        "/api/v1/categories",
        json={"name": "Food"},
        headers=auth_headers(token),
    )
    category = cat_resp.json()

    return account, category


@pytest.mark.asyncio
async def test_spending_by_category_empty(client):
    token, _ = await register_and_login(client)
    resp = await client.get(
        "/api/v1/reports/spending-by-category?date_from=2025-01-01&date_to=2025-01-31",
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_spending_by_category_with_data(client):
    token, _ = await register_and_login(client)
    account, category = await setup_tenant_data(client, token)

    # Add debit transactions
    for amount in ("50.00", "75.00", "25.00"):
        await client.post(
            "/api/v1/transactions",
            json={
                "account_id": account["id"],
                "category_id": category["id"],
                "amount": amount,
                "type": "debit",
                "description": f"Purchase {amount}",
                "date": "2025-01-15",
            },
            headers=auth_headers(token),
        )

    resp = await client.get(
        "/api/v1/reports/spending-by-category?date_from=2025-01-01&date_to=2025-01-31",
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    food_entry = next((r for r in data if r["category"] and r["category"]["name"] == "Food"), None)
    assert food_entry is not None
    assert float(food_entry["total"]) == 150.0


@pytest.mark.asyncio
async def test_spending_by_category_date_filter(client):
    """Transactions outside the date range should not appear."""
    token, _ = await register_and_login(client)
    account, category = await setup_tenant_data(client, token)

    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": account["id"],
            "category_id": category["id"],
            "amount": "100.00",
            "type": "debit",
            "description": "Old purchase",
            "date": "2024-06-01",  # Outside range
        },
        headers=auth_headers(token),
    )

    resp = await client.get(
        "/api/v1/reports/spending-by-category?date_from=2025-01-01&date_to=2025-01-31",
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    # The old transaction should not appear
    food_entry = next((r for r in resp.json() if r["category"] and r["category"]["name"] == "Food"), None)
    assert food_entry is None


@pytest.mark.asyncio
async def test_spending_by_category_requires_auth(client):
    resp = await client.get(
        "/api/v1/reports/spending-by-category?date_from=2025-01-01&date_to=2025-01-31"
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_income_vs_expenses_empty(client):
    token, _ = await register_and_login(client)
    resp = await client.get(
        "/api/v1/reports/income-vs-expenses?date_from=2025-01-01&date_to=2025-01-31",
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert float(data["income"]) == 0.0
    assert float(data["expenses"]) == 0.0
    assert float(data["net"]) == 0.0


@pytest.mark.asyncio
async def test_income_vs_expenses_with_data(client):
    token, _ = await register_and_login(client)
    account, _ = await setup_tenant_data(client, token)

    # Income
    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": account["id"],
            "amount": "3000.00",
            "type": "credit",
            "description": "Salary",
            "date": "2025-01-01",
        },
        headers=auth_headers(token),
    )
    # Expenses
    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": account["id"],
            "amount": "1200.00",
            "type": "debit",
            "description": "Rent",
            "date": "2025-01-05",
        },
        headers=auth_headers(token),
    )

    resp = await client.get(
        "/api/v1/reports/income-vs-expenses?date_from=2025-01-01&date_to=2025-01-31",
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert float(data["income"]) == 3000.0
    assert float(data["expenses"]) == 1200.0
    assert float(data["net"]) == 1800.0


@pytest.mark.asyncio
async def test_income_vs_expenses_requires_auth(client):
    resp = await client.get(
        "/api/v1/reports/income-vs-expenses?date_from=2025-01-01&date_to=2025-01-31"
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_net_worth_empty(client):
    token, _ = await register_and_login(client)
    resp = await client.get("/api/v1/reports/net-worth", headers=auth_headers(token))
    assert resp.status_code == 200
    data = resp.json()
    assert "by_account_type" in data
    assert "total" in data
    assert float(data["total"]) == 0.0


@pytest.mark.asyncio
async def test_net_worth_with_accounts(client):
    token, _ = await register_and_login(client)

    await client.post(
        "/api/v1/accounts",
        json={"name": "Checking", "type": "checking", "balance": "2000.00"},
        headers=auth_headers(token),
    )
    await client.post(
        "/api/v1/accounts",
        json={"name": "Savings", "type": "savings", "balance": "5000.00"},
        headers=auth_headers(token),
    )

    resp = await client.get("/api/v1/reports/net-worth", headers=auth_headers(token))
    assert resp.status_code == 200
    data = resp.json()
    assert float(data["total"]) == 7000.0
    assert "checking" in data["by_account_type"]
    assert "savings" in data["by_account_type"]


@pytest.mark.asyncio
async def test_net_worth_excludes_inactive_accounts(client):
    token, _ = await register_and_login(client)

    _acct_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "Active", "type": "checking", "balance": "1000.00"},
        headers=auth_headers(token),
    )
    inactive_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "Inactive", "type": "savings", "balance": "9999.00"},
        headers=auth_headers(token),
    )
    inactive_id = inactive_resp.json()["id"]

    # Soft-delete the inactive account
    await client.delete(f"/api/v1/accounts/{inactive_id}", headers=auth_headers(token))

    resp = await client.get("/api/v1/reports/net-worth", headers=auth_headers(token))
    data = resp.json()
    # Only active account contributes
    assert float(data["total"]) == 1000.0


@pytest.mark.asyncio
async def test_net_worth_requires_auth(client):
    resp = await client.get("/api/v1/reports/net-worth")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_budget_vs_actual_empty(client):
    token, _ = await register_and_login(client)
    resp = await client.get(
        "/api/v1/reports/budget-vs-actual?date_from=2025-01-01&date_to=2025-01-31",
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_budget_vs_actual_with_data(client):
    token, _ = await register_and_login(client)
    account, category = await setup_tenant_data(client, token)

    # Create a budget
    await client.post(
        "/api/v1/budgets",
        json={
            "category_id": category["id"],
            "amount": "300.00",
            "period": "monthly",
            "start_date": "2025-01-01",
        },
        headers=auth_headers(token),
    )

    # Create a transaction
    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": account["id"],
            "category_id": category["id"],
            "amount": "100.00",
            "type": "debit",
            "description": "Spend",
            "date": "2025-01-10",
        },
        headers=auth_headers(token),
    )

    resp = await client.get(
        "/api/v1/reports/budget-vs-actual?date_from=2025-01-01&date_to=2025-01-31",
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    row = data[0]
    assert "budgeted" in row
    assert "spent" in row
    assert "remaining" in row
    assert "percent_used" in row


@pytest.mark.asyncio
async def test_budget_vs_actual_requires_auth(client):
    resp = await client.get(
        "/api/v1/reports/budget-vs-actual?date_from=2025-01-01&date_to=2025-01-31"
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_reports_isolated_per_tenant(client):
    """Reports should only include data for the authenticated tenant."""
    token1, _ = await register_and_login(client)
    token2, _ = await register_and_login(client)

    account1, _ = await setup_tenant_data(client, token1)

    # Tenant1 creates a credit transaction
    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": account1["id"],
            "amount": "9999.00",
            "type": "credit",
            "description": "Tenant1 income",
            "date": "2025-01-15",
        },
        headers=auth_headers(token1),
    )

    # Tenant2's report should show 0
    resp2 = await client.get(
        "/api/v1/reports/income-vs-expenses?date_from=2025-01-01&date_to=2025-01-31",
        headers=auth_headers(token2),
    )
    data = resp2.json()
    assert float(data["income"]) == 0.0
