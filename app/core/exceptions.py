from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class NotAuthorizedException(Exception):
    pass


class ResourceNotFoundException(Exception):
    def __init__(self, resource: str):
        self.resource = resource


class DuplicateResourceException(Exception):
    def __init__(self, detail: str):
        self.detail = detail


class TenantNotFoundException(Exception):
    pass


def add_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotAuthorizedException)
    async def not_authorized_handler(request: Request, exc: NotAuthorizedException):
        return JSONResponse(status_code=403, content={"detail": "Forbidden"})

    @app.exception_handler(ResourceNotFoundException)
    async def not_found_handler(request: Request, exc: ResourceNotFoundException):
        return JSONResponse(status_code=404, content={"detail": f"{exc.resource} not found"})

    @app.exception_handler(DuplicateResourceException)
    async def duplicate_handler(request: Request, exc: DuplicateResourceException):
        return JSONResponse(status_code=409, content={"detail": exc.detail})

    @app.exception_handler(TenantNotFoundException)
    async def tenant_not_found_handler(request: Request, exc: TenantNotFoundException):
        return JSONResponse(status_code=404, content={"detail": "Tenant not found"})
