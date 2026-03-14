# Architecture Diagrams

## 1. System Overview

```mermaid
graph TB
    classDef frontend fill:#6366f1,stroke:#4338ca,color:#fff,rx:8
    classDef backend fill:#0ea5e9,stroke:#0284c7,color:#fff,rx:8
    classDef service fill:#14b8a6,stroke:#0d9488,color:#fff,rx:8
    classDef db fill:#f59e0b,stroke:#d97706,color:#fff,rx:8
    classDef llm fill:#8b5cf6,stroke:#7c3aed,color:#fff,rx:8
    classDef external fill:#ec4899,stroke:#db2777,color:#fff,rx:8

    subgraph BROWSER["🌐 Browser"]
        direction TB
        subgraph FE["Frontend — React 18 + TypeScript + Vite"]
            PAGES["📄 Pages<br/>Dashboard · Accounts · Transactions<br/>Budgets · Reports · Tax Advisory"]
            QUERY["🔄 TanStack React Query<br/>Server-state cache · stale-while-revalidate"]
            CLIENT["🔒 Axios Client<br/>JWT attach · proactive refresh<br/>30-min idle timeout"]
        end
    end

    subgraph SERVER["🖥️ Server — Python 3.11"]
        direction TB
        subgraph API["FastAPI  (/api/v1)"]
            AUTH_EP["🔑 /auth<br/>register · login · refresh · logout · me"]
            ACCT_EP["🏦 /accounts<br/>CRUD · balance tracking"]
            TX_EP["💸 /transactions<br/>CRUD · filters · pagination"]
            CAT_EP["🏷️ /categories<br/>CRUD · hierarchy · system"]
            BUD_EP["📊 /budgets<br/>CRUD · progress"]
            REP_EP["📈 /reports<br/>spending · income · net-worth · budget-vs-actual"]
            TAX_EP["🤖 /tax-advisory<br/>income-projection · recommendations"]
            USR_EP["👤 /users<br/>admin only"]
        end

        subgraph SVC["Service Layer"]
            AUTH_SVC["AuthService<br/>register · login · refresh"]
            ACCT_SVC["AccountService"]
            TX_SVC["TransactionService"]
            CAT_SVC["CategoryService"]
            BUD_SVC["BudgetService"]
            REP_SVC["ReportService"]
            TAX_SVC["TaxAdvisoryService<br/>income projection · LLM prompt"]
            LLM_FAC["LLM Factory<br/>get_llm_provider()"]
        end
    end

    subgraph DATA["💾 Data Layer"]
        PG[("PostgreSQL 16<br/>asyncpg + SQLAlchemy 2.0")]
        ALEMBIC["Alembic<br/>Migrations"]
    end

    subgraph LLM["🧠 LLM Providers (pluggable)"]
        GEMINI["Google Gemini<br/>gemini-2.5-flash"]
        OPENAI_P["OpenAI<br/>gpt-4o-mini"]
        CLAUDE["Anthropic Claude<br/>claude-haiku-4-5"]
    end

    PAGES --> QUERY
    QUERY --> CLIENT
    CLIENT -- "HTTPS + Bearer token" --> AUTH_EP
    CLIENT -- "HTTPS + Bearer token" --> ACCT_EP
    CLIENT -- "HTTPS + Bearer token" --> TX_EP
    CLIENT -- "HTTPS + Bearer token" --> CAT_EP
    CLIENT -- "HTTPS + Bearer token" --> BUD_EP
    CLIENT -- "HTTPS + Bearer token" --> REP_EP
    CLIENT -- "HTTPS + Bearer token" --> TAX_EP
    CLIENT -- "HTTPS + Bearer token" --> USR_EP

    AUTH_EP --> AUTH_SVC
    ACCT_EP --> ACCT_SVC
    TX_EP --> TX_SVC
    CAT_EP --> CAT_SVC
    BUD_EP --> BUD_SVC
    REP_EP --> REP_SVC
    TAX_EP --> TAX_SVC
    TAX_SVC --> LLM_FAC

    AUTH_SVC --> PG
    ACCT_SVC --> PG
    TX_SVC --> PG
    CAT_SVC --> PG
    BUD_SVC --> PG
    REP_SVC --> PG
    TAX_SVC --> PG
    ALEMBIC --> PG

    LLM_FAC --> GEMINI
    LLM_FAC --> OPENAI_P
    LLM_FAC --> CLAUDE

    class PAGES,QUERY,CLIENT frontend
    class AUTH_EP,ACCT_EP,TX_EP,CAT_EP,BUD_EP,REP_EP,TAX_EP,USR_EP backend
    class AUTH_SVC,ACCT_SVC,TX_SVC,CAT_SVC,BUD_SVC,REP_SVC,TAX_SVC,LLM_FAC service
    class PG,ALEMBIC db
    class GEMINI,OPENAI_P,CLAUDE llm
```

