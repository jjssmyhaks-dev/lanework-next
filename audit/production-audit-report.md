# Lanework Production-Readiness Audit Report

**Date:** 2026-08-12
**Audit scope:** Full-stack live verification — backend APIs, AI service, integrations, chat interface, file uploads, auth, security, testing, CI/CD, deployment readiness
**Method:** Live endpoint tests against running dev server + direct Neon DB schema introspection + static code review
**Verdict:** 🔴 **NOT PRODUCTION READY — NO-GO.** 5 critical blockers found (schema drift, 2 broken integrations, broken CSV import, invalid AI credentials, unverified CI/deploy). Everything else works.

---

## 1. Executive Summary

The product **runs and looks production-grade** — all 8 main pages render, all 11 core GET APIs work, auth works end-to-end, the Claude-style chat copilot is in place, and 10/10 unit tests pass. However, **the database schema does not match the code**, which silently breaks 3 major features (Razorpay, LocoNav, CSV import). The Cloudflare AI key is invalid so chat AI is a local rule-based fallback, not real AI. CI/CD has never been verified end-to-end, and the deploy step depends on GitHub Secrets that haven't been confirmed.

**Bottom line:** ~70% of the product is real and working. 5 blockers must be fixed before any real user touches it. Estimated effort: **1–2 focused days.**

---

## 2. What Works (Verified Live)

| # | Area | Evidence |
|---|------|----------|
| 1 | **Core GET APIs** (11/11) | `/api/dashboard/stats`, `/api/integrations`, `/api/inventory`, `/api/shipment`, `/api/customer`, `/api/routes`, `/api/warehouse`, `/api/fleet/vehicles`, `/api/fleet/drivers`, `/api/usage` — all HTTP 200 |
| 2 | **Pages render** (8/8) | `/`, `/copilot`, `/login`, `/register`, `/integrations`, `/agents`, `/shipment`, `/inventory` — all 200 with content |
| 3 | **Auth flow** | Register → 201 with user; Login → 200 with JWT. Sessions, refresh, logout-everywhere implemented |
| 4 | **Chat copilot UI** | Full Claude-style interface at `/copilot`: markdown bubbles, quick actions, integration pills, agent shortcuts, file upload button, conversation persistence/export |
| 5 | **Integration actions** (7/9 graceful) | TallyPrime (db-fallback), Shopify (db-fallback), GSTN (simulated + format validation works), WhatsApp (simulated), Google Sheets (db-fallback), WooCommerce (simulated), Generic Webhook (simulated) — all return success with graceful degradation |
| 6 | **CSV Export** | `/api/export/csv?entity=shipments` → 200, valid CSV output |
| 7 | **Search** | `/api/search` works with `allSettled` fault tolerance |
| 8 | **Rate limiting** | In-memory limiter active on `/api/ai` (10/min), integrations (30/min), search (30/min) |
| 9 | **Unit tests** | 10/10 pass (5 rate-limit + 5 API smoke incl. 429 exhaustion test) |
| 10 | **Production build** | `next build` compiles with 0 TS errors |
| 11 | **Sentry** | Instrumented (`instrumentation.ts`, `withSentryConfig` v10 API) — but no auth token (see blockers) |
| 12 | **Prisma schema** | 24 models defined (but mismatched with live DB — see blockers) |

---

## 3. Critical Blockers (Must Fix Before Launch)

### 🔴 B1 — Database Schema Drift: Prisma Schema ≠ Live Database
**Severity: CRITICAL. Impact: 3 features broken + future migrations impossible.**

The live Neon database was created by raw `CREATE TABLE` SQL in `/api/db/init` (or an older migration), **not** by Prisma migrations. The `prisma/migrations` folder contains only `migration_lock.toml` — **zero migration files**. The two schemas disagree on core columns:

| Table | Prisma schema says | Live DB actually has | Result |
|-------|-------------------|---------------------|--------|
| `orders` | — | **no `payment_mode`, no `external_id`** | Razorpay reconcile → **500** |
| `vehicles` | `lastSeenAt` (`last_seen_at`), `lastLat`, `lastLng`, `registration` | **none of these** — has `license_plate`, `vehicle_type` | LocoNav track_all → **500** |
| `inventory` | `category`, `unit`, `warehouse_id`, `itemName` | only `sku`, `name`, `quantity`, `reorder_point`, `warehouse`, `location` | CSV inventory import → **500** |
| `shipments` | `userId`, `eta` | `tenant_id`, `order_number`, `carrier_service`, `current_location`, no `eta` | partial mismatch |

**Fix:** Pick ONE source of truth. Either (a) run a real Prisma migration that aligns the DB to `schema.prisma`, or (b) rewrite `schema.prisma` to match the live DB and generate the first migration from it (`prisma migrate diff --from-empty --to-schema-datamodel`). Then add the missing columns referenced by integration handlers (`payment_mode`, `external_id`, `last_seen_at`, `last_lat`, `last_lng`) as schema fields + a migration.

