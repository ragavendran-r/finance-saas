"""Integration tests for categories endpoints."""
import uuid
from uuid import uuid4

import pytest

from tests.helpers import auth_headers, register_and_login


@pytest.mark.asyncio
async def test_list_categories_empty(client):
    token, _ = await register_and_login(client)
    resp = await client.get("/api/v1/categories", headers=auth_headers(token))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_create_category(client):
    token, _ = await register_and_login(client)
    resp = await client.post(
        "/api/v1/categories",
        json={"name": "Food & Dining"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Food & Dining"
    assert data["is_system"] is False
    assert "id" in data


@pytest.mark.asyncio
async def test_create_category_with_icon_and_color(client):
    token, _ = await register_and_login(client)
    resp = await client.post(
        "/api/v1/categories",
        json={"name": "Transport", "icon": "car", "color": "#FF5733"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["icon"] == "car"
    assert data["color"] == "#FF5733"


@pytest.mark.asyncio
async def test_list_categories_includes_created(client):
    token, _ = await register_and_login(client)
    await client.post(
        "/api/v1/categories",
        json={"name": "My Category"},
        headers=auth_headers(token),
    )
    resp = await client.get("/api/v1/categories", headers=auth_headers(token))
    names = [c["name"] for c in resp.json()]
    assert "My Category" in names


@pytest.mark.asyncio
async def test_update_category(client):
    token, _ = await register_and_login(client)
    create_resp = await client.post(
        "/api/v1/categories",
        json={"name": "Old Name"},
        headers=auth_headers(token),
    )
    cat_id = create_resp.json()["id"]

    resp = await client.patch(
        f"/api/v1/categories/{cat_id}",
        json={"name": "New Name", "color": "#000000"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "New Name"
    assert data["color"] == "#000000"


@pytest.mark.asyncio
async def test_update_category_not_found(client):
    token, _ = await register_and_login(client)
    resp = await client.patch(
        f"/api/v1/categories/{uuid4()}",
        json={"name": "Updated"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_category_wrong_tenant(client):
    """Category from another tenant should return 404."""
    token1, _ = await register_and_login(client)
    create_resp = await client.post(
        "/api/v1/categories",
        json={"name": "Tenant1 Cat"},
        headers=auth_headers(token1),
    )
    cat_id = create_resp.json()["id"]

    token2, _ = await register_and_login(client)
    resp = await client.patch(
        f"/api/v1/categories/{cat_id}",
        json={"name": "Stolen"},
        headers=auth_headers(token2),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_category(client):
    token, _ = await register_and_login(client)
    create_resp = await client.post(
        "/api/v1/categories",
        json={"name": "To Delete"},
        headers=auth_headers(token),
    )
    cat_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/v1/categories/{cat_id}", headers=auth_headers(token))
    assert resp.status_code == 204

    # Should no longer appear in list
    list_resp = await client.get("/api/v1/categories", headers=auth_headers(token))
    ids = [c["id"] for c in list_resp.json()]
    assert cat_id not in ids


@pytest.mark.asyncio
async def test_delete_category_not_found(client):
    token, _ = await register_and_login(client)
    resp = await client.delete(f"/api/v1/categories/{uuid4()}", headers=auth_headers(token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_category_wrong_tenant(client):
    token1, _ = await register_and_login(client)
    create_resp = await client.post(
        "/api/v1/categories",
        json={"name": "Tenant1 Cat"},
        headers=auth_headers(token1),
    )
    cat_id = create_resp.json()["id"]

    token2, _ = await register_and_login(client)
    resp = await client.delete(f"/api/v1/categories/{cat_id}", headers=auth_headers(token2))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_categories_require_auth(client):
    resp = await client.get("/api/v1/categories")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_categories_isolated_per_tenant(client):
    """Users in different tenants should not see each other's categories."""
    token1, _ = await register_and_login(client)
    token2, _ = await register_and_login(client)

    await client.post(
        "/api/v1/categories",
        json={"name": "Tenant1 Only"},
        headers=auth_headers(token1),
    )

    resp2 = await client.get("/api/v1/categories", headers=auth_headers(token2))
    names = [c["name"] for c in resp2.json()]
    assert "Tenant1 Only" not in names


@pytest.mark.asyncio
async def test_create_category_with_parent(client):
    token, _ = await register_and_login(client)
    parent_resp = await client.post(
        "/api/v1/categories",
        json={"name": "Parent"},
        headers=auth_headers(token),
    )
    parent_id = parent_resp.json()["id"]

    child_resp = await client.post(
        "/api/v1/categories",
        json={"name": "Child", "parent_id": parent_id},
        headers=auth_headers(token),
    )
    assert child_resp.status_code == 201
    assert child_resp.json()["parent_id"] == parent_id
