"""Pure unit tests for app/core/security.py"""
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from jose import jwt

from app.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

settings = get_settings()


class TestHashPassword:
    def test_hash_returns_string(self):
        result = hash_password("mypassword")
        assert isinstance(result, str)

    def test_hash_is_not_plaintext(self):
        result = hash_password("mypassword")
        assert result != "mypassword"

    def test_different_hashes_for_same_password(self):
        h1 = hash_password("same")
        h2 = hash_password("same")
        # bcrypt generates different salts
        assert h1 != h2

    def test_hash_is_bcrypt(self):
        result = hash_password("test")
        assert result.startswith("$2b$") or result.startswith("$2a$")


class TestVerifyPassword:
    def test_correct_password_returns_true(self):
        hashed = hash_password("secret")
        assert verify_password("secret", hashed) is True

    def test_wrong_password_returns_false(self):
        hashed = hash_password("secret")
        assert verify_password("wrong", hashed) is False

    def test_empty_password_wrong(self):
        hashed = hash_password("notempty")
        assert verify_password("", hashed) is False


class TestCreateAccessToken:
    def test_returns_string(self):
        token = create_access_token(uuid4(), uuid4(), "admin")
        assert isinstance(token, str)

    def test_token_contains_expected_claims(self):
        user_id = uuid4()
        tenant_id = uuid4()
        token = create_access_token(user_id, tenant_id, "member")
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["sub"] == str(user_id)
        assert payload["tenant_id"] == str(tenant_id)
        assert payload["role"] == "member"

    def test_token_has_expiration(self):
        token = create_access_token(uuid4(), uuid4(), "admin")
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert "exp" in payload

    def test_expiration_is_in_future(self):
        token = create_access_token(uuid4(), uuid4(), "admin")
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        now = datetime.now(timezone.utc).timestamp()
        assert payload["exp"] > now

    def test_different_roles_encoded(self):
        for role in ("admin", "member", "superadmin"):
            token = create_access_token(uuid4(), uuid4(), role)
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            assert payload["role"] == role


class TestCreateRefreshToken:
    def test_returns_string(self):
        token = create_refresh_token(uuid4())
        assert isinstance(token, str)

    def test_contains_sub_claim(self):
        user_id = uuid4()
        token = create_refresh_token(user_id)
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["sub"] == str(user_id)

    def test_has_expiration(self):
        token = create_refresh_token(uuid4())
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert "exp" in payload

    def test_no_role_or_tenant_in_refresh(self):
        token = create_refresh_token(uuid4())
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert "role" not in payload
        assert "tenant_id" not in payload

    def test_refresh_token_longer_lived_than_access(self):
        user_id = uuid4()
        access = create_access_token(user_id, uuid4(), "admin")
        refresh = create_refresh_token(user_id)
        access_payload = jwt.decode(access, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        refresh_payload = jwt.decode(refresh, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert refresh_payload["exp"] > access_payload["exp"]


class TestDecodeToken:
    def test_valid_token_returns_payload(self):
        user_id = uuid4()
        tenant_id = uuid4()
        token = create_access_token(user_id, tenant_id, "admin")
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)
        assert payload["tenant_id"] == str(tenant_id)

    def test_invalid_token_returns_empty_dict(self):
        result = decode_token("not.a.valid.token")
        assert result == {}

    def test_empty_string_returns_empty_dict(self):
        result = decode_token("")
        assert result == {}

    def test_tampered_token_returns_empty_dict(self):
        token = create_access_token(uuid4(), uuid4(), "admin")
        tampered = token[:-5] + "XXXXX"
        result = decode_token(tampered)
        assert result == {}

    def test_wrong_secret_returns_empty_dict(self):
        user_id = uuid4()
        tenant_id = uuid4()
        bad_token = jwt.encode(
            {"sub": str(user_id), "tenant_id": str(tenant_id), "role": "admin"},
            "wrong-secret",
            algorithm=settings.ALGORITHM,
        )
        result = decode_token(bad_token)
        assert result == {}

    def test_refresh_token_decoded(self):
        user_id = uuid4()
        token = create_refresh_token(user_id)
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)
