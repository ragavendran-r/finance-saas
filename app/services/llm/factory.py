from app.config import get_settings

from .base import LLMProvider


def get_llm_provider() -> LLMProvider:
    settings = get_settings()
    provider = settings.LLM_PROVIDER.lower()

    if provider == "openai":
        from .openai_provider import OpenAIProvider
        return OpenAIProvider(api_key=settings.OPENAI_API_KEY, model=settings.LLM_MODEL_OPENAI)

    if provider == "gemini":
        from .gemini_provider import GeminiProvider
        return GeminiProvider(api_key=settings.GEMINI_API_KEY, model=settings.LLM_MODEL_GEMINI)

    # Default: anthropic
    from .anthropic_provider import AnthropicProvider
    return AnthropicProvider(api_key=settings.ANTHROPIC_API_KEY, model=settings.LLM_MODEL_ANTHROPIC)
