"""Tests for the AI tax advisory endpoint and service."""
import json
from unittest.mock import AsyncMock, patch

import pytest

from tests.helpers import auth_headers, register_and_login

# ── Shared fixtures ──────────────────────────────────────────────────────────

VALID_LLM_RESPONSE = {
    "regime_recommendation": "new",
    "regime_reasoning": "With income of ₹12,00,000 the new regime offers a lower effective rate.",
    "estimated_tax": {
        "new_regime": 82_500,
        "old_regime_before_planning": 1_65_000,
        "old_regime_after_planning": 82_500,
    },
    "recommendations": [
        {
            "section": "80C",
            "title": "ELSS / PPF / NPS investments",
            "instruments": ["ELSS", "PPF", "NPS Tier-I"],
            "max_deduction": 1_50_000,
            "potential_tax_saving": 46_800,
            "priority": "high",
            "description": "Invest in ELSS or PPF to claim the full ₹1.5L deduction under section 80C.",
        }
    ],
    "total_potential_saving": 82_500,
    "summary": "You can significantly reduce your tax liability by switching to the new regime.",
    "disclaimer": "Consult a qualified CA before making tax decisions.",
}


def _mock_llm(response_dict: dict):
    """Return a patch context that makes get_llm_provider return a mock LLM."""
    mock_provider = AsyncMock()
    mock_provider.complete = AsyncMock(return_value=json.dumps(response_dict))

    return patch(
        "app.services.tax_advisory_service.get_llm_provider",
        return_value=mock_provider,
    )


# ── Endpoint tests ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_tax_recommendations_with_explicit_income(client):
    """Endpoint returns structured recommendations when income is provided."""
    token, _ = await register_and_login(client)

    with _mock_llm(VALID_LLM_RESPONSE):
        resp = await client.post(
            "/api/v1/tax-advisory/recommendations",
            json={"annual_income": 1200000, "age": 30, "regime_preference": "new"},
            headers=auth_headers(token),
        )

    assert resp.status_code == 200
    data = resp.json()
    assert float(data["annual_income_used"]) == 1_200_000
    assert data["result"]["regime_recommendation"] == "new"
    assert len(data["result"]["recommendations"]) == 1
    assert data["result"]["recommendations"][0]["section"] == "80C"
    assert data["result"]["total_potential_saving"] == 82_500


