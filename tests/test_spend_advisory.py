"""Tests for the AI spend advisory endpoint and service."""
import json
from datetime import date
from unittest.mock import AsyncMock, patch

import pytest

from tests.helpers import auth_headers, register_and_login

VALID_LLM_RESPONSE = {
    "monthly_summary": {
        "avg_income": 120000,
        "avg_expenses": 55000,
        "avg_savings": 65000,
        "savings_rate_pct": 54.2,
    },
    "annual_projection": {
        "projected_income": 1440000,
        "projected_expenses": 660000,
        "projected_savings": 780000,
    },
    "over_budget_categories": [
        {"category": "Groceries", "budgeted": 4000, "spent": 5850, "overspend": 1850}
    ],
    "budget_advice": [
        {
            "category": "Groceries",
            "current_budget": 4000,
            "avg_monthly_spend": 5850,
            "suggested_budget": 6000,
            "verdict": "increase",
            "reason": "Actual grocery spending consistently exceeds the current budget.",
        },
        {
            "category": "Travel",
            "current_budget": 20000,
            "avg_monthly_spend": 0,
            "suggested_budget": 5000,
            "verdict": "decrease",
            "reason": "No travel spending recorded; budget can be reduced or reallocated.",
        },
    ],
    "recommendations": [
        {
            "title": "Reduce dining out",
            "category": "Restaurants",
            "type": "reduce",
            "priority": "high",
            "monthly_impact": 1500,
            "description": "Restaurant spending is above average. Cooking at home 2 extra days a week could save ₹1,500/month.",
        }
    ],
    "summary": "Your savings rate of 54% is excellent. Focus on aligning grocery and dining budgets with reality.",
    "disclaimer": "AI-generated guidance — consult a financial advisor for personalised advice.",
}


def _mock_llm(response_dict: dict):
    mock_provider = AsyncMock()
    mock_provider.complete = AsyncMock(return_value=json.dumps(response_dict))
    return patch(
        "app.services.spend_advisory_service.get_llm_provider",
        return_value=mock_provider,
    )


async def _setup_transactions(client, token):
    """Create an account + basic income and expense transactions."""
    acct = (
        await client.post(
            "/api/v1/accounts",
            json={"name": "Salary Account", "type": "checking", "balance": "0"},
            headers=auth_headers(token),
        )
    ).json()

    today = date.today().isoformat()

    await client.post(
        "/api/v1/transactions",
        json={"account_id": acct["id"], "amount": "120000", "type": "credit",
              "description": "Salary", "date": today},
        headers=auth_headers(token),
    )
    await client.post(
        "/api/v1/transactions",
        json={"account_id": acct["id"], "amount": "5000", "type": "debit",
              "description": "Groceries", "date": today},
        headers=auth_headers(token),
    )
    return acct


@pytest.mark.asyncio
async def test_spend_recommendations_basic(client):
    """Endpoint returns structured recommendations with LLM mocked."""
    token, _ = await register_and_login(client)
    await _setup_transactions(client, token)

    today = date.today()
    date_from = today.replace(day=1).isoformat()
    date_to = today.isoformat()

    with _mock_llm(VALID_LLM_RESPONSE):
        resp = await client.post(
            "/api/v1/spend-advisory/recommendations",
            json={"date_from": date_from, "date_to": date_to},
            headers=auth_headers(token),
        )

    assert resp.status_code == 200
    data = resp.json()
    assert "result" in data
    assert "llm_provider" in data
    assert data["date_from"] == date_from
    assert data["date_to"] == date_to


@pytest.mark.asyncio
async def test_spend_recommendations_result_structure(client):
    """Result contains all expected top-level fields."""
    token, _ = await register_and_login(client)
    await _setup_transactions(client, token)

    with _mock_llm(VALID_LLM_RESPONSE):
        resp = await client.post(
            "/api/v1/spend-advisory/recommendations",
            json={},
            headers=auth_headers(token),
        )

    assert resp.status_code == 200
    result = resp.json()["result"]
    assert "monthly_summary" in result
    assert "annual_projection" in result
    assert "budget_advice" in result
    assert "recommendations" in result
    assert "summary" in result


@pytest.mark.asyncio
async def test_spend_recommendations_monthly_summary_values(client):
    """Monthly summary values are passed through from LLM response."""
    token, _ = await register_and_login(client)
    await _setup_transactions(client, token)

    with _mock_llm(VALID_LLM_RESPONSE):
        resp = await client.post(
            "/api/v1/spend-advisory/recommendations",
            json={},
            headers=auth_headers(token),
        )

    ms = resp.json()["result"]["monthly_summary"]
    assert float(ms["avg_income"]) == 120000
    assert float(ms["avg_expenses"]) == 55000
    assert float(ms["savings_rate_pct"]) == 54.2


