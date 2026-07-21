# Lanework — The Agentic Operating System for Logistics

Lanework is a full-stack AI-powered logistics platform that orchestrates a team of autonomous AI agents to manage your entire logistics operation.

Built with **Next.js 16**, **Neon PostgreSQL**, **NextAuth.js**, and **Cloudflare Workers AI**.

## Features

### Six AI Agents
- **Shipment Tracking** — Live tracking across carriers with proactive delay alerts
- **Inventory Management** — Real-time stock monitoring with reorder alerts
- **Route Optimization** — Dynamic routing adapting to traffic, weather, and new orders
- **Warehouse Operations** — Pick paths, task assignment, and dock scheduling
- **Fleet & Driver Management** — HOS compliance and maintenance tracking
- **Customer Communication** — Automated responses to status queries

### Core Capabilities
- Authentication with Neon PostgreSQL (email/password via NextAuth.js)
- Cloudflare Workers AI integration for intelligent reasoning
- Full audit trail on every autonomous action
- Configurable trust levels per agent
- Tenant-isolated data architecture
- REST API for all agents

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Neon PostgreSQL (Serverless) |
| Auth | NextAuth.js v5 (Credentials) |
| AI | Cloudflare Workers AI (Llama 3 8B) |
| Styling | Tailwind CSS v4 |
| Forms | react-hook-form + zod |
| Charts | Recharts |
| UI | Custom Pentagram-inspired design system |

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Cloudflare](https://workers.ai) account with Workers AI access

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/tanditanay3-lab/lanework-next.git
cd lanework-next
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
CLOUDFLARE_AI_ACCOUNT_ID="your-account-id"
CLOUDFLARE_AI_API_KEY="your-api-key"
```

4. **Initialize the database**
```bash
npm run db:init
```

5. **Start development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
lanework-next/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Login & Register pages
│   │   ├── (dashboard)/         # Protected dashboard pages
│   │   │   ├── dashboard/       # Main overview
│   │   │   ├── agents/          # Agent management
│   │   │   ├── shipment/        # Shipment tracking
│   │   │   ├── inventory/       # Inventory management
│   │   │   ├── routes/          # Route optimization
│   │   │   ├── warehouse/       # Warehouse operations
│   │   │   ├── fleet/           # Fleet & driver management
│   │   │   └── customer/        # Customer communications
│   │   ├── api/                 # REST API routes
│   │   │   ├── auth/            # Authentication endpoints
│   │   │   ├── ai/              # Cloudflare AI integration
│   │   │   ├── shipment/        # Shipment CRUD
│   │   │   ├── inventory/       # Inventory CRUD
│   │   │   ├── routes/          # Routes CRUD
│   │   │   ├── warehouse/       # Warehouse CRUD
│   │   │   ├── fleet/           # Fleet CRUD
│   │   │   ├── customer/        # Customer CRUD
│   │   │   └── dashboard/       # Dashboard stats
│   │   ├── globals.css          # Global styles + Pentagram design system
│   │   ├── layout.tsx           # Root layout with providers
│   │   └── page.tsx             # Landing page
│   ├── components/
│   │   ├── ui/                  # Reusable UI components
│   │   ├── providers.tsx        # Session + Query + Toast providers
│   │   ├── agents/              # Agent-specific components
│   │   ├── dashboard/           # Dashboard components
│   │   └── auth/                # Auth components
│   └── lib/
│       ├── db.ts                # Database schema (Drizzle ORM)
│       ├── db-init.ts           # Database initialization
│       ├── auth.ts              # NextAuth configuration
│       ├── ai.ts                # Cloudflare Workers AI client
│       └── utils.ts             # Utility functions
├── .env.example                 # Environment template
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

## API Endpoints

All endpoints are prefixed with `/api/`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| GET/POST | `/api/auth/[...nextauth]` | NextAuth handler |
| POST | `/api/ai` | Cloudflare AI inference |
| GET/POST | `/api/shipment` | List/Create shipments |
| GET/PATCH/DELETE | `/api/shipment/[id]` | Manage shipment |
| GET/POST | `/api/inventory` | List/Create inventory |
| GET/POST | `/api/routes` | List/Create routes |
| GET/POST | `/api/warehouse` | List/Create warehouse tasks |
| GET/POST | `/api/fleet/drivers` | List/Create drivers |
| GET/POST | `/api/fleet/vehicles` | List/Create vehicles |
| GET/POST | `/api/customer` | List/Create conversations |
| GET | `/api/dashboard/stats` | Dashboard statistics |

## Build & Lint

```bash
# Build for production
npm run build

# Run linter
npm run lint

# Start production server
npm start
```

## Rollback Strategy

The repository uses Git tags for versioned releases:

```bash
# Create a release tag before major changes
git tag v1.0.0
git push origin v1.0.0

# To rollback to a previous version
git checkout v0.9.0
# Or revert specific commits
git revert <commit-hash>
```

Each major feature merge creates an incremental commit making it easy to isolate and revert.

## License

Proprietary — All rights reserved.
