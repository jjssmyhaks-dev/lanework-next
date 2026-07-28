# Lanework — The Agentic Operating System for Logistics

Your logistics operation, **running itself.** Lanework is a team of 6 AI agents that track shipments, manage inventory, optimize routes, and handle the thousand small decisions your ops team makes every day — plugged into the systems you already use.

## Architecture

```
lanework-next/
├── src/                          # Next.js 16 frontend (App Router)
│   ├── app/
│   │   ├── (auth)/               # Login & Register
│   │   ├── (dashboard)/          # 10 pages: Dashboard, Shipments, Inventory, Routes,
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
├── mcp-servers/                  # 8 MCP servers for agent tooling
│   ├── shared/server.ts          # Base class (PostgreSQL, logging, config)
│   ├── shiprocket/               # §1 Carrier aggregator (7+ Indian carriers)
│   ├── tally/                    # §2 TallyPrime inventory/order sync
│   ├── ewaybill/                 # §3 GSTN e-way bill generation
│   ├── mapmyindia/               # §4 Route optimization + geocoding
│   ├── fleet/                    # §5 Telematics (LocoNav/FleetX/Vamosys)
│   ├── email/                    # §6 Customer emails (Resend SMTP)
│   ├── wms/                      # §7 Warehouse adapter
│   └── scanner/                  # §8 Barcode/QR pick verification
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
- **4 standalone pages** — Docs, Pricing, How it Works, Trust & Safety

### Dashboard
- **Progressive onboarding** — New users see a 4-step guided wizard (Connect → Ship → Inventory → Configure)
- **Active dashboard** — Stats cards, quick actions, recent activity (shown only when data exists)
- **11 sidebar items** — Dashboard, Agents, Copilot, Setup, Shipments, Inventory, Routes, Warehouse, Fleet, Customers, Integrations

### AI Agents (6)
| Agent | Location | Key Capabilities |
|-------|----------|-----------------|
| Shipment Tracking | `/agents/shipment-tracking` | Multi-carrier tracking, delay prediction, webhooks |
| Inventory Management | `/agents/inventory-management` | Auto-reorder, demand forecasting, Tally sync |
| Route Optimization | `/agents/route-optimization` | Real-time rerouting, fuel savings, MapmyIndia |
| Warehouse Operations | `/agents/warehouse-operations` | Pick paths, dock scheduling, barcode scanning |
| Fleet Management | `/agents/fleet-management` | Maintenance, compliance, GPS telematics |
| Customer Communication | `/agents/customer-communication` | Auto-reply, WhatsApp, email, sentiment routing |

### Integrations (17 total, 3 tiers)

| Tier | Integrations |
|------|-------------|
| **Universal** | CSV Import/Export, WhatsApp Business API, Google Sheets Sync, Generic Webhook (✅ built) |
| **India-Specific** | Shiprocket, TallyPrime, GSTN e-Way Bill, Razorpay |
| **Scale** | SAP B1, MapmyIndia, Shopify, WooCommerce, Amazon Seller, Flipkart Seller, LocoNav, FleetX |

- **1-click connect/disconnect** from `/integrations` dashboard
- **Quick Setup card** for first-time users (top 4 integrations)
- **Search + filter** by tier
- **Real-time status** (connected pulse + green dot)

### MCP Servers (8)
All servers extend `LaneworkMCPServer` with shared PostgreSQL logging, config loading, and webhook event tracking:

| Server | Agent | Tools |
|--------|-------|-------|
| **Shiprocket** | Shipment Tracking | `track_shipment`, `create_shipment`, `get_rates`, `cancel_shipment` |
| **TallyPrime** | Inventory | `sync_inventory`, `sync_orders`, `get_ledger`, `check_stock` |
| **E-Way Bill** | Shipment Tracking | `generate_ewaybill`, `cancel_ewaybill`, `get_ewaybill`, `validate_gstin` |
| **MapmyIndia** | Route Optimization | `geocode`, `reverse_geocode`, `optimize_route`, `distance_matrix` |
| **Fleet** | Fleet Management | `track_vehicle`, `get_fleet_status`, `schedule_maintenance`, `get_driver_report` |
| **Email** | Customer Comms | `send_tracking_update`, `auto_reply`, `check_inbox` |
| **WMS** | Warehouse | `get_dock_schedule`, `assign_pick_task`, `check_inventory`, `receive_shipment` |
| **Scanner** | Warehouse | `verify_pick`, `receive_item`, `check_sku`, `generate_label` |

### API Endpoints (40+)

| Category | Endpoints |
|----------|----------|
| **Auth** | `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/forgot-password` |
| **Dashboard** | `/api/dashboard/stats` |
| **AI** | `/api/ai` (GET + POST — Cloudflare Workers AI) |
| **Shipments** | `/api/shipment` (CRUD) |
| **Inventory** | `/api/inventory/[id]` (CRUD) |
| **Routes** | `/api/routes` (CRUD) |
| **Warehouse** | `/api/warehouse/[id]` (CRUD) |
| **Fleet** | `/api/fleet/drivers/[id]`, `/api/fleet/vehicles/[id]` |
| **Customers** | `/api/customer` (CRUD) |
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
| Agent Framework | MCP (Model Context Protocol) |
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
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
CLOUDFLARE_AI_ACCOUNT_ID="..."
CLOUDFLARE_AI_API_KEY="..."
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
| `SHIPROCKET_EMAIL` | — | Shiprocket login email |
| `SHIPROCKET_PASSWORD` | — | Shiprocket login password |
| `TALLY_REST_URL` | — | TallyPrime REST API URL (default: `http://localhost:9000`) |
| `GSTN_API_KEY` | — | GSTN e-way bill API key |
| `FLEET_API_KEY` | — | Fleet telematics API key |
| `MAPMYINDIA_API_KEY` | — | MapmyIndia API key |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | — | Email (Resend) SMTP credentials |

## Rollback Strategy

- Git tags created before major changes: `git tag v1.0.0`
- Incremental commits per module make isolation easy
- To rollback: `git checkout v0.9.0` or `git revert <commit-hash>`
- Database schema is additive (no destructive migrations)
- Vercel: redeploy any previous deployment from the dashboard

## License

Proprietary — All rights reserved.
