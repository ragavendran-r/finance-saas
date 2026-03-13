# Finance SaaS

Multi-tenant personal finance management platform built with FastAPI, SQLAlchemy, PostgreSQL, and React.

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

# LLM provider for AI Tax Advisory (choose one: gemini | openai | anthropic)
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

### 2. Start the dev server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### Build for production

```bash
npm run build
```

## Features

- **Authentication** — Register with tenant creation, login/logout, JWT tokens
- **Dashboard** — Net worth, income vs expenses, recent transactions, budget progress, spending chart
- **Accounts** — Checking, savings, credit, investment, cash accounts with balance tracking
- **Transactions** — Full CRUD with filtering by account, category, search, and pagination
- **Categories** — Hierarchical categories with icon and color support
- **Budgets** — Weekly/monthly/yearly budgets with real-time progress tracking
- **Reports** — Spending by category, income vs expenses, net worth, budget vs actual
- **AI Tax Advisory** — Personalised Indian tax-saving recommendations for FY 2025-26 powered by LLM; supports New and Old tax regimes, auto-derives projected annual income from transaction history, and provides section-wise deduction suggestions (80C, 80D, NPS, HRA, etc.)
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
