"""Integration tests for budgets endpoints."""
from datetime import date
from uuid import uuid4

import pytest

from tests.helpers import auth_headers, register_and_login


async def create_category(client, token, name="Test Category"):
    resp = await client.post(
        "/api/v1/categories",
        json={"name": name},
        headers=auth_headers(token),
    )
    return resp.json()


async def create_account(client, token, name="Test Account", balance="1000.00"):
    resp = await client.post(
        "/api/v1/accounts",
        json={"name": name, "type": "checking", "balance": balance},
        headers=auth_headers(token),
    )
    return resp.json()


async def create_budget(client, token, category_id, **kwargs):
    payload = {
        "category_id": category_id,
        "amount": "500.00",
        "period": "monthly",
        "start_date": "2025-01-01",
    }
    payload.update(kwargs)
    return await client.post("/api/v1/budgets", json=payload, headers=auth_headers(token))


@pytest.mark.asyncio
async def test_list_budgets_empty(client):
    token, _ = await register_and_login(client)
    resp = await client.get("/api/v1/budgets", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_create_budget(client):
    token, _ = await register_and_login(client)
    cat = await create_category(client, token)
    resp = await create_budget(client, token, cat["id"])
    assert resp.status_code == 201
    data = resp.json()
    assert data["category_id"] == cat["id"]
    assert data["amount"] == "500.00"
    assert data["period"] == "monthly"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_budget_with_end_date(client):
    token, _ = await register_and_login(client)
    cat = await create_category(client, token)
    resp = await create_budget(
        client, token, cat["id"],
        amount="1000.00", period="yearly",
        start_date="2025-01-01", end_date="2025-12-31"
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["end_date"] == "2025-12-31"
    assert data["period"] == "yearly"


@pytest.mark.asyncio
async def test_list_budgets_returns_created(client):
    token, _ = await register_and_login(client)
    cat1 = await create_category(client, token, name="Food")
    cat2 = await create_category(client, token, name="Transport")

    await create_budget(client, token, cat1["id"], amount="300.00")
    await create_budget(client, token, cat2["id"], amount="150.00")

    resp = await client.get("/api/v1/budgets", headers=auth_headers(token))
    assert resp.status_code == 200
    amounts = [b["amount"] for b in resp.json()]
    assert "300.00" in amounts
    assert "150.00" in amounts


@pytest.mark.asyncio
async def test_get_budget(client):
    token, _ = await register_and_login(client)
    cat = await create_category(client, token)
    budget_resp = await create_budget(client, token, cat["id"])
    budget_id = budget_resp.json()["id"]

    resp = await client.get(f"/api/v1/budgets/{budget_id}", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["id"] == budget_id


@pytest.mark.asyncio
async def test_get_budget_not_found(client):
    token, _ = await register_and_login(client)
    resp = await client.get(f"/api/v1/budgets/{uuid4()}", headers=auth_headers(token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_budget_wrong_tenant(client):
    token1, _ = await register_and_login(client)
    cat = await create_category(client, token1)
    budget_resp = await create_budget(client, token1, cat["id"])
    budget_id = budget_resp.json()["id"]

    token2, _ = await register_and_login(client)
    resp = await client.get(f"/api/v1/budgets/{budget_id}", headers=auth_headers(token2))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_budget(client):
    token, _ = await register_and_login(client)
    cat = await create_category(client, token)
    budget_resp = await create_budget(client, token, cat["id"], amount="200.00")
    budget_id = budget_resp.json()["id"]

    resp = await client.patch(
        f"/api/v1/budgets/{budget_id}",
        json={"amount": "350.00", "end_date": "2025-06-30"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["amount"] == "350.00"
    assert data["end_date"] == "2025-06-30"


@pytest.mark.asyncio
async def test_update_budget_not_found(client):
    token, _ = await register_and_login(client)
    resp = await client.patch(
        f"/api/v1/budgets/{uuid4()}",
        json={"amount": "100.00"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_budget(client):
    token, _ = await register_and_login(client)
    cat = await create_category(client, token)
    budget_resp = await create_budget(client, token, cat["id"])
    budget_id = budget_resp.json()["id"]

    resp = await client.delete(f"/api/v1/budgets/{budget_id}", headers=auth_headers(token))
    assert resp.status_code == 204

    get_resp = await client.get(f"/api/v1/budgets/{budget_id}", headers=auth_headers(token))
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_budget_not_found(client):
    token, _ = await register_and_login(client)
    resp = await client.delete(f"/api/v1/budgets/{uuid4()}", headers=auth_headers(token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_budgets_require_auth(client):
    resp = await client.get("/api/v1/budgets")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_budget_progress_no_spending(client):
    token, _ = await register_and_login(client)
    cat = await create_category(client, token)
    budget_resp = await create_budget(
        client, token, cat["id"],
        amount="500.00", start_date="2025-01-01"
    )
    budget_id = budget_resp.json()["id"]

    resp = await client.get(f"/api/v1/budgets/{budget_id}/progress", headers=auth_headers(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["budgeted"] == "500.00"
    assert float(data["spent"]) == 0.0
    assert float(data["remaining"]) == 500.0
    assert data["percent_used"] == 0.0


@pytest.mark.asyncio
async def test_budget_progress_with_spending(client):
    token, _ = await register_and_login(client)
    cat = await create_category(client, token, name="Budget Cat")
    account = await create_account(client, token)

    today = date.today()
    month_start = today.replace(day=1).isoformat()

    budget_resp = await create_budget(
        client, token, cat["id"],
        amount="500.00", start_date=month_start
    )
    budget_id = budget_resp.json()["id"]

    # Create a DEBIT transaction within the current month
    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": account["id"],
            "category_id": cat["id"],
            "amount": "200.00",
            "type": "debit",
            "description": "Budget spending",
            "date": today.isoformat(),
        },
        headers=auth_headers(token),
    )

    resp = await client.get(f"/api/v1/budgets/{budget_id}/progress", headers=auth_headers(token))
    assert resp.status_code == 200
    data = resp.json()
    assert float(data["spent"]) == 200.0
    assert float(data["remaining"]) == 300.0
    assert data["percent_used"] == 40.0


@pytest.mark.asyncio
async def test_budget_progress_not_found(client):
    token, _ = await register_and_login(client)
    resp = await client.get(f"/api/v1/budgets/{uuid4()}/progress", headers=auth_headers(token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_budget_isolated_per_tenant(client):
    token1, _ = await register_and_login(client)
    token2, _ = await register_and_login(client)

    cat1 = await create_category(client, token1, name="Cat1")
    await create_budget(client, token1, cat1["id"], amount="999.00")

    resp2 = await client.get("/api/v1/budgets", headers=auth_headers(token2))
    amounts = [b["amount"] for b in resp2.json()]
    assert "999.00" not in amounts


@pytest.mark.asyncio
async def test_all_budget_periods(client):
    token, _ = await register_and_login(client)
    for period in ("weekly", "monthly", "yearly"):
        cat = await create_category(client, token, name=f"Cat-{period}-{uuid4().hex[:4]}")
        resp = await create_budget(client, token, cat["id"], period=period)
        assert resp.status_code == 201
        assert resp.json()["period"] == period
