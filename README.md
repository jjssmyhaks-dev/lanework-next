# Lanework — The Agentic Operating System for Logistics

Your logistics operation, **running itself.** Lanework is a team of 6 AI agents that track shipments, manage inventory, optimize routes, and handle the thousand small decisions your ops team makes every day — plugged into the systems you already use.

## Architecture

```
lanework-next/
├── src/                          # Next.js 16 frontend (App Router)
│   ├── app/
│   │   ├── (auth)/               # Login & Register
│   │   ├── (dashboard)/          # 11 pages: Dashboard, Shipments, Inventory, Routes,
│   │   │                         #   Warehouse, Fleet, Customers, Agents, Copilot, Integrations
│   │   ├── agents/               # 6 agent detail pages with trust controls
│   │   ├── api/                  # 40+ REST API endpoints
│   │   ├── docs/                 # Developer documentation
│   │   ├── pricing/              # Pricing page (4 tiers)
│   │   ├── how-it-works/         # How Lanework Works
│   │   ├── trust/                # Trust & Safety page
│   │   └── page.tsx              # Landing page with animated hero + interactive sections
│   │
│   ├── components/ui/            # Reusable UI components (Card, Button, Input, Badge, etc.)
│   └── lib/                      # Database, Auth, AI, Utils
│
├── mcp-servers/                  # 15 MCP servers with 58 tools
│   ├── shared/server.ts          # Base class (PostgreSQL, logging, config)
│   ├── shiprocket/               # §1  Carrier aggregator (7+ Indian carriers)
│   ├── tally/                    # §2  TallyPrime inventory/order sync
│   ├── ewaybill/                 # §3  GSTN e-way bill generation
│   ├── mapmyindia/               # §4  Route optimization + geocoding
│   ├── fleet/                    # §5  Telematics (LocoNav/FleetX/Vamosys)
│   ├── email/                    # §6  Customer emails (Resend SMTP)
│   ├── wms/                      # §7  Warehouse adapter
│   ├── scanner/                  # §8  Barcode/QR pick verification
│   ├── googlesheets/             # §9  Google Sheets 2-way sync
│   ├── weather/                  # §10 OpenWeatherMap route disruption alerts
│   ├── compliance/               # §11 RTO/Parivahan license + vehicle compliance
│   ├── erp/                      # §12 SAP B1 order/inventory/invoice sync
│   ├── shopify/                  # §13 Shopify + WooCommerce D2C order sync
│   ├── fedex/                    # §14 FedEx + DHL international shipping
│   └── dockscheduler/            # §15 Granular dock booking + carrier check-in/out
│
├── backend/                      # Python agent system (legacy — merged into Next.js)
├── scripts/                      # DB migration, debug, env import tools
├── vercel.json                   # Vercel deployment config
├── .env.example                  # Environment template
└── package.json
```

## Features

### Landing Page
- **Typewriter hero** — "Your logistics operation, *running itself.*" typed in real-time
- **Animated How It Works** — 3-card carousel with expand/collapse, auto-cycle every 4s
- **Nav dropdowns** — 5 sections (Product, Agents, How it Works, Pricing, Docs) with hover menus
- **5 standalone pages** — Docs, Pricing, How it Works, Trust & Safety, Integrations catalog

### Dashboard
- **Progressive onboarding** — New users see a 4-step guided wizard (Connect → Ship → Inventory → Configure)
- **Active dashboard** — Stats cards, quick actions, recent activity (shown only when data exists)
- **11 sidebar items** — Dashboard, Agents, Copilot, Setup, Shipments, Inventory, Routes, Warehouse, Fleet, Customers, Integrations

### AI Agents (6)
| Agent | Location | Key Capabilities |
|-------|----------|-----------------|
| Shipment Tracking | `/agents/shipment-tracking` | Multi-carrier tracking, delay prediction, webhooks, Shiprocket + FedEx/DHL |
| Inventory Management | `/agents/inventory-management` | Auto-reorder, demand forecasting, TallyPrime + Google Sheets + Shopify/WooCommerce |
| Route Optimization | `/agents/route-optimization` | Real-time rerouting, fuel savings, MapmyIndia + Weather disruption alerts |
| Warehouse Operations | `/agents/warehouse-operations` | Pick paths, dock scheduling, barcode scanning, carrier check-in/out |
| Fleet Management | `/agents/fleet-management` | Maintenance, GPS telematics, RTO compliance, driver license verification |
| Customer Communication | `/agents/customer-communication` | Auto-reply, WhatsApp, email, SAP B1 ERP sync |

