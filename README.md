# Finance SaaS

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

Multi-tenant personal finance management platform

> **Architecture diagrams** — system overview, auth flow, ERD, AI advisory flow, and multi-tenancy model: [docs/architecture.md](docs/architecture.md) built with FastAPI, SQLAlchemy, PostgreSQL, and React.

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy (async), Alembic, PostgreSQL, JWT auth
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts
- **AI**: Google Gemini, OpenAI, Anthropic Claude (pluggable LLM provider)

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL

## Backend Setup

### 1. Create and activate virtual environment

```bash
python3.11 -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -e ".[dev]"
```

### 3. Configure environment

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql+asyncpg://postgres:<your_db_password>@localhost:5432/finance_saas
SECRET_KEY=<generate_a_random_secret>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
ENVIRONMENT=development

# LLM provider for AI Tax & Spend Advisory (choose one: gemini | openai | anthropic)
LLM_PROVIDER=gemini
GEMINI_API_KEY=<your_gemini_api_key>
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### 4. Start PostgreSQL

**Option A — Homebrew:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Option B — Docker:**
```bash
docker run -d \
  --name finance-postgres \
  -e POSTGRES_PASSWORD=<your_db_password> \
  -e POSTGRES_DB=finance_saas \
  -p 5432:5432 \
  postgres:16
```

### 5. Create the database (Homebrew only)

```bash
createdb finance_saas
```

### 6. Run migrations

```bash
alembic upgrade head
```

This also seeds the database with a test user and sample data for development:

| Field    | Value                |
|----------|----------------------|
| Email    | `testuser@abc.com`   |
| Password | `pwd123`             |
| Tenant   | Test Corp            |
| Role     | Admin                |

The seed includes 5 accounts, 12 months of transactions (FY 2025-26), and 12 monthly budgets — enough data to explore all reports and budget features out of the box.

### 7. Start the API server

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

- Interactive docs: `http://localhost:8000/docs`
- OpenAPI schema: `http://localhost:8000/openapi.json`

## Frontend Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure environment

Create `frontend/.env` (kept out of git):

```env
# Backend API base URL (without /api/v1 suffix)
VITE_API_BASE_URL=http://localhost:8000

# Session idle timeout in minutes — user is logged out after this period of inactivity
VITE_IDLE_TIMEOUT_MINUTES=30
```

See `frontend/.env.example` for all available variables.

### 3. Start the dev server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### Build for production

```bash
npm run build
```

> **Note:** `frontend/.env` is git-ignored. Copy `frontend/.env.example` to `frontend/.env` before running.

## Features

- **Authentication** — Register with tenant creation, login/logout, JWT access tokens with silent refresh; session expires after configurable idle timeout (default 30 min)
- **Dashboard** — Net worth, income vs expenses, recent transactions, budget progress, spending chart
- **Accounts** — Checking, savings, credit, investment, cash accounts with balance tracking
- **Transactions** — Full CRUD with filtering by account, category, search, and pagination
- **Categories** — Hierarchical categories with icon and color support
- **Budgets** — Weekly/monthly/yearly budgets with real-time progress tracking
- **Reports** — Spending by category, income vs expenses, net worth, budget vs actual
- **AI Tax Advisory** — Personalised Indian tax-saving recommendations for FY 2025-26 powered by LLM; supports New and Old tax regimes, auto-derives projected annual income from transaction history, and provides section-wise deduction suggestions (80C, 80D, NPS, HRA, etc.)
- **AI Spend Advisory** — LLM-generated monthly and annual spend recommendations; analyses income, categorised expenses, and budget allocations to surface over-budget categories, budget adjustment advice (increase / decrease / on-track), and concrete saving actions
- **Multi-tenant** — Isolated data per tenant with role-based access (superadmin, admin, member)

## AI Tax Advisory

The Tax Recommendations page uses a pluggable LLM backend to generate personalised Indian tax-saving advice.

### Supported providers

| Provider | `LLM_PROVIDER` value | Key env var | Default model |
|---|---|---|---|
| Google Gemini | `gemini` | `GEMINI_API_KEY` | `gemini-2.5-flash` |
| OpenAI | `openai` | `OPENAI_API_KEY` | `gpt-4o-mini` |
| Anthropic Claude | `anthropic` | `ANTHROPIC_API_KEY` | `claude-haiku-4-5-20251001` |

Set `LLM_PROVIDER` and the corresponding API key in your `.env` file. The provider models can be overridden via `LLM_MODEL_GEMINI`, `LLM_MODEL_OPENAI`, and `LLM_MODEL_ANTHROPIC` in `app/config.py`.

### How income is derived

If no income is entered manually, the service calculates a projected annual income from the current financial year's credit transactions: average monthly credit (across months that actually have credits) × 12. The derived figure is displayed on the page before submission and can be overridden via the "Override income manually" toggle.

## AI Spend Advisory

The Reports page includes an AI Spend Recommendations panel that analyses the current user's transactions and budgets over a configurable date range (default: last 90 days) and returns:

- **Monthly summary** — average income, expenses, savings, and savings rate
- **Annual projection** — extrapolated income, expenses, and savings
- **Over-budget categories** — categories where actual spend exceeds the budget
- **Budget allocation advice** — per-category verdict (`increase`, `decrease`, `on_track`, or `set_budget`) with a plain-English reason
- **Spending recommendations** — prioritised actions (reduce, reallocate, save, invest) with estimated monthly impact

The same pluggable LLM backend used by the Tax Advisory powers this feature — set `LLM_PROVIDER` and the corresponding API key (see table above).

## Development

### Run tests

```bash
pytest
```

### Linting & type checking

```bash
ruff check .
mypy app
```