@pytest.mark.asyncio
async def test_tax_recommendations_auto_income_from_transactions(client):
    """When income is omitted the service derives it from CREDIT transactions."""
    token, _ = await register_and_login(client)

    # Create an account and credit transaction
    acct = (
        await client.post(
            "/api/v1/accounts",
            json={"name": "Salary Account", "type": "savings", "balance": "0"},
            headers=auth_headers(token),
        )
    ).json()

    await client.post(
        "/api/v1/transactions",
        json={
            "account_id": acct["id"],
            "amount": "500000.00",
            "type": "credit",
            "description": "Salary",
            "date": "2025-04-01",  # FY 2025-26
        },
        headers=auth_headers(token),
    )

    with _mock_llm(VALID_LLM_RESPONSE):
        resp = await client.post(
            "/api/v1/tax-advisory/recommendations",
            json={"regime_preference": "new"},
            headers=auth_headers(token),
        )

    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_tax_recommendations_regime_normalization(client):
    """Regime preference is case-normalised (OLD → old)."""
    token, _ = await register_and_login(client)

    with _mock_llm(VALID_LLM_RESPONSE):
        resp = await client.post(
            "/api/v1/tax-advisory/recommendations",
            json={"annual_income": 800000, "regime_preference": "OLD"},
            headers=auth_headers(token),
        )

    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_tax_recommendations_requires_auth(client):
    """Unauthenticated request is rejected."""
    resp = await client.post(
        "/api/v1/tax-advisory/recommendations",
        json={"annual_income": 1000000, "regime_preference": "new"},
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_tax_recommendations_llm_provider_in_response(client):
    """Response includes the active LLM provider name."""
    token, _ = await register_and_login(client)

    with _mock_llm(VALID_LLM_RESPONSE):
        resp = await client.post(
            "/api/v1/tax-advisory/recommendations",
            json={"annual_income": 1000000, "regime_preference": "new"},
            headers=auth_headers(token),
        )

    assert resp.status_code == 200
    assert "llm_provider" in resp.json()


# ── Service-level: graceful degradation ──────────────────────────────────────

@pytest.mark.asyncio
async def test_tax_recommendations_invalid_json_from_llm(client):
    """If the LLM returns non-JSON text the service falls back gracefully."""
    token, _ = await register_and_login(client)

    mock_provider = AsyncMock()
    mock_provider.complete = AsyncMock(return_value="Sorry, I cannot help with that.")

    with patch(
        "app.services.tax_advisory_service.get_llm_provider",
        return_value=mock_provider,
    ):
        resp = await client.post(
            "/api/v1/tax-advisory/recommendations",
            json={"annual_income": 1000000, "regime_preference": "new"},
            headers=auth_headers(token),
        )

    assert resp.status_code == 200
    data = resp.json()
    # Graceful fallback: summary contains the raw text
    assert "Sorry" in data["result"]["summary"]
    assert data["result"]["recommendations"] == []


@pytest.mark.asyncio
async def test_tax_recommendations_llm_json_in_markdown_fence(client):
    """LLM response wrapped in ```json fences is parsed correctly."""
    token, _ = await register_and_login(client)

    fenced = f"```json\n{json.dumps(VALID_LLM_RESPONSE)}\n```"
    mock_provider = AsyncMock()
    mock_provider.complete = AsyncMock(return_value=fenced)

    with patch(
        "app.services.tax_advisory_service.get_llm_provider",
        return_value=mock_provider,
    ):
        resp = await client.post(
            "/api/v1/tax-advisory/recommendations",
            json={"annual_income": 1000000, "regime_preference": "new"},
            headers=auth_headers(token),
        )

    assert resp.status_code == 200
    assert resp.json()["result"]["regime_recommendation"] == "new"


# ── LLM factory tests ─────────────────────────────────────────────────────────

def _make_mock_settings(**kwargs):
    from unittest.mock import MagicMock
    s = MagicMock()
    defaults = {
        "LLM_PROVIDER": "anthropic",
        "ANTHROPIC_API_KEY": "test-key",
        "LLM_MODEL_ANTHROPIC": "claude-sonnet-4-6",
        "OPENAI_API_KEY": "test-key",
        "LLM_MODEL_OPENAI": "gpt-4o",
        "GEMINI_API_KEY": "test-key",
        "LLM_MODEL_GEMINI": "gemini-1.5-pro",
    }
    defaults.update(kwargs)
    for k, v in defaults.items():
        setattr(s, k, v)
    return s


def test_factory_returns_anthropic_by_default():
    from app.services.llm.factory import get_llm_provider

    with patch("app.services.llm.factory.get_settings", return_value=_make_mock_settings(LLM_PROVIDER="anthropic")):
        provider = get_llm_provider()

    from app.services.llm.anthropic_provider import AnthropicProvider
    assert isinstance(provider, AnthropicProvider)


def test_factory_returns_openai_provider():
    from app.services.llm.factory import get_llm_provider

    with patch("app.services.llm.factory.get_settings", return_value=_make_mock_settings(LLM_PROVIDER="openai")):
        provider = get_llm_provider()

    from app.services.llm.openai_provider import OpenAIProvider
    assert isinstance(provider, OpenAIProvider)


def test_factory_returns_gemini_provider():
    from app.services.llm.factory import get_llm_provider

    with patch("app.services.llm.factory.get_settings", return_value=_make_mock_settings(LLM_PROVIDER="gemini")):
        with patch("app.services.llm.gemini_provider.genai"):
            provider = get_llm_provider()

    from app.services.llm.gemini_provider import GeminiProvider
    assert isinstance(provider, GeminiProvider)


def test_factory_falls_back_to_anthropic_for_unknown_provider():
    from app.services.llm.factory import get_llm_provider

    with patch("app.services.llm.factory.get_settings", return_value=_make_mock_settings(LLM_PROVIDER="unknown")):
        provider = get_llm_provider()

    from app.services.llm.anthropic_provider import AnthropicProvider
    assert isinstance(provider, AnthropicProvider)