### MCP Servers (15 total, 58 tools)
All servers extend `LaneworkMCPServer` with shared PostgreSQL logging, config loading, and webhook event tracking:

| # | Server | Agent | Tools |
|---|--------|-------|-------|
| 1 | **Shiprocket** | Shipment Tracking | `track_shipment`, `create_shipment`, `get_rates`, `cancel_shipment` |
| 2 | **TallyPrime** | Inventory | `sync_inventory`, `sync_orders`, `get_ledger`, `check_stock` |
| 3 | **E-Way Bill (GSTN)** | Shipment Tracking | `generate_ewaybill`, `cancel_ewaybill`, `get_ewaybill`, `validate_gstin` |
| 4 | **MapmyIndia** | Route Optimization | `geocode`, `reverse_geocode`, `optimize_route`, `distance_matrix` |
| 5 | **Fleet Telematics** | Fleet Management | `track_vehicle`, `get_fleet_status`, `schedule_maintenance`, `get_driver_report` |
| 6 | **Email (Resend)** | Customer Comms | `send_tracking_update`, `auto_reply`, `check_inbox` |
| 7 | **WMS** | Warehouse | `get_dock_schedule`, `assign_pick_task`, `check_inventory`, `receive_shipment` |
| 8 | **Scanner** | Warehouse | `verify_pick`, `receive_item`, `check_sku`, `generate_label` |
| 9 | **Google Sheets** | Inventory | `read_sheet`, `write_sheet`, `sync_to_db`, `sync_from_db` |
| 10 | **Weather** | Route Optimization | `current_weather`, `route_weather`, `weather_alerts`, `daily_forecast` |
| 11 | **Compliance (RTO)** | Fleet Management | `check_driver_license`, `check_vehicle_registration`, `check_challan`, `compliance_summary` |
| 12 | **ERP (SAP B1)** | Customer Comms | `sync_orders`, `push_inventory`, `get_business_partner`, `sync_invoices` |
| 13 | **Shopify/WooCommerce** | Inventory | `sync_orders_shopify`, `sync_orders_woo`, `sync_inventory`, `get_order_status` |
| 14 | **FedEx/DHL** | Shipment Tracking | `track_fedex`, `create_fedex_shipment`, `track_dhl`, `create_dhl_shipment` |
| 15 | **Dock Scheduler** | Warehouse | `book_dock`, `get_dock_availability`, `check_in_carrier`, `release_dock` |

### Shared Infrastructure (5 built-in MCPs)
| MCP | Implementation |
|-----|---------------|
| PostgreSQL | `LaneworkMCPServer` base class — all servers inherit direct DB access |
| Webhook Receiver | `/api/webhooks/inbound/[id]` + `/api/webhooks/whatsapp/[id]` |
| Cloudflare AI | `src/lib/ai.ts` — Llama 3 8B for reasoning, sentiment, classification |
| CSV/Excel | `/api/import/csv` + `/api/export/csv` |
| WhatsApp | `/api/webhooks/whatsapp/[id]` — Meta verification + message processing |

### Integrations Dashboard
- **17-catalog** across 3 tiers (Universal, India-Specific, Scale)
- **1-click connect/disconnect** from `/integrations`
- **Quick Setup card** for first-time users (top 4 integrations)
- **Search + tier filter** + real-time connected status

### API Endpoints (40+)