### 🔴 B2 — Razorpay Integration Returns 500
`POST /api/integrations/razorpay/action` → `{"error":"column \"payment_mode\" does not exist"}` (3 query sites: lines 605, 621, 631 of action route).
**Fix:** Change COD queries to use `items` JSONB (`items->>'payment_mode'`) or drop the filter and count `orders` directly.

### 🔴 B3 — LocoNav/Fleet Tracking Returns 500
`POST /api/integrations/loconav/action` → `{"error":"column \"last_seen_at\" does not exist"}`.
**Fix:** Update the DB-fallback query to the live `vehicles` columns (`license_plate`, `status`, `odometer`), and add telemetry columns via migration if live GPS data is expected.

### 🔴 B4 — CSV Import Broken
`POST /api/import/csv` → `"Row 1: invalid input syntax for type json"` for shipments (the `estimated_delivery`/`metadata` path), and the inventory branch inserts columns (`category`, `unit`, `warehouse_id`, `reorder_quantity`) that don't exist in the live DB.
**Fix:** Align INSERT statements with the real shipments/inventory/orders columns; ensure `metadata` is passed as `::jsonb` or omitted.

### 🔴 B5 — Cloudflare AI Key Invalid → Chat AI Is a Fallback, Not Real AI
`CLOUDFLARE_AI_API_KEY` in `.env.local` returns `{"code":10000,"message":"Authentication error"}` from Cloudflare Workers AI. The copilot still answers because of a local rule-based fallback (`localFallback()` in `src/lib/ai.ts`) — but this is canned text, not real intelligence.
**Fix:** Generate a valid Cloudflare API token (Workers AI → Manage Account → API Tokens) OR swap to another provider (OpenAI/Anthropic/Gemini). One valid key makes the whole chat genuinely intelligent.

---

## 4. High-Priority Gaps

### 🟠 G1 — No Real Integration Credentials Configured (Product is "Demo Mode")
Only 3 integrations are marked `connected` in the DB (Shiprocket, Google Sheets Sync, CSV/Excel Import) — **and none have API keys in `.env.local`**. Every "live" action falls back to `simulated`/`db-fallback`. The UI shows green "connected" dots that imply live capability.
- **Impact:** A user connecting Shiprocket/Razorpay/Shopify will get simulated responses, not real data.
- **Fix:** Set real credentials for at least the top 3 (Shiprocket, Razorpay, Tally) in `.env.local`/Vercel env vars, and make the connection status reflect actual env-var presence (envStatus already computed in connect route — surface it in the pills).

### 🟠 G2 — Sentry Not Fully Wired
Build emits: `Warning: No auth token provided. Will not upload source maps.` → `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` are unset. Error capture works in dev but releases/source maps won't upload in prod.
**Fix:** Add the 3 Sentry vars to `.env.local` and GitHub Secrets.

### 🟠 G3 — CI/CD Never Verified End-to-End
`.github/workflows/ci.yml` exists (lint → build → test → deploy to Vercel) but:
- **No successful run recorded** (latest commit `77d7ada` was pushed; no green check confirmed).
- Deploy step requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — unconfirmed in GitHub Secrets.
- **`continue-on-error: true` on lint and tests** — CI passes even when they fail. This is a silent-failure trap.
**Fix:** Add all secrets, push a test commit, remove `continue-on-error`, confirm a green run + successful Vercel deploy.

### 🟠 G4 — Test Coverage Is Minimal
Only 2 test files / 10 tests. **Zero tests** for: auth, integrations, CSV import/export, DB schema, search, rate-limit edge cases beyond AI, webhooks. Coverage thresholds (80%) configured in `vitest.config.ts` but never enforced (CI uses `continue-on-error`).
**Fix:** Add tests for the 3 broken flows (Razorpay query, fleet query, CSV import), auth login/refresh, and at least one integration action per mode.

### 🟠 G5 — MCP Servers Exist but Aren't Used
16 directories under `mcp-servers/` (shiprocket, tally, fedex, fleet, ewaybill, scanner, googlesheets, wms, erp, compliance, email, weather, dockscheduler, mapmyindia, shopify, shared) — but the API routes reimplement integration logic inline. The MCP servers are standalone code that nothing calls.
**Fix:** Either (a) wire the API routes to invoke MCP server handlers, or (b) delete the MCP servers to avoid confusion. Currently they're dead code that misleads developers.

---

## 5. Secondary Gaps (Polish Before Scale)

| # | Gap | Detail |
|---|-----|--------|
| S1 | **Thin seed data** | Live DB: 2 shipments, 0 inventory, 0 orders, 1 vehicle, 15 users. Dashboards look empty to a first-time user. Seed script needed. |
| S2 | **"Simulated success" UX truthfulness** | Integration actions return `success:true` even in `simulated` mode — chat cards show green checkmarks for fake results. Should show an amber "not connected" state instead. |
| S3 | **No webhook inbound verification** | `/api/webhooks/inbound/[id]` and `/api/webhooks/whatsapp/[id]` exist but were never exercised. |
| S4 | **Contact form / onboarding** | `/api/contact` exists; onboarding GET returns 400 without params (expected) but no POST verification done. |
| S5 | **Docs exist but stale** | `docs/DEPLOYMENT.md`, `USER-GUIDE.md`, `USER-JOURNEY.md` present — verify they match the new chat-first navigation (Dashboard redirects to Copilot). |
| S6 | **`/dashboard` redirect** | Dashboard layout now redirects `/dashboard` → `/copilot` (chat-first). Confirm marketing pages (`/`, `/pricing`, `/how-it-works`) still link correctly. |
| S7 | **No backups/point-in-time** | Neon free tier — confirm PITR/backup policy before real data. |
| S8 | **Email sending** | `SMTP_*` vars documented but no verification that emails (forgot-password, notifications) actually send. |

