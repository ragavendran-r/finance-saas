"""Integration tests for transactions endpoints."""
from uuid import uuid4

import pytest

from tests.helpers import auth_headers, register_and_login


async def create_account(client, token, name="Test Account", acct_type="checking"):
    resp = await client.post(
        "/api/v1/accounts",
        json={"name": name, "type": acct_type, "balance": "1000.00"},
        headers=auth_headers(token),
    )
    return resp.json()


async def create_transaction(client, token, account_id, **kwargs):
    payload = {
        "account_id": account_id,
        "amount": "50.00",
        "type": "debit",
        "description": "Test transaction",
        "date": "2025-01-15",
    }
    payload.update(kwargs)
    return await client.post("/api/v1/transactions", json=payload, headers=auth_headers(token))


@pytest.mark.asyncio
async def test_list_transactions_empty(client):
    token, _ = await register_and_login(client)
    resp = await client.get("/api/v1/transactions", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_create_debit_transaction(client):
    token, _ = await register_and_login(client)
    account = await create_account(client, token)
    account_id = account["id"]

    resp = await create_transaction(client, token, account_id, amount="100.00", type="debit")
    assert resp.status_code == 201
    data = resp.json()
    assert data["amount"] == "100.00"
    assert data["type"] == "debit"
    assert data["account_id"] == account_id


@pytest.mark.asyncio
async def test_create_credit_transaction(client):
    token, _ = await register_and_login(client)
    account = await create_account(client, token)

    resp = await create_transaction(client, token, account["id"], amount="200.00", type="credit")
    assert resp.status_code == 201
    assert resp.json()["type"] == "credit"


@pytest.mark.asyncio
async def test_debit_decreases_balance(client):
    token, _ = await register_and_login(client)
    account = await create_account(client, token, name="Balance Account")
    account_id = account["id"]

    await create_transaction(client, token, account_id, amount="300.00", type="debit")

    acct_resp = await client.get(f"/api/v1/accounts/{account_id}", headers=auth_headers(token))
    assert float(acct_resp.json()["balance"]) == 700.00


@pytest.mark.asyncio
async def test_credit_increases_balance(client):
    token, _ = await register_and_login(client)
    account = await create_account(client, token, name="Credit Account")
    account_id = account["id"]

    await create_transaction(client, token, account_id, amount="500.00", type="credit")

    acct_resp = await client.get(f"/api/v1/accounts/{account_id}", headers=auth_headers(token))
    assert float(acct_resp.json()["balance"]) == 1500.00


@pytest.mark.asyncio
async def test_create_transaction_account_not_found(client):
    token, _ = await register_and_login(client)
    resp = await create_transaction(client, token, str(uuid4()))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_transaction_account_wrong_tenant(client):
    token1, _ = await register_and_login(client)
    account = await create_account(client, token1)

    token2, _ = await register_and_login(client)
    resp = await create_transaction(client, token2, account["id"])
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_transactions_returns_created(client):
    token, _ = await register_and_login(client)
    account = await create_account(client, token)

    await create_transaction(client, token, account["id"], description="Grocery store")
    await create_transaction(client, token, account["id"], description="Coffee shop")

    resp = await client.get("/api/v1/transactions", headers=auth_headers(token))
    descs = [t["description"] for t in resp.json()]
    assert "Grocery store" in descs
    assert "Coffee shop" in descs


@pytest.mark.asyncio
async def test_get_transaction(client):
    token, _ = await register_and_login(client)
    account = await create_account(client, token)
    txn_resp = await create_transaction(client, token, account["id"])
    txn_id = txn_resp.json()["id"]

    resp = await client.get(f"/api/v1/transactions/{txn_id}", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["id"] == txn_id


@pytest.mark.asyncio
async def test_get_transaction_not_found(client):
    token, _ = await register_and_login(client)
    resp = await client.get(f"/api/v1/transactions/{uuid4()}", headers=auth_headers(token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_transaction_wrong_tenant(client):
    token1, _ = await register_and_login(client)
    account = await create_account(client, token1)
    txn_resp = await create_transaction(client, token1, account["id"])
    txn_id = txn_resp.json()["id"]

    token2, _ = await register_and_login(client)
    resp = await client.get(f"/api/v1/transactions/{txn_id}", headers=auth_headers(token2))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_transaction(client):
    token, _ = await register_and_login(client)
    account = await create_account(client, token)
    txn_resp = await create_transaction(client, token, account["id"], description="Original", merchant="OldMerchant")
    txn_id = txn_resp.json()["id"]

    resp = await client.patch(
        f"/api/v1/transactions/{txn_id}",
        json={"description": "Updated desc", "merchant": "NewMerchant"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["description"] == "Updated desc"
    assert data["merchant"] == "NewMerchant"


@pytest.mark.asyncio
async def test_update_transaction_not_found(client):
    token, _ = await register_and_login(client)
    resp = await client.patch(
        f"/api/v1/transactions/{uuid4()}",
        json={"description": "Updated"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_transaction(client):
    token, _ = await register_and_login(client)
    account = await create_account(client, token)
    txn_resp = await create_transaction(client, token, account["id"])
    txn_id = txn_resp.json()["id"]

    resp = await client.delete(f"/api/v1/transactions/{txn_id}", headers=auth_headers(token))
    assert resp.status_code == 204

    get_resp = await client.get(f"/api/v1/transactions/{txn_id}", headers=auth_headers(token))
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_transaction_not_found(client):
    token, _ = await register_and_login(client)
    resp = await client.delete(f"/api/v1/transactions/{uuid4()}", headers=auth_headers(token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_filter_by_account_id(client):
    token, _ = await register_and_login(client)
    account1 = await create_account(client, token, name="Account1")
    account2 = await create_account(client, token, name="Account2")

    await create_transaction(client, token, account1["id"], description="From Account1")
    await create_transaction(client, token, account2["id"], description="From Account2")

    resp = await client.get(
        f"/api/v1/transactions?account_id={account1['id']}",
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    txns = resp.json()
    assert all(t["account_id"] == account1["id"] for t in txns)
    descs = [t["description"] for t in txns]
    assert "From Account1" in descs
    assert "From Account2" not in descs


@pytest.mark.asyncio
async def test_filter_by_search(client):
    token, _ = await register_and_login(client)
    account = await create_account(client, token)

    await create_transaction(client, token, account["id"], description="Netflix subscription")
    await create_transaction(client, token, account["id"], description="Grocery store")

    resp = await client.get(
        "/api/v1/transactions?search=netflix",
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    txns = resp.json()
    assert len(txns) >= 1
    assert any("Netflix" in t["description"] or "netflix" in t["description"].lower() for t in txns)


@pytest.mark.asyncio
async def test_transactions_require_auth(client):
    resp = await client.get("/api/v1/transactions")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_pagination_limit_offset(client):
    token, _ = await register_and_login(client)
    account = await create_account(client, token)

    for i in range(5):
        await create_transaction(client, token, account["id"], description=f"Txn {i}")

    resp = await client.get("/api/v1/transactions?limit=2&offset=0", headers=auth_headers(token))
    assert resp.status_code == 200
    assert len(resp.json()) <= 2


@pytest.mark.asyncio
async def test_create_transaction_with_notes(client):
    token, _ = await register_and_login(client)
    account = await create_account(client, token)
    resp = await create_transaction(
        client, token, account["id"],
        notes="This is a recurring payment", is_recurring=True
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["notes"] == "This is a recurring payment"
    assert data["is_recurring"] is True


@pytest.mark.asyncio
async def test_decimal_precision(client):
    token, _ = await register_and_login(client)
    account = await create_account(client, token, name="Precision Test")
    resp = await create_transaction(
        client, token, account["id"],
        amount="99.99", type="debit"
    )
    assert resp.status_code == 201
    assert resp.json()["amount"] == "99.99"
