from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings

settings = get_settings()

# 5/minute in production; essentially unlimited in dev/test so tests are never throttled
_default_rate = "5/minute" if settings.ENVIRONMENT == "production" else "10000/minute"

limiter = Limiter(key_func=get_remote_address, default_limits=[_default_rate])

# Auth-endpoint limits — relaxed in dev/test so tests are never throttled
AUTH_LOGIN_LIMIT = "5/minute" if settings.ENVIRONMENT == "production" else "10000/minute"
AUTH_REGISTER_LIMIT = "5/minute" if settings.ENVIRONMENT == "production" else "10000/minute"
AUTH_REFRESH_LIMIT = "10/minute" if settings.ENVIRONMENT == "production" else "10000/minute"
