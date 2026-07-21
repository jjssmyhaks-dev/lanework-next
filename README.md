# Lanework — The Agentic Operating System for Logistics

A full-stack AI-powered logistics platform with **Next.js 16 frontend** + **6 Python AI agents** + **Neon PostgreSQL** + **Cloudflare Workers AI**.

## Architecture

```
lanework-next/
├── src/                          # Next.js 16 frontend (App Router)
│   ├── app/
│   │   ├── (auth)/               # Login & Register pages
│   │   ├── (dashboard)/          # 8 protected dashboard pages
│   │   ├── api/                  # 18 REST API endpoints
│   │   ├── page.tsx              # Landing page (Pentagram design)
│   │   └── globals.css           # Design system
│   ├── components/ui/            # Reusable UI (Card, Button, Input, etc.)
│   └── lib/                      # DB, Auth, AI, Utils
│
├── backend/                      # Python agent system (from logi repo)
│   ├── agents/                   # 6 AI agents (FastAPI)
│   │   ├── shipment-tracking/    # §1 Carrier tracking + ETA drift
│   │   ├── inventory-management/# §2 Stock monitoring + reorder
│   │   ├── route-optimization/   # §3 Dynamic routing
│   │   ├── warehouse-ops/        # §4 Pick/pack/ship + dock scheduling
│   │   ├── fleet-management/     # §5 HOS compliance + maintenance
│   │   └── customer-support/     # §6 Auto-replies + sentiment
│   │
│   ├── apps/                     # Supporting services
│   │   ├── orchestrator/         # LangGraph orchestration
│   │   ├── api-gateway/          # Auth + tenant routing
│   │   ├── chat-copilot/         # Conversation router
│   │   ├── voice-gateway/        # LiveKit voice agent
│   │   └── dashboard/            # React+Vite dashboard (alt)
│   │
│   └── packages/                 # Shared libraries
│       ├── db/                   # SQLAlchemy models
│       ├── shared-types/         # Pydantic schemas
│       └── tool-bus/             # MCP client + tool definitions
│
├── .env.example                  # Environment template
├── README.md
└── package.json
```

## Features

### Frontend (Next.js 16)
- **Landing Page** — Pentagram monochrome design, 12 sections (Hero, Problem, Solution, Agents, Pricing, FAQ, etc.)
- **Dashboard** — Stats cards, agent activity feed, quick actions
- **8 protected pages** — Shipment, Inventory, Routes, Warehouse, Fleet, Customer, Agents, Dashboard
- **Auth** — Register/Login with NextAuth.js v5 + Neon DB
- **Cloudflare AI** — 4 AI functions (shipment analysis, route optimization, sentiment, reasoning)

### Backend (Python / FastAPI)
- **6 AI Agents** (30 files, ~430KB) — each with:`__init__.py`, `config.py`, `schemas.py`, `service.py`, `main.py`
- **Trust Level System** — Propose-only / Auto-execute / Fully-autonomous per action
- **AgentTask Audit** — Every action creates a reasoned audit trail
- **MCP Tool Bus** — Cross-agent & 3rd-party API integration
- **Webhook System** — 37 event types across all agents
- **Tenant Isolation** — Row-level security in PostgreSQL

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| Backend | Python 3.11+, FastAPI, SQLAlchemy, LangGraph |
| Auth | NextAuth.js v5 (Credentials) |
| Database | Neon PostgreSQL (Serverless) |
| AI | Cloudflare Workers AI (Llama 3 8B) |
| Agent Tooling | MCP (Model Context Protocol) |
| Voice | LiveKit Agents |
| Charts | Recharts |

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Neon PostgreSQL database
- Cloudflare Workers AI account

### Frontend Setup

```bash
cd lanework-next
npm install
cp .env.example .env.local
# Edit .env.local with your credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Run an individual agent
cd agents/shipment-tracking
python main.py  # Starts on port 8000

# Or use docker-compose
cd backend
docker-compose up
```

### Database Setup

```bash
# Initialize all tables
npm run db:init

# Or directly via Python
cd backend
python -c "from packages.db.models import *; # creates tables"
```

## API Endpoints

### Frontend API (Next.js)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| ALL | `/api/auth/[...nextauth]` | NextAuth handler |
| POST | `/api/ai` | Cloudflare AI |
| CRUD | `/api/shipment` | Shipment management |
| CRUD | `/api/inventory` | Inventory management |
| CRUD | `/api/routes` | Route management |
| CRUD | `/api/warehouse` | Warehouse tasks |
| CRUD | `/api/fleet/drivers` | Driver management |
| CRUD | `/api/fleet/vehicles` | Vehicle management |
| CRUD | `/api/customer` | Conversations |
| GET | `/api/dashboard/stats` | Dashboard stats |

### Backend API (Python) — see [agent-api-specifications.md](backend/agent-api-specifications.md)

| Agent | Port | Key Operations |
|-------|------|----------------|
| shipment-tracking | 8000 | Create, track, webhook, ETA drift |
| inventory-management | 8001 | CRUD, transfer, adjust, recommend |
| route-optimization | 8002 | Create, optimize, assign, re-optimize |
| warehouse-ops | 8004 | Tasks, dock schedule, labor forecast |
| fleet-management | 8005 | Drivers, vehicles, HOS, maintenance |
| customer-support | 8006 | Conversations, replies, escalations, sentiment |

## Database Schema

The database has 11 tables in Neon PostgreSQL:

| Table | Purpose |
|-------|---------|
| `users` | Auth accounts |
| `sessions` | Session tokens |
| `agent_tasks` | Audit trail for all agent actions |
| `shipments` | Tracking + carrier data |
| `inventory` | Stock levels + reorder points |
| `routes` | Route plans + optimizations |
| `warehouse_tasks` | Pick/pack/ship/receive |
| `drivers` | Driver profiles + HOS |
| `vehicles` | Vehicle fleet + maintenance |
| `conversations` | Customer interactions |
| `messages` | Chat messages |

## Rollback Strategy

- Git tags created before major changes: `git tag v1.0.0`
- Incremental commits per module make isolation easy
- To rollback: `git checkout v0.9.0` or `git revert <commit-hash>`
- Database schema is additive (no destructive migrations)

## License

Proprietary — All rights reserved.
