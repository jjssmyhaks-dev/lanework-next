# Lanework — Deployment & Handover Guide

**For operators and DevOps.** Covers Vercel deployment, environment setup, troubleshooting, rollback, and operational health.

---

## Quick Deploy (Vercel)

### Prerequisites
- GitHub repo: `https://github.com/jjssmyhaks-dev/lanework-next`
- Vercel account linked to GitHub
- Neon PostgreSQL database (`neon.tech` — free tier works for dev)

### Step 1: Environment Variables

Go to Vercel Dashboard → Project → Settings → Environment Variables. Add ALL of these:

```
# REQUIRED
DATABASE_URL          = postgresql://...
NEXTAUTH_SECRET       = (openssl rand -hex 32)
NEXTAUTH_URL           = https://your-domain.vercel.app

# RECOMMENDED
JWT_SECRET             = (same as NEXTAUTH_SECRET)
NEXT_PUBLIC_APP_URL    = https://your-domain.vercel.app

# OPTIONAL — AI features (Cloudflare Workers AI)
CLOUDFLARE_AI_ACCOUNT_ID =
CLOUDFLARE_AI_API_KEY    =

# OPTIONAL — Integrations (add as needed)
SHIPROCKET_EMAIL     =
SHIPROCKET_PASSWORD  =
TALLY_REST_URL       =
MAPMYINDIA_LICENSE_KEY =
FEDEX_API_KEY        =
FEDEX_SECRET_KEY     =
SHOPIFY_STORE_URL    =
SHOPIFY_ACCESS_TOKEN =
WHATSAPP_PHONE_ID    =
WHATSAPP_ACCESS_TOKEN=
RAZORPAY_KEY_ID      =
RAZORPAY_KEY_SECRET  =
SMTP_HOST            =
SMTP_PORT            =
SMTP_USER            =
SMTP_PASS            =
EMAIL_FROM           =
```

### Step 2: Deploy

```bash
npm install -g vercel
vercel --prod --yes
```

Or: Push to `main` branch → Vercel auto-deploys (if GitHub integration is set up).

### Step 3: Initialize Database

Visit `https://your-domain.vercel.app/api/db/init` once. This creates all tables.

### Step 4: Verify

1. Open the site → register an account
2. Go to Dashboard — should show empty state with onboarding guide
3. Go to Connections — should show all 17 integration cards
4. Connect one integration — click "Use this tool" — actions should respond

---

## Local Development

```bash
git clone https://github.com/jjssmyhaks-dev/lanework-next.git
cd lanework-next
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and at minimum NEXTAUTH_SECRET
npm install
npm run dev
# Open http://localhost:3000
```

---

## Database

### Schema Overview
- **Users**: accounts, auth tokens
- **Shipments**: tracking numbers, carriers, statuses, destinations
- **Inventory**: SKUs, quantities, reorder points
- **Orders**: customer orders, status, items
- **Vehicles**: registration, maintenance, GPS location
- **Drivers**: licenses, hours, compliance
- **Routes**: waypoints, ETAs, weather alerts
- **Integrations**: connected services, API configs
- **Webhooks / Webhook_events**: inbound data tracking
- **Agent_tasks**: MCP task execution log
- **Audit_logs**: system-wide change tracking
- **Customers**: names, phones, addresses

### Database URL Format
```
postgresql://USERNAME:PASSWORD@HOST/DATABASE?sslmode=require
```

Get from Neon dashboard → Connection Details → Pooled connection.

---

## Health Checks

### Pages (must return 200)
| Path | Purpose |
|------|---------|
| `/` | Landing page |
| `/login` | Login |
| `/register` | Registration |
| `/dashboard` | Main dashboard |
| `/integrations` | Connections page |
| `/docs` | Documentation |

### APIs (must return 200)
| Endpoint | Purpose |
|----------|---------|
| `GET /api/integrations` | List all integrations |
| `GET /api/integrations/{id}` | Get single integration |
| `POST /api/integrations` | Connect integration |
| `POST /api/integrations/{id}/action` | Run integration action |
| `GET /api/dashboard/stats` | Dashboard statistics |

### Health Check Script
```bash
# Run from project root
for path in / /login /register /dashboard /integrations /docs \
  /api/integrations /api/dashboard/stats; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$path)
  echo "$path → $status"
done
```

### Integration Action Test
```bash
# Test Shiprocket (no API key needed — uses DB fallback)
curl -X POST http://localhost:3000/api/integrations/shiprocket/action \
  -H "Content-Type: application/json" \
  -d '{"action":"track_shipment"}'

# Test TallyPrime (no API key needed — uses DB fallback)
curl -X POST http://localhost:3000/api/integrations/tally_prime/action \
  -H "Content-Type: application/json" \
  -d '{"action":"sync_inventory"}'
```

---

## Monitoring

### Build Health
Vercel automatically checks builds on every push. Failed builds appear in the Vercel dashboard.

### Runtime Errors
API errors are logged to the server console. In Vercel, check:
- Dashboard → Project → Logs
- Dashboard → Project → Functions (performance metrics)

### Database
Neon dashboard shows:
- Connection count
- Query performance
- Storage usage
- Branch health

---

## Rollback

### To previous version
```bash
# List recent commits
git log --oneline -10

# Revert to a specific commit (creates new commit undoing changes)
git revert <commit-hash>
git push origin main

# Or: hard rollback (rewrites history — use only if necessary)
git reset --hard <commit-hash>
git push --force origin main
```

### On Vercel
1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

### Database
- Database changes are additive (add columns/tables, never drop)
- Rollback code without losing data
- If schema change causes issues: restore Neon branch to earlier point

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API key leak in logs | Low | High | All API calls use env vars; no keys in code or git history |
| Database connection failure | Low | High | Neon auto-scales; connection pooling by default |
| Integration API rate limiting | Medium | Low | Graceful fallback to DB cache; all MCPs handle API unavailability |
| Deployment failure | Low | Medium | Vercel auto-rolls back; each commit is independently deployable |
| User data loss | Low | Critical | All data in Neon (managed backups); no local storage |
| JWT secret compromise | Low | Critical | Rotate NEXTAUTH_SECRET and restart; tokens invalidate on change |

---

## CI/CD (GitHub + Vercel)

### Auto-deploy on push
Every push to `main` triggers Vercel build. Preview deployments for PR branches.

### Recommended workflow
1. Create feature branch: `git checkout -b feature/xxx`
2. Push → Vercel creates preview URL
3. Test on preview URL
4. Merge to `main` via PR
5. `main` auto-deploys to production

### Pre-merge checklist
- [ ] `next build` passes locally (0 errors)
- [ ] All page routes return 200
- [ ] Integration action API returns valid JSON
- [ ] No new hardcoded values
- [ ] `.env.example` updated if new env vars added

---

## Troubleshooting

### Build fails: "Cannot find module"
```bash
rm -rf node_modules .next
npm install
npm run dev
```

### Database: "relation does not exist"
Run `/api/db/init` or manually:
```sql
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY,
  org_id TEXT DEFAULT 'default',
  integration_type TEXT,
  name TEXT,
  status TEXT DEFAULT 'disconnected',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Port 3000 already in use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /F /PID <PID>

# Or use different port
npx next dev -p 3001
```

### Vercel: "Environment variable not found"
- Check exact spelling in Vercel dashboard
- Environment variables are case-sensitive
- Changes take effect on next deployment