---

## 2. Authentication & Session Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as React Frontend
    participant AX as Axios Client
    participant API as FastAPI /auth
    participant DB as PostgreSQL

    rect rgb(236,254,255)
        note over User,DB: 🔐 Registration
        User->>FE: Fill register form
        FE->>API: POST /auth/register
        API->>DB: Create Tenant + User (bcrypt hash)
        DB-->>API: User created
        API-->>FE: 201 UserResponse
    end

    rect rgb(240,253,244)
        note over User,DB: 🔑 Login
        User->>FE: Submit credentials
        FE->>API: POST /auth/login
        API->>DB: Verify password
        DB-->>API: User record
        API-->>FE: access_token (15 min JWT) + Set-Cookie refresh_token (7 days, httpOnly)
        FE->>FE: localStorage.access_token = token
    end

    rect rgb(255,251,235)
        note over User,DB: 🔄 Active Session — Proactive Refresh
        User->>FE: Performs any action
        FE->>AX: API request
        AX->>AX: Decode JWT exp — token expires in < 2 min?
        AX->>AX: last_activity within 30 min?
        AX->>API: POST /auth/refresh (cookie auto-sent)
        API->>DB: Validate refresh token → load user
        DB-->>API: User active
        API-->>AX: New access_token
        AX->>AX: Store new token, retry original request
        AX-->>FE: Response
    end

    rect rgb(255,241,242)
        note over User,DB: 💤 Idle Timeout (>30 min)
        User->>FE: Returns after 30+ min
        FE->>AX: API request → 401 received
        AX->>AX: last_activity > 30 min — isIdle() = true
        AX->>FE: Clear localStorage → redirect /login
    end

    rect rgb(249,240,255)
        note over User,DB: 🚪 Logout
        User->>FE: Click Logout
        FE->>API: POST /auth/logout
        API-->>FE: Delete-Cookie refresh_token
        FE->>FE: localStorage.removeItem(access_token)
        FE->>FE: Redirect → /login
    end
