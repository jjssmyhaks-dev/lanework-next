# 🚛 Lanework

> AI-powered logistics platform for Indian MSMEs — track shipments, manage inventory, optimize routes, and automate operations through natural language chat. No technical skills required.

**Live:** [lanework-next-delta.vercel.app](https://lanework-next-delta.vercel.app)
**Stack:** Next.js 16 · React 19 · Neon PostgreSQL · Cloudflare Workers AI · MCP Protocol

---

## 🎯 What Lanework Does

| Feature | Description |
|---------|-------------|
| **AI Chat** | Natural language interface — "Where's shipment #4521?" triggers real MCP tool calls |
| **15 MCP Integrations** | Shiprocket, FedEx, TallyPrime, Shopify, MapmyIndia, Weather, ERP, and more |
| **Autonomous Agents** | Background pollers monitor shipments (5min), inventory (30min), fleet (10min), compliance (daily) |
| **Self-Learning** | Agents learn from feedback, adjust risk scores, improve accuracy over time |
| **Team Management** | Multi-tenant orgs with RBAC (Super Admin → Viewer), email invites |
| **Indian Pricing** | ₹0/₹999/₹2,999/₹7,999 per month + GST, 75%+ gross margin |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                    Frontend                       │
│  Next.js 16 (Turbopack) · React 19 · Tailwind   │
│  43 pages · 24 components · Chat-first UI        │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                 API Layer                         │
│  60 REST routes · JWT auth · Zod validation       │
│  Rate limiting · Audit logging · Sentry           │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              AI & Agent System                    │
│  Chat Orchestrator · Intent Detection             │
│  5 Background Pollers · Workflow Engine           │
│  Trust System · Approval Queue · Learning Engine  │
│  Guardrails (input/output/cost/circuit breaker)   │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│           15 MCP Servers (58 tools)               │
│  Shiprocket · TallyPrime · E-Way Bill · FedEx    │
│  Shopify · WooCommerce · MapmyIndia · Weather     │
│  Google Sheets · ERP (SAP B1) · WMS · Scanner    │
│  Compliance · Dock Scheduler · Fleet              │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              Data Layer                           │
│  Neon PostgreSQL (34+ tables) · Prisma ORM       │
│  AES-256-GCM credential encryption                │
└─────────────────────────────────────────────────┘
```

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

Fill in the required variables (see [Environment Variables](#environment-variables) below).

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

### AI (Cloudflare Workers AI)
| Variable | Description | How to get |
|----------|-------------|------------|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | [dash.cloudflare.com](https://dash.cloudflare.com) → Right sidebar |
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

### Optional
| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Sentry error tracking |
| `NEXT_PUBLIC_APP_URL` | Your production URL (for invites) |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, Register, Forgot/Reset Password, Join (invites)
│   ├── (dashboard)/         # All dashboard pages (protected)
│   │   ├── chat/            # AI Chat interface (primary)
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
│   │   ├── pricing/         # Pricing plans
│   │   ├── billing/         # Billing & invoices
│   │   ├── terms/           # Terms of Service
│   │   └── privacy/         # Privacy Policy
│   ├── api/                 # 60 REST API routes
│   │   ├── auth/            # Login, Register, Refresh, Forgot/Reset Password
│   │   ├── chat/            # Chat orchestrator + history
│   │   ├── agents/          # Agent APIs (cron, alerts, approvals, metrics, harness)
│   │   ├── org/             # Organisation, members, invites
│   │   ├── shipment/        # Shipment CRUD
│   │   ├── inventory/       # Inventory CRUD
│   │   ├── fleet/           # Fleet CRUD
│   │   ├── billing/         # Razorpay checkout + verification
│   │   └── ...
│   ├── agents/              # Agent detail pages (6 agents)
│   └── page.tsx             # Landing page
├── components/ui/           # 24 React components
│   ├── chat/                # Message bubble, tool cards, quick actions
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
│   │   └── ...
│   ├── guardrails/          # Input guard, output guard, cost guard, circuit breaker
│   ├── security/            # Webhook verification, audit events
│   ├── auth.ts              # JWT auth with refresh tokens
│   ├── org.ts               # Organisation & RBAC
│   ├── permissions.ts       # Permission definitions
│   ├── pricing.ts           # Plan definitions, cost breakdown, margins
│   ├── cache.ts             # In-memory TTL cache
│   └── ...
mcp-servers/                 # 15 MCP servers, 58 tools
test/                        # 5 test files, 52 tests
loadtest/                    # k6 load test suites
prisma/                      # Database schema + migrations
```

---

## 🤖 AI Agent System

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

### Self-Learning Loop
```
User Feedback (thumbs up/down)
    ↓
Learning Engine analyzes patterns
    ↓
Adaptive Risk adjusts scores
    ↓
Auto-Tuner applies high-confidence changes
    ↓
Harness detects regressions
    ↓
Dashboard shows improvement trends
```

---

## 💰 Pricing & Cost Model

| Plan | Price/mo | AI Chats | Shipments | Team | Gross Margin |
|------|----------|----------|-----------|------|-------------|
| **Free Trial** | ₹0 | 10/day | 20/mo | 1 | — |
| **Starter** | ₹999 | 200/day | 500/mo | 3 | 97.9% |
| **Growth** | ₹2,999 | Unlimited | 5,000/mo | 10 | 97.9% |
| **Enterprise** | ₹7,999 | Unlimited | Unlimited | 50 | 97.3% |

**AI Cost:** ~₹0.005 per conversation (Cloudflare Workers AI — Llama 3 8B)

---

## 🧪 Testing

```bash
# Unit tests
npx vitest run

# Type checking
npx tsc --noEmit

# Load testing
k6 run loadtest/k6-api.js
k6 run loadtest/k6-login.js
k6 run loadtest/k6-chat.js
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
- **Rate limiting** per-route (10/min for AI, 30/min for integrations)
- **Input guard** — detects 15+ prompt injection patterns
- **Output guard** — masks API keys, passwords, PII in responses
- **Circuit breaker** — auto-blocks failing MCP APIs after 5 failures
- **CORS/CSP/HSTS** security headers
- **AES-256-GCM** encryption for stored credentials
- **Audit logging** on all mutations

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
