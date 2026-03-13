"""Integration tests for accounts endpoints."""
from uuid import uuid4

import pytest

from tests.helpers import auth_headers, register_and_login


@pytest.mark.asyncio
async def test_list_accounts_empty(client):
    token, _ = await register_and_login(client)
    resp = await client.get("/api/v1/accounts", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_create_account(client):
    token, _ = await register_and_login(client)
    resp = await client.post(
        "/api/v1/accounts",
        json={"name": "My Checking", "type": "checking"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My Checking"
    assert data["type"] == "checking"
    assert data["currency"] == "USD"
    assert data["balance"] == "0.00"
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.asyncio
async def test_create_account_with_balance(client):
    token, _ = await register_and_login(client)
    resp = await client.post(
        "/api/v1/accounts",
        json={"name": "Savings", "type": "savings", "balance": "1500.50"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 201
    assert resp.json()["balance"] == "1500.50"


@pytest.mark.asyncio
async def test_create_account_with_institution(client):
    token, _ = await register_and_login(client)
    resp = await client.post(
        "/api/v1/accounts",
        json={"name": "Chase Checking", "type": "checking", "institution_name": "Chase Bank"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 201
    assert resp.json()["institution_name"] == "Chase Bank"


@pytest.mark.asyncio
async def test_list_accounts_returns_created(client):
    token, _ = await register_and_login(client)
    await client.post(
        "/api/v1/accounts",
        json={"name": "Account A", "type": "checking"},
        headers=auth_headers(token),
    )
    await client.post(
        "/api/v1/accounts",
        json={"name": "Account B", "type": "savings"},
        headers=auth_headers(token),
    )
    resp = await client.get("/api/v1/accounts", headers=auth_headers(token))
    assert resp.status_code == 200
    names = [a["name"] for a in resp.json()]
    assert "Account A" in names
    assert "Account B" in names


@pytest.mark.asyncio
async def test_get_account(client):
    token, _ = await register_and_login(client)
    create_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "My Account", "type": "cash"},
        headers=auth_headers(token),
    )
    account_id = create_resp.json()["id"]
    resp = await client.get(f"/api/v1/accounts/{account_id}", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["id"] == account_id


@pytest.mark.asyncio
async def test_get_account_not_found(client):
    token, _ = await register_and_login(client)
    resp = await client.get(f"/api/v1/accounts/{uuid4()}", headers=auth_headers(token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_account_wrong_tenant(client):
    """Account from another tenant should return 404."""
    token1, _ = await register_and_login(client)
    create_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "Tenant1 Account", "type": "checking"},
        headers=auth_headers(token1),
    )
    account_id = create_resp.json()["id"]

    token2, _ = await register_and_login(client)
    resp = await client.get(f"/api/v1/accounts/{account_id}", headers=auth_headers(token2))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_account(client):
    token, _ = await register_and_login(client)
    create_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "Old Name", "type": "checking"},
        headers=auth_headers(token),
    )
    account_id = create_resp.json()["id"]

    resp = await client.patch(
        f"/api/v1/accounts/{account_id}",
        json={"name": "New Name", "institution_name": "Bank XYZ"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "New Name"
    assert data["institution_name"] == "Bank XYZ"


@pytest.mark.asyncio
async def test_update_account_not_found(client):
    token, _ = await register_and_login(client)
    resp = await client.patch(
        f"/api/v1/accounts/{uuid4()}",
        json={"name": "Updated"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_account(client):
    token, _ = await register_and_login(client)
    create_resp = await client.post(
        "/api/v1/accounts",
        json={"name": "To Delete", "type": "cash"},
        headers=auth_headers(token),
    )
    account_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/v1/accounts/{account_id}", headers=auth_headers(token))
    assert resp.status_code == 204

    # Deleted account should not appear in list (is_active=False)
    list_resp = await client.get("/api/v1/accounts", headers=auth_headers(token))
    ids = [a["id"] for a in list_resp.json()]
    assert account_id not in ids


@pytest.mark.asyncio
async def test_delete_account_not_found(client):
    token, _ = await register_and_login(client)
    resp = await client.delete(f"/api/v1/accounts/{uuid4()}", headers=auth_headers(token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_accounts_require_auth(client):
    resp = await client.get("/api/v1/accounts")
    assert resp.status_code in (401, 403)  # No Bearer token


@pytest.mark.asyncio
async def test_accounts_invalid_token(client):
    resp = await client.get(
        "/api/v1/accounts",
        headers={"Authorization": "Bearer invalidtoken"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_accounts_isolated_per_user(client):
    """Two users in different tenants see only their own accounts."""
    token1, _ = await register_and_login(client)
    token2, _ = await register_and_login(client)

    await client.post(
        "/api/v1/accounts",
        json={"name": "User1 Account", "type": "checking"},
        headers=auth_headers(token1),
    )

    resp2 = await client.get("/api/v1/accounts", headers=auth_headers(token2))
    names = [a["name"] for a in resp2.json()]
    assert "User1 Account" not in names


@pytest.mark.asyncio
async def test_all_account_types(client):
    token, _ = await register_and_login(client)
    for acct_type in ("checking", "savings", "credit", "investment", "cash"):
        resp = await client.post(
            "/api/v1/accounts",
            json={"name": f"{acct_type} account", "type": acct_type},
            headers=auth_headers(token),
        )
        assert resp.status_code == 201
        assert resp.json()["type"] == acct_type
