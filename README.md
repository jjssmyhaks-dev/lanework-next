# 🚛 Lanework

> AI-powered logistics platform for Indian MSMEs — track shipments, manage inventory, optimize routes, and automate operations through natural language chat. No technical skills required.

**Live:** [lanework-next-delta.vercel.app](https://lanework-next-delta.vercel.app)
**Stack:** Next.js 16 · React 19 · Neon PostgreSQL · Cloudflare Workers AI · MCP Protocol

---

## 🎯 What Lanework Does

| Feature | Description |
|---------|-------------|
| **AI Chat (Vercel AI SDK)** | Natural language interface with streaming responses, tool call indicators, multi-turn context — powered by OpenAI GPT-4o-mini or Anthropic Claude |
| **Knowledge Base (BM25 + JSON-LD)** | 50+ entries across MCPs, domain concepts, business rules — with typeahead search in chat and /knowledge |
| **15 MCP Integrations** | Shiprocket, FedEx, TallyPrime, Shopify, MapmyIndia, Weather, ERP, and more — each with live/simulated/db-fallback modes |
| **Autonomous Agents** | Background pollers monitor shipments (5min), inventory (30min), fleet (10min), compliance (daily) |
| **Self-Learning** | Agents learn from feedback, adjust risk scores, improve accuracy over time |
| **Monitoring Dashboard** | Grafana-style real-time metrics — security events, API latency, agent accuracy, active users |
| **Feature Flags** | Runtime toggleable features per plan tier (18 built-in flags) |
| **Team Management** | Multi-tenant orgs with RBAC (Super Admin → Viewer), email invites |
| **Guardrails** | Input injection detection, output PII masking, cost budgets, circuit breaker |
| **Indian Pricing** | ₹0/₹999/₹2,999/₹7,999 per month + GST, 75%+ gross margin |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                    Frontend                       │
│  Next.js 16 (Turbopack) · React 19 · Tailwind   │
│  50+ pages · 30+ components · Chat-first UI      │
│  SSE streaming · Knowledge typeahead · RBAC UI    │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                 API Layer                         │
│  65+ REST routes · JWT auth · Zod validation     │
│  Rate limiting · Audit logging · Sentry           │
│  SSE streaming (/api/chat/stream)                 │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              AI & Agent System                    │
│  Chat Orchestrator · Intent Detection             │
│  5 Background Pollers · Workflow Engine           │
│  Trust System · Approval Queue · Learning Engine  │
│  Agentic Harness · Pattern Analyzer · Auto-Tuner  │
│  Guardrails (input/output/cost/circuit breaker)   │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│         Knowledge Base (BM25 + JSON-LD)           │
│  50+ entries · BM25 search · Hinglish-aware       │
│  JSON-LD ontology · Agent discovery endpoint      │
│  Intent-to-tool mapping · Entity detection        │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│           15 MCP Servers (58 tools)               │
│  Shiprocket · TallyPrime · E-Way Bill · FedEx    │
│  Shopify · WooCommerce · MapmyIndia · Weather     │
│  Google Sheets · ERP (SAP B1) · WMS · Scanner    │
│  Compliance · Dock Scheduler · Fleet              │
│                                                   │
│  Each returns mode: "live" | "simulated" |        │
│  "db-fallback" — never hard-errors for the user   │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              Data Layer                           │
│  Neon PostgreSQL (37+ tables) · Prisma ORM       │
│  AES-256-GCM credential encryption                │
│  Feature flags · Audit events · Agent patterns    │
└─────────────────────────────────────────────────┘
```

---

## 🤖 MCP Integrations — Real vs Simulated Status

Every MCP server has a **graceful degradation pattern**: it tries the real API first, falls back to cached DB data if available, and only returns simulated data as a last resort. This means the product **never hard-errors** for non-technical users.

| MCP Server | Tools | Real API | Env Vars Required |
|------------|-------|----------|-------------------|
| **Shiprocket** | track, book, rates, cancel, label, webhook | ✅ Shiprocket REST API | `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD` |
| **TallyPrime** | sync inventory, push sales, fetch ledger | ✅ TallyPrime REST | `TALLY_REST_URL`, `TALLY_COMPANY` |
| **E-Way Bill** | validate GSTIN, generate EWB, cancel, check status | ✅ GSTN API | `GSTN_API_KEY`, `GSTN_USERNAME`, `GSTN_PASSWORD` |
| **MapmyIndia** | geocode, route, ETA, nearby, isochrone | ✅ MapmyIndia API | `MAPMYINDIA_LICENSE_KEY` |
| **Fleet** | track vehicle, fleet status, fuel, maintenance, driver | ✅ GPS/OBD APIs | Optional — DB fallback |
| **FedEx/DHL** | track, create, cancel, rates, multi-carrier compare | ✅ FedEx/DHL APIs | `FEDEX_API_KEY`, `FEDEX_SECRET_KEY` |
| **Shopify/WooCommerce** | sync orders, update inventory, sync products | ✅ Shopify/WooCommerce REST | `SHOPIFY_STORE_URL`, `SHOPIFY_ACCESS_TOKEN` |
| **Google Sheets** | read, write, list, configure | ✅ Google Sheets API | `GOOGLE_SHEETS_URL` |
| **ERP (SAP B1)** | sync orders, inventory, invoices | ✅ SAP B1 DI API | `SAP_B1_URL`, `SAP_B1_TOKEN` |
| **Compliance** | check license, check RC, insurance, PUC, challans | ✅ Parivahan/VAHAN API | Optional — DB fallback |
| **Email** | send tracking update, alerts, reports | ✅ Resend API | `RESEND_API_KEY` |
| **Weather** | current weather, forecast, logistics risk | ✅ OpenWeatherMap API | `OPENWEATHER_API_KEY` |
| **WMS** | check inventory, movements, dock schedule | ✅ Internal DB + APIs | Optional |
| **Scanner** | verify pick, receive item, cycle count | ✅ Barcode API + local device | Optional |
| **Dock Scheduler** | book dock, list, cancel, status | ✅ Internal DB + APIs | Optional |

**Without API keys:** All tools return `mode: "simulated"` with helpful messages telling users how to configure live data.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm
- Neon PostgreSQL database (free tier works)

### 1. Clone & Install
```bash
git clone https://github.com/jjssmyhaks-dev/lanework-next.git
cd lanework-next
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
```

Fill in the required variables (see [Environment Variables](#-environment-variables) below).

### 3. Run
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Database
Tables are created automatically on first run via `sql` tagged templates. For schema management:
```bash
npx prisma db push
```

---

## 🔑 Environment Variables

### Required
| Variable | Description | How to get |
|----------|-------------|------------|
| `DATABASE_URL` | Neon PostgreSQL connection string | [neon.tech](https://neon.tech) → Dashboard → Connection string |
| `JWT_SECRET` | Secret key for JWT tokens | `openssl rand -hex 32` |
| `NEXTAUTH_SECRET` | Same as JWT_SECRET | `openssl rand -hex 32` |

### AI (Vercel AI SDK)
| Variable | Description | How to get |
|----------|-------------|------------|
| `OPENAI_API_KEY` | OpenAI API key (default model: gpt-4o-mini) | [platform.openai.com](https://platform.openai.com) → API Keys |
| `ANTHROPIC_API_KEY` | Anthropic API key (fallback: claude-3-5-sonnet) | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `AI_MODEL` | Set to `claude` to use Anthropic as default | Optional — defaults to OpenAI |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID (for additional AI tasks) | [dash.cloudflare.com](https://dash.cloudflare.com) → Right sidebar |
| `CLOUDFLARE_API_TOKEN` | API token with Workers AI permission | Cloudflare → My Profile → API Tokens → Create |

### Integrations (bring your own API keys)
| Variable | Service | How to get |
|----------|---------|------------|
| `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD` | Shiprocket | [shiprocket.com](https://shiprocket.com) → Settings → API |
| `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` | WhatsApp Business | Meta Business → Settings → API Setup |
| `TALLY_REST_URL` / `TALLY_COMPANY` | TallyPrime | Tally → Ctrl+Alt+R → copy REST URL |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay (payments) | Dashboard → Settings → API Keys |
| `FEDEX_API_KEY` / `FEDEX_SECRET_KEY` | FedEx | [developer.fedex.com](https://developer.fedex.com) |
| `SHOPIFY_STORE_URL` / `SHOPIFY_ACCESS_TOKEN` | Shopify | Admin → Settings → Apps → Develop apps |
| `MAPMYINDIA_LICENSE_KEY` | MapmyIndia | [mapmyindia.com](https://mapmyindia.com) → Dashboard |
| `GOOGLE_SHEETS_URL` | Google Sheets | Google Sheets → Share → Copy link |
| `OPENWEATHER_API_KEY` | Weather | [openweathermap.org](https://openweathermap.org) → API Keys |
| `RESEND_API_KEY` | Email (forgot password, invites) | [resend.com](https://resend.com) → API Keys |

### Optional
| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Sentry error tracking |
| `NEXT_PUBLIC_APP_URL` | Your production URL (for invites) |
| `GSTN_API_KEY` / `GSTN_USERNAME` / `GSTN_PASSWORD` | E-Way Bill API |
| `SAP_B1_URL` / `SAP_B1_TOKEN` | SAP Business One ERP |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, Register, Forgot/Reset Password, Join (invites)
│   ├── (dashboard)/         # All dashboard pages (protected)
│   │   ├── chat/            # AI Chat interface (SSE streaming)
│   │   ├── dashboard/       # Dashboard home
│   │   ├── shipment/        # Shipment management
│   │   ├── inventory/       # Inventory management
│   │   ├── fleet/           # Fleet & driver management
│   │   ├── warehouse/       # Warehouse operations
│   │   ├── routes/          # Route optimization
│   │   ├── customer/        # Customer management
│   │   ├── integrations/    # MCP integration setup
│   │   ├── team/            # Team management & RBAC
│   │   ├── agents/          # AI agent pages (metrics, control, trust, harness)
│   │   ├── approvals/       # Agent approval queue
│   │   ├── alerts/          # Alert dashboard
│   │   ├── knowledge/       # Knowledge base management (BM25 search)
│   │   ├── monitoring/      # Grafana-style monitoring dashboard
│   │   ├── feature-flags/   # Feature flag management
│   │   ├── pricing/         # Pricing plans
│   │   ├── billing/         # Billing & invoices
│   │   ├── terms/           # Terms of Service
│   │   └── privacy/         # Privacy Policy
│   ├── api/                 # 65+ REST API routes
│   │   ├── auth/            # Login, Register, Refresh, Forgot/Reset Password
│   │   ├── chat/            # Chat orchestrator + history + SSE streaming
│   │   ├── agents/          # Agent APIs (cron, alerts, approvals, metrics, harness)
│   │   ├── org/             # Organisation, members, invites
│   │   ├── knowledge/       # Knowledge base search + suggest + stats
│   │   ├── monitoring/      # Monitoring metrics API
│   │   ├── feature-flags/   # Feature flag management API
│   │   ├── shipment/        # Shipment CRUD
│   │   ├── inventory/       # Inventory CRUD
│   │   ├── fleet/           # Fleet CRUD
│   │   ├── billing/         # Razorpay checkout + verification
│   │   └── ...
│   ├── agents/              # Agent detail pages (6 agents)
│   └── page.tsx             # Landing page
├── components/ui/           # 30+ React components
│   ├── chat/                # Message bubble, tool cards, quick actions,
│   │                        # knowledge suggest popover, streaming hook
│   ├── notification-bell.tsx
│   ├── agent-status-widget.tsx
│   └── ...
├── lib/
│   ├── agents/              # Autonomous agent system
│   │   ├── scheduler.ts     # Cron scheduler for background pollers
│   │   ├── pollers/         # 5 pollers (shipment, inventory, fleet, compliance, daily-report)
│   │   ├── events.ts        # Typed event emitter (20+ events)
│   │   ├── workflow-engine.ts # Multi-step workflow execution
│   │   ├── trust.ts         # Trust level management
│   │   ├── learning.ts      # Self-learning engine
│   │   ├── harness.ts       # Agentic harness for continuous eval
│   │   ├── adaptive-risk.ts # Dynamic risk scoring
│   │   ├── pattern-analyzer.ts # Pattern extraction from audit logs
│   │   ├── auto-tuner.ts    # Auto-applies learned patterns
│   │   └── ...
│   ├── knowledge/           # Knowledge base (BM25 search + JSON-LD ontology)
│   │   ├── types.ts         # KBEntry, SearchResult, AgentContext, JSON-LD types
│   │   ├── search.ts        # BM25 search engine (Okapi scoring, Hinglish-aware)
│   │   ├── mcp-entries.ts   # Knowledge entries for all 15 MCP servers (58 tools)
│   │   ├── domain-entries.ts # Domain entities, business rules, workflows, procedures
│   │   ├── ontology.ts      # JSON-LD schema.org ontology for cross-agent interop
│   │   ├── store.ts         # Central store: search, intent mapping, entity detection, suggest
│   │   └── index.ts
│   ├── guardrails/          # Input guard, output guard, cost guard, circuit breaker
│   ├── security/            # Webhook verification, audit events
│   ├── auth.ts              # JWT auth with refresh tokens
│   ├── feature-gate.ts      # Plan-based feature access control
│   ├── feature-flags.ts     # Runtime toggleable feature flags per plan tier
│   ├── org.ts               # Organisation & RBAC
│   ├── permissions.ts       # Permission definitions
│   ├── pricing.ts           # Plan definitions, cost breakdown, margins
│   ├── cache.ts             # In-memory TTL cache
│   ├── email.ts             # Resend email service
│   ├── db-pool.ts           # Connection pool monitoring
│   └── ...
mcp-servers/                 # 15 MCP servers, 58 tools
├── shared/                  # Base MCP server class
├── shiprocket/              # Shiprocket (4 tools)
├── tally/                   # TallyPrime (2 tools)
├── ewaybill/                # E-Way Bill (2 tools)
├── mapmyindia/              # MapmyIndia (2 tools)
├── fleet/                   # Fleet (2 tools)
├── fedex/                   # FedEx/DHL (1 tool)
├── shopify/                 # Shopify/WooCommerce (2 tools)
├── googlesheets/            # Google Sheets (2 tools)
├── erp/                     # SAP B1 ERP (1 tool)
├── compliance/              # Compliance (2 tools)
├── email/                   # Email (1 tool)
├── weather/                 # Weather (1 tool)
├── wms/                     # Warehouse Management (1 tool)
├── scanner/                 # Barcode Scanner (1 tool)
├── dockscheduler/           # Dock Scheduler (1 tool)
└── ...
test/                        # 7 test files, 69 tests
loadtest/                    # k6 load test suites + Docker
prisma/                      # Database schema + 2 migrations
```

---

## 🤖 AI Agent System

### Vercel AI SDK Integration

The chat uses [Vercel AI SDK](https://sdk.vercel.ai) for streaming LLM responses with tool calls:

| Component | What it does |
|-----------|-------------|
| `useAIChat` hook | Client-side streaming hook with tool call indicators |
| `/api/chat/ai` | Streaming endpoint — `streamText()` with 13 MCP tools |
| `/api/chat` | Non-streaming fallback — `generateText()` with fallback to rule-based orchestrator |
| OpenAI (default) | `gpt-4o-mini` — fast, cost-effective for Indian logistics queries |
| Anthropic Claude | `claude-3-5-sonnet` — fallback when `AI_MODEL=claude` is set |

**Setup:** Add `OPENAI_API_KEY` to `.env.local`. For Claude fallback, also add `ANTHROPIC_API_KEY`.

**Features:**
- Token-by-token streaming (50ms throttle for smooth UI)
- 13 MCP tool definitions (track, rates, stock, weather, route, GSTIN, fleet, compliance, e-commerce, sheets)
- Up to 5 sequential tool calls per message
- Multi-turn context (last 10 messages from DB)
- Knowledge base context injection
- Cost tracking per conversation

### Background Pollers
| Poller | Interval | What it does |
|--------|----------|-------------|
| Shipment Poller | Every 5 min | Checks all active shipments, detects delays, creates alerts |
| Inventory Poller | Every 30 min | Checks stock levels, flags items below reorder point |
| Fleet Poller | Every 10 min | Monitors vehicle locations, driver hours compliance |
| Compliance Poller | Daily | Checks license expiry, RC renewal, challan status |
| Daily Report | 8 AM IST | Generates summary of all operations |

### Trust Levels
| Level | Behavior |
|-------|----------|
| **Propose Only** | Agent creates approval requests, human approves all |
| **Auto (Low Risk)** | Agent auto-executes actions with risk score < 0.3 |
| **Full Auto** | Agent executes everything, human reviews weekly |

### Agent Harness (Production-Grade)

The agent harness is a 3-phase system for making agents autonomous and self-improving:

**Phase 1 — Production Hardening:**
| Module | What it does |
|--------|---------------|
| Circuit Breaker | Per-MCP integration failure detection (CLOSED→OPEN→HALF_OPEN) |
| Dead Letter Queue | Failed events stored for retry/inspect/discard |
| Agent Memory | Per-tenant decisions, rejections, preferences, context |
| Approval Escalation | Auto-reject after 24h, escalate critical after 1h |
| Reasoning Chain | Every approval includes why this action was chosen |
| Dry Run Mode | Preview MCP actions before executing |
| SSE Streaming | Real-time agent activity in chat UI |

**Phase 2 — Trust & Learning:**
| Module | What it does |
|--------|---------------|
| Confidence Calibration | Agents know when they're unsure (EMA-blended accuracy) |
| Rejection Learning | Capture rejection reasons, update risk profiles |
| Event Replay | Re-process events after bug fixes |
| Tool Availability | Fail fast on missing API keys |
| Rate Limiting | Per-agent token bucket (no resource monopolization) |

**Phase 3 — Coordination:**
| Module | What it does |
|--------|---------------|
| Cross-Agent Propagation | Shipment delay → fleet agent notified |
| Capability Declaration | What each agent can/can't do, plan-tier enforcement |
| Eval Auto-Generation | New test cases from production failures and user corrections |

### Self-Learning Loop
```
User Feedback (thumbs up/down)
    ↓
Learning Engine analyzes patterns + rejection reasons
    ↓
Adaptive Risk adjusts scores based on actual accuracy
    ↓
Auto-Tuner applies high-confidence changes
    ↓
Harness detects regressions + auto-generates eval cases
    ↓
Dashboard shows improvement trends + confidence calibration
```

---

## 📚 Knowledge Base

The knowledge base enables the AI chat to understand what it can do and how to do it.

### Structure
| File | Entries | What it covers |
|------|---------|---------------|
| `mcp-entries.ts` | 30+ | All 15 MCP servers — tools, inputs, outputs, modes (live/simulated/fallback) |
| `domain-entries.ts` | 25+ | Domain entities, business rules, workflows, API routes, procedures |
| `search.ts` | — | BM25 search engine — Okapi scoring, Hinglish/Devanagari awareness |
| `ontology.ts` | — | JSON-LD with schema.org types for cross-agent interoperability |

### Key Features
- **BM25 text search** — Okapi BM25 scoring with Indian-language tokenization (Hinglish, Devanagari)
- **JSON-LD ontology** — schema.org types for external AI agent discovery
- **Agent Discovery** — `/api/knowledge?discovery=true` returns a machine-readable capabilities doc
- **Intent-to-tool mapping** — 30+ keyword patterns map user intents to MCP tools
- **Entity detection** — 10 regex patterns extract shipment IDs, tracking numbers, PIN codes
- **Business rule detection** — maps context to applicable pricing/RBAC/workflow rules
- **Chat typeahead** — BM25-powered suggestions as you type in chat and /knowledge
- **Chat integration** — orchestrator uses KB context when no explicit intent is detected

### API Endpoints
| Endpoint | What it does |
|----------|-------------|
| `GET /api/knowledge?q=track+shipment` | Search knowledge base |
| `GET /api/knowledge/suggest?q=track` | Fast typeahead suggestions |
| `GET /api/knowledge?stats=true` | Get entry counts by category |
| `GET /api/knowledge?discovery=true` | Agent discovery document (machine-readable) |
| `GET /api/knowledge?graph=true` | Full JSON-LD knowledge graph |
| `GET /api/knowledge?id=...` | Get specific entry by ID |

---

## 📊 Monitoring Dashboard

Real-time system health at `/monitoring`:

| Metric | Source | Refresh |
|--------|--------|---------|
| Security events by severity | `security_events` table | 30s auto |
| Active users per bucket | `security_events` (distinct user_id) | 30s auto |
| Agent accuracy by type | `agent_feedback` (thumbs up/down) | 30s auto |
| Recent security events | `security_events` (last 20) | 30s auto |

**API:** `GET /api/monitoring/metrics?period=24&bucket=60`

---

## 🚩 Feature Flags

18 built-in flags across 5 categories, toggleable at runtime:

| Category | Flags | Default Plan |
|----------|-------|-------------|
| **Polling** | shipment, inventory, fleet, compliance, daily report | Free → Enterprise |
| **AI** | voice input, AI reports, AI auto actions | Enterprise / Growth |
| **Integration** | webhooks, API access, white label | Starter → Enterprise |
| **Data** | CSV import, CSV export, extended retention | Free → Growth |
| **Support** | priority support, dedicated manager | Growth / Enterprise |

**API:** `GET /api/feature-flags?availability=true` (with user plan context)
**Management:** `/feature-flags` (super admin only)

---

## 💰 Pricing & Cost Model

| Plan | Price/mo | AI Chats | Shipments | Team | Gross Margin |
|------|----------|----------|-----------|------|-------------|
| **Free** | ₹0 | 10/mo | 20/mo | 1 | — |
| **Starter** | ₹999 | 200/day | 500/mo | 3 | 97.9% |
| **Growth** | ₹2,999 | Unlimited | 5,000/mo | 10 | 97.9% |
| **Enterprise** | ₹7,999 | Unlimited | Unlimited | 50 | 97.3% |

**AI Cost:** ~₹0.005 per conversation (Cloudflare Workers AI — Llama 3 8B)

---

## 🧪 Testing

```bash
# Unit tests (69 tests)
npx vitest run

# Type checking
npx tsc --noEmit

# Load testing
k6 run loadtest/k6-api.js
k6 run loadtest/k6-login.js
k6 run loadtest/k6-chat.js

# Load test with Docker
cd loadtest && docker compose up
```

---

## 🚢 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables on Vercel
Go to Project Settings → Environment Variables and add all variables from the table above.

### Database Migration
```bash
# Push schema to Neon
npx prisma db push

# Or run the SQL migrations
psql $DATABASE_URL < prisma/migrations/001_agent_system/migration.sql
psql $DATABASE_URL < prisma/migrations/002_org_team/migration.sql
```

---

## 🔒 Security

- **JWT** with 15-min access tokens + 30-day refresh tokens
- **Token blacklist** (DB-backed) for immediate revocation
- **Token family tracking** for stolen refresh token detection
- **RBAC** with 4 roles (Super Admin → Viewer)
- **Rate limiting** per-route (10/min for AI, 20/min for chat, 30/min for integrations)
- **Input guard** — detects 15+ prompt injection patterns
- **Output guard** — masks API keys, passwords, PII, PAN/Aadhaar in responses
- **Circuit breaker** — auto-blocks failing MCP APIs after 5 failures
- **CORS/CSP/HSTS** security headers
- **AES-256-GCM** encryption for stored credentials
- **Audit logging** on all mutations
- **Webhook HMAC verification** for Shiprocket, Shopify, FedEx
- **Feature flags** enforce plan-based access control

---

## 📄 License

Proprietary — © 2026 Lanework, Inc.

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Run tests (`npx vitest run`)
4. Commit (`git commit -m 'feat: amazing feature'`)
5. Push (`git push origin feature/amazing`)
6. Open a PR

---

## 📞 Support

- **Email:** support@lanework.in
- **Docs:** [docs.lanework.in](https://docs.lanework.in)
- **Issues:** [GitHub Issues](https://github.com/jjssmyhaks-dev/lanework-next/issues)
