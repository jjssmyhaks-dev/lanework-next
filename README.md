# Lanework — Your Logistics Assistant

**No technical skills required.** Lanework is a smart assistant that handles your daily logistics — tracking packages, managing inventory, planning routes, and keeping customers updated. All from one website.

👉 **New user?** Read [User Guide](docs/USER-GUIDE.md) — step-by-step in plain English.  
👉 **Setting up for a team?** Read [Deployment Guide](docs/DEPLOYMENT.md).

---

## What Can Lanework Do?

- 🔍 **Track packages** across 7+ Indian carriers (BlueDart, Delhivery, DTDC, and more)
- 📦 **Manage inventory** — know what's in stock, what needs reordering
- 🗺️ **Plan delivery routes** — fastest path with real-time traffic
- 📱 **Send WhatsApp updates** — automatically notify customers about their deliveries
- 🚛 **Track vehicles** — GPS location, maintenance alerts, driver hours
- 🧾 **Generate e-way bills** — GST compliant, directly from shipment data
- 📊 **Connect your tools** — Shiprocket, TallyPrime, Shopify, Google Sheets, and more

---

## Quick Start (2 Minutes)

### What You Need
1. A computer with internet
2. A Neon database account (free — sign up at [neon.tech](https://neon.tech))
3. Node.js installed (if running locally)

### Deploy on Vercel (Easiest)
```
Click "Deploy" → Connect GitHub → Add DATABASE_URL and NEXTAUTH_SECRET → Done.
```

### Run Locally
```bash
git clone https://github.com/jjssmyhaks-dev/lanework-next.git
cd lanework-next
npm install
cp .env.example .env.local
# Edit .env.local — at minimum add DATABASE_URL and NEXTAUTH_SECRET
npm run dev
```
Open http://localhost:3000 → Register → Start using.

---

## Architecture

```
lanework-next/
├── src/                          # Next.js 16 frontend (App Router)
│   ├── app/
│   │   ├── (auth)/               # Login & Register
│   │   ├── (dashboard)/          # Dashboard, Shipments, Inventory, Routes, Warehouse, Fleet, Customers, Integrations
│   │   ├── agents/               # 6 AI agent detail pages
│   │   ├── api/                  # 40+ REST API endpoints
│   │   └── docs/                 # User guide & deployment docs
│   ├── components/ui/            # Reusable UI components
│   └── lib/                      # Database, Auth, AI utilities
│
├── mcp-servers/                  # 15 MCP servers (58 tools)
│   ├── shared/server.ts          # Base class — PostgreSQL, safe API calls, graceful fallback
│   ├── shiprocket/               # Indian carrier aggregator
│   ├── tally/                    # TallyPrime accounting sync
│   ├── ewaybill/                 # GSTN e-way bills
│   ├── mapmyindia/               # Route optimization + geocoding
│   ├── fleet/                    # Vehicle telematics
│   ├── fedex/                    # International shipping
│   ├── shopify/                  # D2C order sync
│   ├── erp/                      # SAP B1 integration
│   ├── compliance/               # RTO/Parivahan checks
│   ├── email/                    # Customer emails
│   ├── wms/                      # Warehouse management
│   ├── googlesheets/             # Google Sheets 2-way sync
│   ├── weather/                  # Route weather alerts
│   ├── dockscheduler/            # Dock slot management
│   └── scanner/                  # Barcode/QR scanning
│
├── docs/                         # User Guide + Deployment Guide
├── audit/                        # Production readiness audit report
├── .env.example                  # All environment variables documented
└── package.json
```

## MCP Servers — 15 Integrations, 58 Tools

All MCP servers extend `LaneworkMCPServer` with graceful fallback: when an external API is unreachable or missing credentials, they automatically fall back to database-cached data instead of crashing.

| Server | What It Does | Tools |
|--------|-------------|-------|
| **Shiprocket** | Ship across India via 7+ carriers | track, create, compare rates, cancel |
| **TallyPrime** | Sync with Indian accounting software | sync inventory, push orders, check ledger |
| **E-Way Bill** | Generate GST e-way bills | generate, cancel, validate GSTIN |
| **MapmyIndia** | Indian maps & route planning | geocode, optimize route, distance matrix |
| **Fleet** | Vehicle tracking & maintenance | track, status, alerts, driver reports |
| **FedEx/DHL** | International shipping | track, create shipment, cancel |
| **Shopify/WooCommerce** | D2C store order sync | sync orders, sync inventory |
| **ERP (SAP B1)** | Enterprise resource planning | sync orders, push inventory, invoices |
| **Compliance** | Vehicle & driver legal checks | license check, registration, insurance |
| **Email** | Customer notifications | send tracking, auto-reply |
| **WMS** | Warehouse management | scan in/out, bin lookup, pick tasks |
| **Google Sheets** | Spreadsheet sync | read, write, 2-way sync |
| **Weather** | Route disruption alerts | current weather, route weather, alerts |
| **Dock Scheduler** | Dock slot booking | allocate, release, check availability |
| **Scanner** | Barcode/QR verification | scan, lookup, verify pick |

**Key feature:** Every MCP returns a `mode` field — `"live"` (real API call), `"simulated"` (API keys missing), or `"db-fallback"` (using database cache). Users always see results, never errors.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Next.js API Routes (serverless) |
| Auth | Custom JWT (`jose`) — cookie-based |
| Database | Neon PostgreSQL (35+ tables) |
| AI | Cloudflare Workers AI (Llama 3 8B) |
| Agent Framework | MCP (Model Context Protocol) — 15 servers |
| Hosting | Vercel |
| Icons | Lucide React |

## Documentation

| Document | Audience | Content |
|----------|----------|---------|
| [User Guide](docs/USER-GUIDE.md) | Non-technical users | Step-by-step: sign up, connect tools, common tasks, troubleshooting |
| [Deployment Guide](docs/DEPLOYMENT.md) | Operators / DevOps | Vercel deploy, env vars, health checks, rollback, monitoring |
| [Audit Report](audit/production-readiness.md) | Developers | Hardcoded values found, broken features fixed, MCP status |
| [.env.example](.env.example) | Everyone | All 50+ environment variables with descriptions |

## Environment Variables

See [.env.example](.env.example) for the complete list. At minimum:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection |
| `NEXTAUTH_SECRET` | ✅ | Session encryption (generate: `openssl rand -hex 32`) |
| `NEXTAUTH_URL` | ✅ | Your app URL |

All other variables are optional — the app works without them, falling back to database-cached data.

## License

Proprietary — All rights reserved.
