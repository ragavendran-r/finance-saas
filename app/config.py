from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/finance_saas"
    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENVIRONMENT: str = "development"

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

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