```

---

## 3. Database Entity Relationship Diagram

```mermaid
erDiagram
    TENANT {
        uuid id PK
        string name
        string slug UK
        bool is_active
        timestamp created_at
        timestamp updated_at
    }

    USER {
        uuid id PK
        uuid tenant_id FK
        string email
        string hashed_password
        string full_name
        enum role "SUPERADMIN|ADMIN|MEMBER"
        bool is_active
        timestamp created_at
        timestamp updated_at
    }

    ACCOUNT {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        string name
        enum type "CHECKING|SAVINGS|CREDIT|INVESTMENT|CASH"
        string currency
        numeric balance
        string institution_name
        bool is_active
        timestamp created_at
        timestamp updated_at
    }

    CATEGORY {
        uuid id PK
        uuid tenant_id FK "NULL = system-wide"
        uuid parent_id FK "self-ref hierarchy"
        string name
        string icon
        string color
        bool is_system
        timestamp created_at
        timestamp updated_at
    }

    TRANSACTION {
        uuid id PK
        uuid tenant_id FK
        uuid account_id FK
        uuid category_id FK
        numeric amount
        enum type "DEBIT|CREDIT"
        string description
        string merchant
        date date
        bool is_recurring
        text notes
        timestamp created_at
        timestamp updated_at
    }

    BUDGET {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        uuid category_id FK
        numeric amount
        enum period "WEEKLY|MONTHLY|YEARLY"
        date start_date
        date end_date
        timestamp created_at
        timestamp updated_at
    }

    SAVED_REPORT {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        string name
        enum type "SPENDING|INCOME|NET_WORTH|BUDGET_VS_ACTUAL"
        jsonb filters
        timestamp created_at
        timestamp updated_at
    }

    TENANT ||--o{ USER : "has"
    TENANT ||--o{ ACCOUNT : "owns"
    TENANT ||--o{ TRANSACTION : "owns"
    TENANT ||--o{ BUDGET : "owns"
    TENANT ||--o{ SAVED_REPORT : "owns"
    TENANT ||--o{ CATEGORY : "owns"
    USER ||--o{ ACCOUNT : "manages"
    USER ||--o{ BUDGET : "sets"
    USER ||--o{ SAVED_REPORT : "saves"
    ACCOUNT ||--o{ TRANSACTION : "contains"
    CATEGORY ||--o{ TRANSACTION : "tags"
    CATEGORY ||--o{ BUDGET : "tracks"
    CATEGORY ||--o| CATEGORY : "parent"
```

---

## 4. AI Tax Advisory Flow

```mermaid
flowchart TD
    A([User opens Tax Advisory page]) --> B[GET /tax-advisory/income-projection]
    B --> C[(Query FY credit transactions<br/>date_trunc month DISTINCT)]
    C --> D[avg_monthly_credit x 12<br/>= projected annual income]
    D --> E[Display income banner]

    E --> F{User submits form}
    F -->|income override| G[Use manual income]
    F -->|no override| H[Use projected income]

    G --> I[POST /tax-advisory/recommendations]
    H --> I

    I --> J[TaxAdvisoryService]
    J --> K{LLM_PROVIDER env}

    K -->|gemini| L1[Gemini 2.5 Flash<br/>response_mime_type=json]
    K -->|openai| L2[GPT-4o-mini]
    K -->|anthropic| L3[Claude Haiku]

    L1 --> M[Raw LLM response]
    L2 --> M
    L3 --> M

    M --> N[Strip markdown fences<br/>Extract outermost JSON object]
    N --> O{JSON valid?}
    O -->|yes| P[Structured TaxResult]
    O -->|no| Q[Fallback: wrap in summary field]

    P --> R[Return TaxAdvisoryResponse<br/>annual_income_used · llm_provider · result]
    Q --> R

    R --> S[Frontend renders<br/>Regime banner · Tax comparison<br/>Recommendation cards · Summary]

    style A fill:#6366f1,color:#fff
    style S fill:#14b8a6,color:#fff
    style L1 fill:#8b5cf6,color:#fff
    style L2 fill:#8b5cf6,color:#fff
    style L3 fill:#8b5cf6,color:#fff
    style C fill:#f59e0b,color:#fff
```

---

## 5. Multi-Tenancy Data Isolation

```mermaid
graph LR
    classDef tenant1 fill:#6366f1,stroke:#4338ca,color:#fff
    classDef tenant2 fill:#ec4899,stroke:#db2777,color:#fff
    classDef shared fill:#14b8a6,stroke:#0d9488,color:#fff
    classDef db fill:#f59e0b,stroke:#d97706,color:#fff

    subgraph T1["🏢 Tenant A (Acme Corp)"]
        U1A["👤 User 1"]
        U2A["👤 User 2"]
        ACC_A["🏦 Accounts"]
        TX_A["💸 Transactions"]
        BUD_A["📊 Budgets"]
        CAT_A["🏷️ Custom Categories"]
    end

    subgraph T2["🏢 Tenant B (Beta Inc)"]
        U1B["👤 User 3"]
        ACC_B["🏦 Accounts"]
        TX_B["💸 Transactions"]
        BUD_B["📊 Budgets"]
        CAT_B["🏷️ Custom Categories"]
    end

    subgraph SHARED["🌐 System-wide"]
        SYS_CAT["🏷️ System Categories<br/>Food · Transport · Utilities…"]
    end

    PG[("PostgreSQL<br/>tenant_id index on every table")]

    T1 --> PG
    T2 --> PG
    SHARED --> PG

    PG -.->|WHERE tenant_id = A| T1
    PG -.->|WHERE tenant_id = B| T2
    PG -.->|WHERE tenant_id IS NULL| SHARED

    class U1A,U2A,ACC_A,TX_A,BUD_A,CAT_A tenant1
    class U1B,ACC_B,TX_B,BUD_B,CAT_B tenant2
    class SYS_CAT shared
    class PG db
```
