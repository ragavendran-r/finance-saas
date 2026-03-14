import pytest


@pytest.mark.asyncio
async def test_register(client):
    resp = await client.post("/api/v1/auth/register", json={
        "tenant_name": "Test Corp",
        "tenant_slug": "test-corp",
        "email": "admin@test.com",
        "password": "secret123",
        "full_name": "Test Admin",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "admin@test.com"
    assert data["role"] == "admin"


@pytest.mark.asyncio
async def test_login(client):
    await client.post("/api/v1/auth/register", json={
        "tenant_name": "Login Corp",
        "tenant_slug": "login-corp",
        "email": "user@login.com",
        "password": "pass1234",
        "full_name": "Login User",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "user@login.com",
        "password": "pass1234",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "nobody@example.com",
        "password": "wrong",
    })
    assert resp.status_code == 401