| Category | Endpoints |
|----------|----------|
| **Auth** | `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/forgot-password` |
| **Dashboard** | `/api/dashboard/stats` |
| **AI** | `/api/ai` (GET + POST — Cloudflare Workers AI) |
| **Shipments** | `/api/shipment`, `/api/shipment/[id]` |
| **Inventory** | `/api/inventory/[id]` |
| **Routes** | `/api/routes`, `/api/routes/[id]` |
| **Warehouse** | `/api/warehouse/[id]` |
| **Fleet** | `/api/fleet/drivers/[id]`, `/api/fleet/vehicles/[id]` |
| **Customers** | `/api/customer`, `/api/customer/[id]` |
| **Integrations** | `/api/integrations` (catalog + connect), `/api/integrations/[id]` (manage) |
| **Webhooks** | `/api/webhooks/inbound/[id]`, `/api/webhooks/whatsapp/[id]` |
| **Import/Export** | `/api/import/csv`, `/api/export/csv` |
| **Evals** | `/api/eval` |
| **Onboarding** | `/api/onboarding` |
| **DB** | `/api/db/init` |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Next.js API Routes (serverless) |
| Auth | Custom JWT (`jose`) — cookie-based sessions |
| Database | Neon PostgreSQL (serverless, 35+ tables) |
| AI | Cloudflare Workers AI (Llama 3 8B) |
| Agent Framework | MCP (Model Context Protocol) — 15 servers |
| Hosting | Vercel (bom1 region) |
| Icons | Lucide React |

## Getting Started

### Prerequisites
- Node.js 18+
- Neon PostgreSQL database
- Cloudflare Workers AI account (optional, for AI features)

### Setup

```bash
cd lanework-next
npm install
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="***"
NEXTAUTH_URL="http://localhost:3000"
CLOUDFLARE_AI_ACCOUNT_ID="..."
CLOUDFLARE_AI_API_KEY="***"
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Register an account, and the dashboard will guide you through onboarding.

### Database Setup

Visit `/api/db/init` in your browser or run:

```bash
curl http://localhost:3000/api/db/init
```

This creates all 35+ tables — users, shipments, inventory, routes, warehouse, fleet, customers, integrations, webhooks, webhook_events, agent_tasks, audit_logs, and more.

### Vercel Deployment

```bash
# Link project (one-time)
npx vercel link

# Set environment variables
npx vercel env add DATABASE_URL production
npx vercel env add NEXTAUTH_SECRET production
npx vercel env add NEXTAUTH_URL production
npx vercel env add CLOUDFLARE_AI_ACCOUNT_ID production
npx vercel env add CLOUDFLARE_AI_API_KEY production

# Deploy
npx vercel --prod --yes
```

## Environment Variables

| Key | Required | Description |
|-----|----------|-------------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | JWT signing secret (generate: `openssl rand -hex 32`) |
| `NEXTAUTH_URL` | ✅ | App URL (`https://lanework.vercel.app` in production) |
| `CLOUDFLARE_AI_ACCOUNT_ID` | — | Cloudflare Workers AI account |
| `CLOUDFLARE_AI_API_KEY` | — | Cloudflare Workers AI API key |
| `SHIPROCKET_EMAIL` | — | Shiprocket login |
| `SHIPROCKET_PASSWORD` | — | Shiprocket password |
| `TALLY_REST_URL` | — | TallyPrime REST API URL |
| `GSTN_API_KEY` | — | GSTN e-way bill API key |
| `MAPMYINDIA_API_KEY` | — | MapmyIndia API key |
| `FLEET_API_KEY` | — | Fleet telematics API key |
| `OPENWEATHER_API_KEY` | — | OpenWeatherMap API key |
| `PARIVAHAN_API_KEY` | — | RTO/Parivahan API key |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | — | Google Sheets service account JSON |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | — | Default spreadsheet ID |
| `SAP_SERVICE_LAYER_URL` | — | SAP B1 Service Layer URL |
| `SHOPIFY_STORE_URL` / `SHOPIFY_ACCESS_TOKEN` | — | Shopify credentials |
| `WOO_STORE_URL` / `WOO_CONSUMER_KEY` | — | WooCommerce credentials |
| `FEDEX_API_KEY` / `FEDEX_SECRET_KEY` | — | FedEx API credentials |
| `DHL_API_KEY` / `DHL_ACCOUNT_NUMBER` | — | DHL API credentials |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | — | Email (Resend) SMTP |

## Rollback Strategy

- Git tags created before major changes: `git tag v1.0.0`
- Incremental commits per module make isolation easy
- To rollback: `git checkout v0.9.0` or `git revert <commit-hash>`
- Database schema is additive (no destructive migrations)
- Vercel: redeploy any previous deployment from the dashboard

## License

Proprietary — All rights reserved.
