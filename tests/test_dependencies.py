"""Pure unit tests for app/core/dependencies.py"""
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core.dependencies import get_current_user, get_current_user_payload, require_role
from app.core.security import create_access_token


class TestGetCurrentUserPayload:
    @pytest.mark.asyncio
    async def test_valid_token_returns_payload(self):
        user_id = uuid4()
        tenant_id = uuid4()
        token = create_access_token(user_id, tenant_id, "admin")
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        payload = await get_current_user_payload(credentials)
        assert payload["sub"] == str(user_id)
        assert payload["role"] == "admin"

    @pytest.mark.asyncio
    async def test_invalid_token_raises_401(self):
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid.token.here")
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_payload(credentials)
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_token_without_sub_raises_401(self):
        import jwt
        from app.config import get_settings
        settings = get_settings()
        # Token without "sub" claim
        bad_token = jwt.encode({"role": "admin"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=bad_token)
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_payload(credentials)
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_empty_token_raises_401(self):
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="")
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_payload(credentials)
        assert exc_info.value.status_code == 401


class TestGetCurrentUser:
    @pytest.mark.asyncio
    async def test_active_user_returned(self):
        user_id = uuid4()
        tenant_id = uuid4()
        payload = {"sub": str(user_id), "tenant_id": str(tenant_id), "role": "admin"}

        mock_user = MagicMock()
        mock_user.id = user_id
        mock_user.is_active = True

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await get_current_user(payload=payload, db=mock_db)
        assert result == mock_user

    @pytest.mark.asyncio
    async def test_user_not_found_raises_401(self):
        user_id = uuid4()
        payload = {"sub": str(user_id), "role": "admin"}

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(return_value=mock_result)

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(payload=payload, db=mock_db)
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_inactive_user_raises_401(self):
        """Inactive users are filtered out by the DB query (is_active=True filter)."""
        user_id = uuid4()
        payload = {"sub": str(user_id), "role": "admin"}

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None  # filtered out

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(return_value=mock_result)

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(payload=payload, db=mock_db)
        assert exc_info.value.status_code == 401


class TestRequireRole:
    @pytest.mark.asyncio
    async def test_matching_role_returns_payload(self):
        user_id = uuid4()
        tenant_id = uuid4()
        token = create_access_token(user_id, tenant_id, "admin")

        from fastapi.security import HTTPAuthorizationCredentials
        _credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        checker = require_role("admin", "superadmin")
        # checker is a coroutine that takes payload as a dependency
        # We call it directly with the payload
        payload = {"sub": str(user_id), "role": "admin"}
        result = await checker(payload=payload)
        assert result["role"] == "admin"

    @pytest.mark.asyncio
    async def test_wrong_role_raises_403(self):
        user_id = uuid4()
        payload = {"sub": str(user_id), "role": "member"}

        checker = require_role("admin", "superadmin")
        with pytest.raises(HTTPException) as exc_info:
            await checker(payload=payload)
        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_superadmin_role_allowed(self):
        payload = {"sub": str(uuid4()), "role": "superadmin"}
        checker = require_role("admin", "superadmin")
        result = await checker(payload=payload)
        assert result["role"] == "superadmin"

    @pytest.mark.asyncio
    async def test_missing_role_in_payload_raises_403(self):
        payload = {"sub": str(uuid4())}
        checker = require_role("admin")
        with pytest.raises(HTTPException) as exc_info:
            await checker(payload=payload)
        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_member_allowed_when_listed(self):
        payload = {"sub": str(uuid4()), "role": "member"}
        checker = require_role("admin", "member")
        result = await checker(payload=payload)
        assert result["role"] == "member"
