# Lanework — Logistics Assistant for Indian MSMEs

**No technical skills required.** Lanework is a smart assistant that handles your daily logistics — tracking packages, managing inventory, planning routes, and keeping customers updated. All from one chat-based interface.

> 15 MCP integrations · 58 tools · 34 database tables · Chat-first interface · Real API + simulated fallback

👉 **New user?** Read [User Guide](docs/USER-GUIDE.md) — step-by-step in plain English.
👉 **Setting up for a team?** Read [Deployment Guide](docs/DEPLOYMENT.md).

---

## What Can Lanework Do?

- 🔍 **Track packages** across 7+ Indian carriers (BlueDart, Delhivery, DTDC, and more)
- 💬 **Chat-first interface** — ask questions in natural language, get answers with live data
- 📦 **Manage inventory** — know what's in stock, what needs reordering
- 🗺️ **Plan delivery routes** — fastest path with real-time traffic and weather
- 📱 **Send WhatsApp updates** — automatically notify customers about their deliveries
- 🚛 **Track vehicles** — GPS location, maintenance alerts, driver hours
- 🧾 **Generate e-way bills** — GST compliant, directly from shipment data
- 📊 **Connect your tools** — Shiprocket, TallyPrime, Shopify, Google Sheets, and more

---

## Quick Start (2 Minutes)

### Prerequisites

