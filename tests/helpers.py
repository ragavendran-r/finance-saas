"""Shared test helper functions."""
from uuid import uuid4


async def register_and_login(client) -> tuple[str, dict]:
    """Register a user and return (token, reg_data)."""
    reg_data = {
        "tenant_name": "Test Corp",
        "tenant_slug": f"test-{uuid4().hex[:8]}",
        "email": f"user-{uuid4().hex[:8]}@test.com",
        "password": "password123",
        "full_name": "Test User",
    }
    await client.post("/api/v1/auth/register", json=reg_data)
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": reg_data["email"], "password": "password123"},
    )
    token = resp.json()["access_token"]
    return token, reg_data


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