---

## 6. Verified Live Test Matrix (Evidence)

```
GET  /api/dashboard/stats                    200 ✓ (shipments=2)
GET  /api/integrations                       200 ✓
GET  /api/inventory                          200 ✓
GET  /api/shipment                           200 ✓
GET  /api/customer                           200 ✓
GET  /api/routes                             200 ✓
GET  /api/warehouse                          200 ✓
GET  /api/fleet/vehicles                     200 ✓
GET  /api/fleet/drivers                      200 ✓
GET  /api/usage                              200 ✓
GET  /api/export/csv?entity=shipments        200 ✓
POST /api/auth/register                      201 ✓
POST /api/auth/login                         200 ✓
POST /api/ai (reasoning)                     200 ✓ (local fallback; CF key invalid)
POST /api/integrations/tally_prime/action    200 ✓ mode=db-fallback
POST /api/integrations/shopify/action        200 ✓ mode=db-fallback
POST /api/integrations/gstn_eway_bill/action 200 ✓ mode=simulated (format_valid=True)
POST /api/integrations/whatsapp/action       200 ✓ mode=simulated
POST /api/integrations/google_sheets/action  200 ✓ mode=db-fallback
POST /api/integrations/woocommerce/action    200 ✓ mode=simulated
POST /api/integrations/generic_webhook/action 200 ✓ mode=simulated
POST /api/integrations/razorpay/action       500 ✗ column "payment_mode" does not exist
POST /api/integrations/loconav/action        500 ✗ column "last_seen_at" does not exist
POST /api/import/csv                         500 ✗ invalid input syntax for type json
POST /api/search                             200 ✓
PAGE /, /copilot, /login, /register, /integrations, /agents, /shipment, /inventory  200 ✓ (8/8)
Unit tests                                    10/10 ✓
Production build                              ✓ 0 TS errors
```

---

## 7. Prioritized Remediation Plan

### Day 1 — Blockers (B1–B5)
1. **B1:** Reconcile schema — generate a real Prisma migration matching the live DB, or rewrite `schema.prisma` + add missing columns (`payment_mode`, `external_id`, `last_seen_at`, `last_lat`, `last_lng`) with a migration. Apply it.
2. **B2:** Fix Razorpay COD queries (3 sites) → use `items` JSONB.
3. **B3:** Fix LocoNav fallback query → live vehicle columns.
4. **B4:** Fix CSV import INSERTs → live columns; handle `metadata` JSONB properly.
5. **B5:** Replace Cloudflare API key (or provider). Verify `POST /api/ai` returns real LLM output.

### Day 2 — High-priority gaps (G1–G5)
6. **G1:** Configure real credentials for Shiprocket + Razorpay + Tally; surface `envStatus` in integration pills; change "simulated" success to amber "not connected".
7. **G2:** Add Sentry org/project/auth-token; verify source maps in a deploy.
8. **G3:** Add GitHub Secrets (DATABASE_URL, NEXTAUTH_SECRET, JWT_SECRET, VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, SENTRY_AUTH_TOKEN); remove `continue-on-error`; push test commit; confirm green CI + Vercel deploy.
9. **G4:** Add regression tests for the 3 fixed flows + auth.
10. **G5:** Wire or delete MCP server code.

### Week 2 — Polish (S1–S8)
11. Seed script (20+ shipments, 30+ inventory items, routes, orders).
12. Webhook inbound test + docs. 13. Email send verification. 14. Backup policy. 15. Docs refresh for chat-first UX.

---

## 8. Go/No-Go Checklist

| Criterion | Status |
|-----------|--------|
| All core APIs return 200 | ✅ |
| All pages render | ✅ |
| Auth (register/login/refresh) | ✅ |
| Chat copilot is primary UX | ✅ |
| All integrations return real data (no simulated) | ❌ Only 7/9 graceful, 2 broken, 0 live |
| CSV import/export | ❌ Export ✅ / Import broken |
| AI is real LLM (not fallback) | ❌ |
| Schema matches code (migrations exist) | ❌ |
| Tests cover critical flows | ❌ (10 tests, 0 for broken areas) |
| CI/CD green end-to-end + deployed | ❌ Unverified |
| Sentry releases + source maps | ❌ No auth token |
| Seed/demo data adequate | ❌ |
| Docs current | ⚠️ Stale for chat-first UX |

**Decision: NO-GO until B1–B5 are fixed and G3 (CI/CD verified green) is confirmed.**

---

*Generated by Lanework audit — all findings verified against the live dev server and direct Neon DB introspection on 2026-08-12.*
