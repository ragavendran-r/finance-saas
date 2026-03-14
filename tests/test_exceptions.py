"""Pure unit tests for app/core/exceptions.py"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.exceptions import (
    DuplicateResourceException,
    NotAuthorizedException,
    ResourceNotFoundException,
    TenantNotFoundException,
    add_exception_handlers,
)


class TestExceptionClasses:
    def test_not_authorized_exception_is_exception(self):
        exc = NotAuthorizedException()
        assert isinstance(exc, Exception)

    def test_resource_not_found_exception_stores_resource(self):
        exc = ResourceNotFoundException("Account")
        assert exc.resource == "Account"

    def test_duplicate_resource_exception_stores_detail(self):
        exc = DuplicateResourceException("Slug already taken")
        assert exc.detail == "Slug already taken"

    def test_tenant_not_found_exception_is_exception(self):
        exc = TenantNotFoundException()
        assert isinstance(exc, Exception)

    def test_resource_not_found_with_different_resources(self):
        for resource in ("Account", "Transaction", "Budget", "Category"):
            exc = ResourceNotFoundException(resource)
            assert exc.resource == resource


class TestExceptionHandlers:
    """Test that registered handlers return correct HTTP responses."""

    @pytest.fixture
    def app_with_handlers(self):
        app = FastAPI()
        add_exception_handlers(app)

        @app.get("/raise-not-authorized")
        async def raise_not_authorized():
            raise NotAuthorizedException()

        @app.get("/raise-not-found")
        async def raise_not_found():
            raise ResourceNotFoundException("Widget")

        @app.get("/raise-duplicate")
        async def raise_duplicate():
            raise DuplicateResourceException("Email already registered")

        @app.get("/raise-tenant-not-found")
        async def raise_tenant_not_found():
            raise TenantNotFoundException()

        return app

    def test_not_authorized_returns_401(self, app_with_handlers):
        client = TestClient(app_with_handlers, raise_server_exceptions=False)
        resp = client.get("/raise-not-authorized")
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Unauthorized"

    def test_resource_not_found_returns_404(self, app_with_handlers):
        client = TestClient(app_with_handlers, raise_server_exceptions=False)
        resp = client.get("/raise-not-found")
        assert resp.status_code == 404
        assert "Widget" in resp.json()["detail"]
        assert "not found" in resp.json()["detail"]

    def test_duplicate_resource_returns_409(self, app_with_handlers):
        client = TestClient(app_with_handlers, raise_server_exceptions=False)
        resp = client.get("/raise-duplicate")
        assert resp.status_code == 409
        assert resp.json()["detail"] == "Email already registered"

    def test_tenant_not_found_returns_404(self, app_with_handlers):
        client = TestClient(app_with_handlers, raise_server_exceptions=False)
        resp = client.get("/raise-tenant-not-found")
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Tenant not found"