1. A [GitHub](https://github.com) account
2. A [Vercel](https://vercel.com) account (free tier works)
3. A [Neon](https://neon.tech) database (free — 0.5 GB storage)

### Option A: Deploy to Vercel (Recommended)

```bash
# 1. Fork the repo
# Go to https://github.com/jjssmyhaks-dev/lanework-next → Click "Fork"

# 2. Deploy on Vercel
# Go to https://vercel.com/new → Import your forked repo

# 3. Add environment variables (see Environment Variables section below)
# At minimum: DATABASE_URL + NEXTAUTH_SECRET + NEXTAUTH_URL

# 4. Deploy — Vercel auto-runs `prisma db push` on first deploy
# Your app is live at https://your-app.vercel.app
```

### Option B: Run Locally

```bash
# 1. Clone and install
git clone https://github.com/jjssmyhaks-dev/lanework-next.git
cd lanework-next
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local — at minimum add DATABASE_URL and NEXTAUTH_SECRET

# 3. Initialize database
npx prisma db push

# 4. Start development server
npm run dev
```

Open **http://localhost:3000** → Register → Start using.

---

## Environment Variables

### Required (app won't start without these)

| Variable | How to get |
|----------|-----------|
| `DATABASE_URL` | [Neon](https://neon.tech) → Create project → Copy connection string (PostgreSQL) |
| `NEXTAUTH_SECRET` | Run `openssl rand -hex 32` in terminal |
| `NEXTAUTH_URL` | Your app URL: `http://localhost:3000` (local) or `https://your-app.vercel.app` (production) |

### Optional — Enable Live Integrations

Add these to unlock real API data instead of simulated responses. The app works perfectly without them.

#### Shipping & Tracking

| Variable | Service | How to get |
|----------|---------|-----------|
| `SHIPROCKET_EMAIL` | [Shiprocket](https://shiprocket.in) | Sign up → Settings → API → use your login email |
| `SHIPROCKET_PASSWORD` | Shiprocket | Your Shiprocket login password |
| `FEDEX_API_KEY` | [FedEx Developer](https://developer.fedex.com) | Create app → Get API key |
| `FEDEX_API_SECRET` | FedEx Developer | Same app → Get API secret |

#### Maps & Weather

| Variable | Service | How to get |
|----------|---------|-----------|
| `OPENWEATHER_API_KEY` | [OpenWeatherMap](https://openweathermap.org/api) | Sign up → API keys → Copy key (free tier: 1,000 calls/day) |
| `MAPMYINDIA_API_KEY` | [MapmyIndia](https://mapmyindia.com/api) | Register → Get API key |
| `MAPMYINDIA_LICENSE_KEY` | MapmyIndia | Same dashboard → License key |

#### E-Commerce

| Variable | Service | How to get |
|----------|---------|-----------|
| `SHOPIFY_STORE_URL` | [Shopify](https://shopify.com) | Your store URL: `https://your-store.myshopify.com` |
| `SHOPIFY_ACCESS_TOKEN` | Shopify Admin | Settings → Apps → Develop apps → Create app → Admin API access token |
| `WOOCOMMERCE_URL` | [WooCommerce](https://woocommerce.com) | Your store URL |
| `WOOCOMMERCE_CONSUMER_KEY` | WooCommerce | WooCommerce → Settings → Advanced → REST API → Create key |
| `WOOCOMMERCE_CONSUMER_SECRET` | WooCommerce | Same key → Copy secret |

#### Accounting & Compliance

| Variable | Service | How to get |
|----------|---------|-----------|
| `TALLY_REST_URL` | TallyPrime | Tally → Help → Settings → Enable REST API (default: `http://localhost:9000`) |
| `GSTN_API_KEY` | [GSTN API](https://docs.gst.gov.in) | Register as GST Suvidha Provider → Get API key |
| `GSTN_USERNAME` | GSTN API | Your GSTN portal username |
| `GSTN_PASSWORD` | GSTN API | Your GSTN portal password |

#### AI & Search

| Variable | Service | How to get |
|----------|---------|-----------|
| `CLOUDFLARE_AI_ACCOUNT_ID` | [Cloudflare](https://dash.cloudflare.com) | Dashboard → Workers & Pages → Account ID |
| `CLOUDFLARE_AI_API_KEY` | Cloudflare | My Profile → API Tokens → Create token |
| `GOOGLE_SHEETS_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) | APIs & Services → Credentials → Create API key |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Google Sheets | Open your sheet → copy the long ID from the URL between `/d/` and `/edit` |

#### ERP & Fleet

| Variable | Service | How to get |
|----------|---------|-----------|
| `SAP_SERVICE_LAYER_URL` | SAP Business One | Your SAP Service Layer URL |
| `SAP_USERNAME` | SAP B1 | SAP login username |
| `SAP_PASSWORD` | SAP B1 | SAP login password |
| `FLEET_API_KEY` | [LocoNav](https://loconav.com) / [FleetX](https://fleetx.io) | Register → Get API key |

#### Communication

| Variable | Service | How to get |
|----------|---------|-----------|
| `SMTP_HOST` | Any SMTP provider | SMTP server address (e.g., `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP | Port (usually `587` or `465`) |
| `SMTP_USER` | SMTP | Your email address |
| `SMTP_PASS` | SMTP | App password (not your login password) |
| `WHATSAPP_PHONE_NUMBER_ID` | [WhatsApp Business API](https://developers.facebook.com) | Meta Business → WhatsApp → Phone Number ID |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Business API | Same dashboard → Permanent access token |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Lanework Architecture                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Chat UI     │    │  Dashboard   │    │  Agent Pages  │       │
│  │  (Primary)   │    │  (Secondary) │    │  (6 agents)  │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                    │                │
│         └───────────┬───────┴────────────────────┘               │
│                     │                                            │
│              ┌──────▼───────┐                                    │
│              │  Chat        │                                    │
│              │  Orchestrator│  ← Intent detection + tool routing │
│              └──────┬───────┘                                    │
│                     │                                            │
│         ┌───────────▼───────────┐                                │
│         │   15 MCP Servers      │                                │
│         │   58 Tools            │                                │
│         │   (live/db/simulated) │                                │
│         └───────────┬───────────┘                                │
│                     │                                            │
│    ┌────────────────┼────────────────┐                           │
│    │                │                │                           │
│  ┌─▼──┐  ┌────────▼────────┐  ┌───▼───┐                       │
│  │ API │  │  External APIs  │  │ Neon  │                       │
│  │Keys │  │  (15 services)  │  │  DB   │                       │
│  └─────┘  └─────────────────┘  └───────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
lanework-next/
├── src/
│   ├── app/
│   │   ├── (auth)/               # Login & Register pages
│   │   ├── (dashboard)/          # Main app: Chat, Dashboard, Shipments, Inventory,
│   │   │   ├── chat/             #   Routes, Warehouse, Fleet, Customers, Integrations
│   │   │   ├── dashboard/        #   Dashboard with animated stats & activity feed
│   │   │   ├── shipment/         #   Shipment tracking & management
│   │   │   ├── inventory/        #   Stock levels with visual progress bars
│   │   │   ├── routes/           #   Route planning & optimization
│   │   │   ├── warehouse/        #   Dock scheduling & task management
│   │   │   ├── fleet/            #   Vehicle & driver management
│   │   │   ├── customer/         #   Customer communications
│   │   │   └── integrations/     #   Connect/disconnect external tools
│   │   ├── agents/               # 6 AI agent detail pages (live activity)
│   │   └── api/                  # 40+ REST API endpoints
│   ├── components/ui/            # Reusable UI: Toast, PageHeader, EmptyState, etc.
│   └── lib/
│       ├── auth.ts               # JWT with refresh tokens, blacklist, theft detection
│       ├── rate-limit.ts         # Per-route rate limiting
│       ├── chat/orchestrator.ts  # Chat intent detection + MCP tool routing
│       ├── intent-detection.ts   # NL → structured intent parser
│       ├── mcp/index.ts          # MCP adapter (58 tools wired to 15 servers)
│       ├── validations.ts        # Zod schemas for all mutation endpoints
│       └── sentry.ts             # Error monitoring
│
├── mcp-servers/                  # 15 standalone MCP servers
│   ├── shared/server.ts          # Base class (PostgreSQL, API calls, fallback)
│   ├── shiprocket/               # Indian carrier aggregator
│   ├── tally/                    # TallyPrime accounting sync
│   ├── ewaybill/                 # GSTN e-way bills
│   ├── mapmyindia/               # Indian maps & route optimization
│   ├── fleet/                    # Vehicle telematics
│   ├── fedex/                    # International shipping (FedEx + DHL)
│   ├── shopify/                  # D2C order sync (Shopify + WooCommerce)
│   ├── erp/                      # SAP Business One
│   ├── compliance/               # RTO/Parivahan checks
│   ├── email/                    # Customer notifications
│   ├── wms/                      # Warehouse management
│   ├── googlesheets/             # Google Sheets 2-way sync
│   ├── weather/                  # Route weather alerts (OpenWeatherMap)
│   ├── dockscheduler/            # Dock slot management
│   └── scanner/                  # Barcode/QR scanning
│
├── prisma/schema.prisma          # 34-table database schema
├── test/                         # Vitest unit + integration tests
└── docs/                         # User Guide + Deployment Guide
```

---

## MCP Servers — 15 Integrations, 58 Tools

All MCP servers extend `LaneworkMCPServer` with graceful fallback: when an external API is unreachable or missing credentials, they automatically fall back to database-cached data instead of crashing.

**Key feature:** Every MCP returns a `mode` field:
- 🟢 **`"live"`** — Real API call succeeded
- 🔵 **`"db-fallback"`** — Using cached database data
- 🟡 **`"simulated"`** — Demo mode (API keys not configured)

| Server | What It Does | API Keys Needed | Tools |
|--------|-------------|----------------|-------|
| **Shiprocket** | Ship across India via 7+ carriers | `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD` | track, create, compare rates, cancel, label |
| **TallyPrime** | Sync with Indian accounting software | `TALLY_REST_URL` | sync inventory, push orders, check ledger, check stock |
| **E-Way Bill** | Generate GST e-way bills | `GSTN_API_KEY`, `GSTN_USERNAME`, `GSTN_PASSWORD` | generate, cancel, validate GSTIN |
| **MapmyIndia** | Indian maps & route planning | `MAPMYINDIA_API_KEY`, `MAPMYINDIA_LICENSE_KEY` | geocode, optimize route, distance matrix |
| **Fleet** | Vehicle tracking & maintenance | `FLEET_API_KEY` | track, status, alerts, driver reports |
| **FedEx/DHL** | International shipping | `FEDEX_API_KEY`, `FEDEX_API_SECRET` | track, create shipment, cancel |
| **Shopify/WooCommerce** | D2C store order sync | `SHOPIFY_*`, `WOOCOMMERCE_*` | sync orders, sync inventory |
| **ERP (SAP B1)** | Enterprise resource planning | `SAP_*` | sync orders, push inventory, invoices |
| **Compliance** | Vehicle & driver legal checks | `PARIVAHAN_API_KEY` | license check, registration, insurance |
| **Email** | Customer notifications | `SMTP_*` | send tracking, auto-reply, inbox scan |
| **WMS** | Warehouse management | `WMS_API_URL`, `WMS_API_KEY` | scan in/out, bin lookup, pick tasks |
| **Google Sheets** | Spreadsheet sync | `GOOGLE_SHEETS_API_KEY` | read, write, 2-way sync |
| **Weather** | Route disruption alerts | `OPENWEATHER_API_KEY` | current weather, route weather, alerts |
| **Dock Scheduler** | Dock slot booking | *(database only)* | allocate, release, check availability |
| **Scanner** | Barcode/QR verification | *(database only)* | scan, lookup, verify pick |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4, Lucide icons |
| Backend | Next.js API Routes (serverless) |
| Auth | JWT (`jose`) with refresh tokens, token family rotation, blacklist |
| Database | Neon PostgreSQL (34 tables) + Prisma ORM |
| AI | Cloudflare Workers AI (Llama 3 8B) |
| Agent Framework | MCP (Model Context Protocol) — 15 servers, 58 tools |
| Search | PostgreSQL full-text (`tsvector`/`tsquery`), `⌘K` global search |
| Validation | Zod v4 schemas on all mutation endpoints |
| Testing | Vitest — 52 tests, 80% coverage threshold |
| CI/CD | GitHub Actions → Vercel |
| Monitoring | Sentry SDK |
| Hosting | Vercel (serverless) |

---

## Production Readiness

### ✅ What's Done

| Feature | Status | Details |
|---------|--------|---------|
| JWT Auth | ✅ | Refresh tokens, token family theft detection, blacklist, logout-everywhere |
| Rate Limiting | ✅ | Per-route: `/api/ai` 10/min, `/api/integrations` 30/min, `/api/chat` 20/min |
| Input Validation | ✅ | Zod v4 schemas on all POST routes (shipment, customer, inventory, warehouse, routes, fleet, integrations, CSV, search) |
| Error Boundaries | ✅ | React ErrorBoundary on dashboard layout + chat page |
| Error Monitoring | ✅ | Sentry SDK with source maps |
| Type Safety | ✅ | Full TypeScript — 0 errors, strict mode |
| Test Suite | ✅ | 52 passing tests (unit + integration) |
| Graceful Degradation | ✅ | All 15 MCPs return simulated data when APIs unavailable — app never crashes |
| Chat History | ✅ | Server-side persistence (GET/POST/DELETE with auth) |
| Chat Orchestrator | ✅ | Intent detection for 20+ intents across all 15 integrations |
| Full-Text Search | ✅ | PostgreSQL tsvector across shipments, inventory, customers |

### ⚠️ Gaps to Address Before Scaling

| Priority | Gap | Impact | Effort |
|----------|-----|--------|--------|
| **P1** | No CORS configuration | Any origin can call your API | 30 min |
| **P1** | No CSP/security headers | XSS vulnerability | 1 hr |
| **P1** | Token blacklist in-memory | Cold starts lose blacklist | 2 hrs |
| **P2** | No pagination on list endpoints | Slow with large datasets | 2 hrs |
| **P2** | No request body size limits | DoS via large payloads | 30 min |
| **P2** | No structured logging | Hard to debug production issues | 2 hrs |
| **P2** | `prisma db push` instead of `migrate` | Schema changes not version-controlled | 1 hr |
| **P3** | No OpenAPI/Swagger spec | Hard for third-party integrators | 4 hrs |
| **P3** | No CSRF protection | Vulnerable to cross-site requests | 2 hrs |
| **P3** | No frontend form validation | Bad UX on validation errors | 3 hrs |
| **P3** | No SEO meta tags | Poor discoverability | 1 hr |
| **P3** | No image optimization | Slow page loads | 1 hr |
| **P3** | No i18n (Hindi/regional) | Limited accessibility | 1 day |

---

## Documentation

| Document | Audience | Content |
|----------|----------|---------|
| [User Guide](docs/USER-GUIDE.md) | Non-technical users | Step-by-step: sign up, connect tools, common tasks, troubleshooting |
| [Deployment Guide](docs/DEPLOYMENT.md) | Operators / DevOps | Vercel deploy, env vars, health checks, rollback, monitoring |
| [Production Audit](audit/production-readiness.md) | Developers | Full audit: hardcoded values, broken features, MCP status |

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run typecheck: `npx tsc --noEmit`
6. Commit: `git commit -m "feat: description"`
7. Push: `git push origin feat/my-feature`
8. Open a Pull Request

---

## License

Proprietary — All rights reserved.
