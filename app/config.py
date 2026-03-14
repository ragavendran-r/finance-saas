import warnings
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/finance_saas"
    SECRET_KEY: str = "change-me"  # Override via env; validator blocks insecure value in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENVIRONMENT: str = "development"

    # Comma-separated origins allowed for CORS, e.g. "http://localhost:5173,https://app.example.com"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173"]

    # LLM provider — set to "anthropic", "openai", or "gemini"
    LLM_PROVIDER: str = "anthropic"

    # Anthropic (Claude)
    ANTHROPIC_API_KEY: str = ""
    LLM_MODEL_ANTHROPIC: str = "claude-sonnet-4-6"

    # OpenAI
    OPENAI_API_KEY: str = ""
    LLM_MODEL_OPENAI: str = "gpt-4o"

    # Google Gemini
    GEMINI_API_KEY: str = ""
    LLM_MODEL_GEMINI: str = "gemini-2.5-flash"

    @model_validator(mode="after")
    def _validate_secret_key(self) -> "Settings":
        if self.SECRET_KEY in ("change-me", "secret", ""):
            if self.ENVIRONMENT == "production":
                raise ValueError("SECRET_KEY must be set to a strong random value in production")
            warnings.warn(
                "SECRET_KEY is set to an insecure default. Set a strong random value before deploying.",
                stacklevel=2,
            )
        return self

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