@pytest.mark.asyncio
async def test_spend_recommendations_budget_advice(client):
    """Budget advice entries are returned correctly."""
    token, _ = await register_and_login(client)
    await _setup_transactions(client, token)

    with _mock_llm(VALID_LLM_RESPONSE):
        resp = await client.post(
            "/api/v1/spend-advisory/recommendations",
            json={},
            headers=auth_headers(token),
        )

    advice = resp.json()["result"]["budget_advice"]
    assert len(advice) == 2
    verdicts = {a["verdict"] for a in advice}
    assert "increase" in verdicts
    assert "decrease" in verdicts


@pytest.mark.asyncio
async def test_spend_recommendations_over_budget_categories(client):
    """Over-budget categories are included in the response."""
    token, _ = await register_and_login(client)
    await _setup_transactions(client, token)

    with _mock_llm(VALID_LLM_RESPONSE):
        resp = await client.post(
            "/api/v1/spend-advisory/recommendations",
            json={},
            headers=auth_headers(token),
        )

    over = resp.json()["result"]["over_budget_categories"]
    assert len(over) == 1
    assert over[0]["category"] == "Groceries"
    assert over[0]["overspend"] == 1850


@pytest.mark.asyncio
async def test_spend_recommendations_requires_auth(client):
    """Unauthenticated requests are rejected."""
    resp = await client.post("/api/v1/spend-advisory/recommendations", json={})
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_spend_recommendations_default_date_range(client):
    """When no dates provided, defaults to last 90 days."""
    token, _ = await register_and_login(client)

    with _mock_llm(VALID_LLM_RESPONSE):
        resp = await client.post(
            "/api/v1/spend-advisory/recommendations",
            json={},
            headers=auth_headers(token),
        )

    assert resp.status_code == 200
    data = resp.json()
    from datetime import timedelta
    today = date.today()
    expected_from = (today - timedelta(days=90)).isoformat()
    assert data["date_to"] == today.isoformat()
    assert data["date_from"] == expected_from


@pytest.mark.asyncio
async def test_spend_recommendations_invalid_json_from_llm(client):
    """Non-JSON LLM output triggers graceful fallback."""
    token, _ = await register_and_login(client)

    mock_provider = AsyncMock()
    mock_provider.complete = AsyncMock(return_value="Sorry, unable to process.")

    with patch("app.services.spend_advisory_service.get_llm_provider", return_value=mock_provider):
        resp = await client.post(
            "/api/v1/spend-advisory/recommendations",
            json={},
            headers=auth_headers(token),
        )

    assert resp.status_code == 200
    result = resp.json()["result"]
    assert "Sorry" in result["summary"]
    assert result["recommendations"] == []
    assert result["over_budget_categories"] == []


@pytest.mark.asyncio
async def test_spend_recommendations_json_in_markdown_fence(client):
    """LLM response wrapped in ```json fences is parsed correctly."""
    token, _ = await register_and_login(client)

    fenced = f"```json\n{json.dumps(VALID_LLM_RESPONSE)}\n```"
    mock_provider = AsyncMock()
    mock_provider.complete = AsyncMock(return_value=fenced)

    with patch("app.services.spend_advisory_service.get_llm_provider", return_value=mock_provider):
        resp = await client.post(
            "/api/v1/spend-advisory/recommendations",
            json={},
            headers=auth_headers(token),
        )

    assert resp.status_code == 200
    assert resp.json()["result"]["summary"] == VALID_LLM_RESPONSE["summary"]


@pytest.mark.asyncio
async def test_spend_recommendations_with_no_transactions(client):
    """Works correctly when tenant has no transactions yet."""
    token, _ = await register_and_login(client)

    with _mock_llm(VALID_LLM_RESPONSE):
        resp = await client.post(
            "/api/v1/spend-advisory/recommendations",
            json={},
            headers=auth_headers(token),
        )

    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_spend_recommendations_tenant_isolation(client):
    """Two tenants get independent recommendations (data doesn't leak)."""
    token1, _ = await register_and_login(client)
    token2, _ = await register_and_login(client)

    # Give tenant1 an income transaction
    acct = (
        await client.post(
            "/api/v1/accounts",
            json={"name": "Acc", "type": "checking", "balance": "0"},
            headers=auth_headers(token1),
        )
    ).json()
    await client.post(
        "/api/v1/transactions",
        json={"account_id": acct["id"], "amount": "200000", "type": "credit",
              "description": "Income", "date": date.today().isoformat()},
        headers=auth_headers(token1),
    )

    captured_prompts = []

    async def capture_complete(system, user):
        captured_prompts.append(user)
        return json.dumps(VALID_LLM_RESPONSE)

    mock_provider = AsyncMock()
    mock_provider.complete = AsyncMock(side_effect=capture_complete)

    with patch("app.services.spend_advisory_service.get_llm_provider", return_value=mock_provider):
        # Tenant2 request — should see zero income
        resp2 = await client.post(
            "/api/v1/spend-advisory/recommendations",
            json={},
            headers=auth_headers(token2),
        )

    assert resp2.status_code == 200
    # Tenant2's prompt should NOT contain tenant1's ₹2,00,000 income
    assert "2,00,000" not in captured_prompts[-1]
