# 🔑 API Keys Reference — Lanework

Complete guide to every external API the 15 MCP servers use. Each MCP works in **simulated mode** without API keys — add a key to go live for that integration.

---

## Quick Status Dashboard

| # | MCP Server | Required Env Vars | Free Tier | How to Get |
|---|---|---|---|---|
| 1 | **Shiprocket** | `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD` | ✅ Free account | [shiprocket.in](https://www.shiprocket.in/) → Register → Settings → API |
| 2 | **Weather** | `OPENWEATHER_API_KEY` | ✅ 1,000 calls/day | [openweathermap.org](https://openweathermap.org/api) → Sign up → API Keys |
| 3 | **MapmyIndia** | `MAPMYINDIA_API_KEY`, `MAPMYINDIA_LICENSE_KEY` | ✅ 2,500 req/day | [mapmyindia.com/api](https://www.mapmyindia.com/api/) → Register → Dashboard → API Keys |
| 4 | **Google Sheets** | `GOOGLE_SHEETS_API_KEY` or `GOOGLE_SERVICE_ACCOUNT_KEY` | ✅ Free | [console.cloud.google.com](https://console.cloud.google.com/) → Enable Sheets API → Credentials |
| 5 | **TallyPrime** | `TALLY_REST_URL`, `TALLY_COMPANY` | ✅ Local (no API) | Open TallyPrime → `Ctrl+Alt+R` → Copy URL |
| 6 | **GST E-Way Bill** | `GSTN_API_KEY`, `GSTN_USERNAME`, `GSTN_PASSWORD` | ❌ Paid | [mastergst.com](https://www.mastergst.com/eway-bill-api/) or [cleartax.in](https://cleartax.in/s/eway-bill-api) |
| 7 | **FedEx** | `FEDEX_API_KEY`, `FEDEX_SECRET_KEY`, `FEDEX_ACCOUNT_NUMBER` | ✅ Sandbox | [developer.fedex.com](https://developer.fedex.com/) → Create App |
| 8 | **DHL** | `DHL_API_KEY`, `DHL_ACCOUNT_NUMBER` | ✅ Sandbox | [developer.dhl.com](https://developer.dhl.com/) → Register → Create App |
| 9 | **Shopify** | `SHOPIFY_STORE_URL`, `SHOPIFY_ACCESS_TOKEN` | ✅ Dev store | Shopify Admin → Settings → Apps → Develop Apps → Create → API Credentials |
| 10 | **WooCommerce** | `WOO_STORE_URL`, `WOO_CONSUMER_KEY`, `WOO_CONSUMER_SECRET` | ✅ Free | WooCommerce → Settings → Advanced → REST API → Add Key |
| 11 | **WhatsApp Business** | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` | ✅ 1,000 msgs/mo | [developers.facebook.com](https://developers.facebook.com/) → Create App → WhatsApp |
| 12 | **Email (Resend)** | `SMTP_PASS` (Resend API key) | ✅ 3,000 emails/mo | [resend.com](https://resend.com/) → Sign up → API Keys |
| 13 | **SAP B1** | `SAP_SERVICE_LAYER_URL`, `SAP_USERNAME`, `SAP_PASSWORD`, `SAP_COMPANY_DB` | ❌ Licensed | Your SAP administrator → Service Layer URL |
| 14 | **Parivahan (RTO)** | `PARIVAHAN_API_KEY` | ❌ Gov API | [parivahan.gov.in](https://parivahan.gov.in/) → API registration |
| 15 | **Fleet GPS** | `LOCONAV_API_KEY` or `FLEETX_API_KEY` | ❌ Paid | [loconav.com](https://www.loconav.com/) or [fleetx.io](https://fleetx.io/) → Dashboard → API |

---

## Detailed Setup Per Integration

### 1. Shiprocket (Shipping & Delivery)

**What it does:** Track shipments across 7+ Indian carriers (Delhivery, BlueDart, DTDC, Ecom Express, XpressBees, Shadowfax), book shipments, compare rates, cancel shipments.

**Steps:**
1. Go to [shiprocket.in](https://www.shiprocket.in/)
2. Sign up for a free account (or login if you have one)
3. Navigate to **Settings → API**
4. Copy your registered **email** and **password**
5. Set in Vercel: `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD`

**Free tier:** Unlimited API calls on basic plan.

---

### 2. OpenWeatherMap (Weather Intelligence)

**What it does:** Real-time weather for route planning, monsoon/flood alerts, 7-day forecasts, driver safety recommendations.

**Steps:**
1. Go to [openweathermap.org/api](https://openweathermap.org/api)
2. Click **Sign Up** (free)
3. Verify email → Go to **API Keys** tab
4. Copy your API key
5. Set in Vercel: `OPENWEATHER_API_KEY`

**Free tier:** 1,000 API calls/day, 5-day forecast.

---

### 3. MapmyIndia / CE (Maps & Routing)

**What it does:** Indian address geocoding (better than Google for tier-2/3 cities), multi-stop route optimization with ETAs, distance matrix.

**Steps:**
1. Go to [mapmyindia.com/api](https://www.mapmyindia.com/api/)
2. Register for an account
3. Go to **Dashboard → API Keys**
4. Copy your **API Key** and **License Key**
5. Set in Vercel: `MAPMYINDIA_API_KEY` and `MAPMYINDIA_LICENSE_KEY`

**Free tier:** 2,500 requests/day.

---

### 4. Google Sheets

**What it does:** Two-way sync between Lanework data and Google Sheets. Read/write inventory, shipments, orders.

**Option A — API Key (simpler):**
1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google Sheets API**
4. Go to **Credentials → Create Credentials → API Key**
5. Copy the key → Set in Vercel: `GOOGLE_SHEETS_API_KEY`
6. Share your Google Sheet with "Anyone with the link can edit"

**Option B — Service Account (full access):**
1. Same steps as above, but create a **Service Account** instead
2. Download the JSON key file
3. Set the entire JSON as: `GOOGLE_SERVICE_ACCOUNT_KEY`
4. Also set: `GOOGLE_SHEETS_SPREADSHEET_ID` (from the sheet URL)

---

### 5. TallyPrime (Accounting)

**What it does:** Sync inventory levels with Tally, push completed orders as sales vouchers, check ledger balances.

**Steps:**
1. Open **TallyPrime** on your computer
2. Press **Ctrl+Alt+R** to enable REST API
3. Note the URL shown (e.g., `http://192.168.1.100:9000`)
4. Set in Vercel: `TALLY_REST_URL` (your URL) and `TALLY_COMPANY` (company name)

**Note:** TallyPrime must be running on your local network. For cloud deployments, use Tally's cloud connector or VPN.

---

### 6. GST E-Way Bill (Compliance)

**What it does:** Auto-generate e-way bills from shipment data, validate GSTINs, cancel e-way bills.

**Steps:**
1. Register at [mastergst.com/eway-bill-api](https://www.mastergst.com/eway-bill-api/) OR [cleartax.in](https://cleartax.in/s/eway-bill-api)
2. Get your API credentials (username, password, API key)
3. Set in Vercel: `GSTN_API_KEY`, `GSTN_USERNAME`, `GSTN_PASSWORD`

**Alternative:** Use the free official GSTN portal at [ewaybillgst.gov.in](https://ewaybillgst.gov.in/) — but no API access.

---

### 7. FedEx (International Shipping)

**What it does:** Track FedEx shipments, create international shipments with labels, get rates.

**Steps:**
1. Go to [developer.fedex.com](https://developer.fedex.com/)
2. Create an account → Create a new app
3. Get **API Key**, **Secret Key**, and **Account Number**
4. For testing: use the sandbox URL (default)
5. For production: update `FEDEX_BASE_URL` to `https://apis.fedex.com`
6. Set in Vercel: `FEDEX_API_KEY`, `FEDEX_SECRET_KEY`, `FEDEX_ACCOUNT_NUMBER`

---

### 8. DHL Express (International Shipping)

**What it does:** Track DHL Express shipments.

**Steps:**
1. Go to [developer.dhl.com](https://developer.dhl.com/)
2. Register → Create a new app
3. Get your **API Key** and **Account Number**
4. Set in Vercel: `DHL_API_KEY`, `DHL_ACCOUNT_NUMBER`

---

### 9. Shopify (E-Commerce)

**What it does:** Import orders from Shopify, push inventory back, check order status.

**Steps:**
1. Go to Shopify Admin → **Settings → Apps and sales channels**
2. Click **Develop apps** → **Create an app**
3. Under **API credentials**, configure scopes: `read_orders`, `write_orders`, `read_products`, `write_products`
4. Install the app → Copy the **Admin API access token**
5. Set in Vercel:
   - `SHOPIFY_STORE_URL` = your store URL (e.g., `my-store.myshopify.com`)
   - `SHOPIFY_ACCESS_TOKEN` = the access token

---

### 10. WooCommerce (E-Commerce)

**What it does:** Import orders from WooCommerce store.

**Steps:**
1. Go to WooCommerce → **Settings → Advanced → REST API**
2. Click **Add key** → Description: "Lanework" → Permissions: **Read**
3. Copy the **Consumer Key** and **Consumer Secret**
4. Set in Vercel:
   - `WOO_STORE_URL` = your store URL (e.g., `https://mystore.com`)
   - `WOO_CONSUMER_KEY` = ck_xxxxx
   - `WOO_CONSUMER_SECRET` = cs_xxxxx

---

### 11. WhatsApp Business API

**What it does:** Send automatic delivery updates to customers on WhatsApp.

**Steps:**
1. Go to [developers.facebook.com](https://developers.facebook.com/)
2. Create an app → Select **Business** type
3. Add **WhatsApp** product
4. Go to **WhatsApp → Quick Start → API Setup**
5. Copy **Phone Number ID** and **Access Token**
6. Set in Vercel: `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN`

**Free tier:** 1,000 messages/month.

---

### 12. Email (via Resend)

**What it does:** Send tracking update emails, auto-reply to customer queries.

**Steps:**
1. Go to [resend.com](https://resend.com/)
2. Sign up → Verify your domain
3. Go to **API Keys** → Create a key
4. Set in Vercel: `SMTP_PASS` = your Resend API key
5. Set `EMAIL_FROM` = `Lanework <notifications@yourdomain.com>`

**Free tier:** 3,000 emails/month, 100/day.

---

### 13. SAP Business One (ERP)

**What it does:** Sync orders from SAP, push inventory, pull invoices for e-way bills.

**Steps:**
1. Contact your SAP administrator for the **Service Layer URL**
2. Get credentials (username, password, company DB name)
3. Set in Vercel:
   - `SAP_SERVICE_LAYER_URL` = e.g., `https://sap-server:50000/b1s/v1`
   - `SAP_USERNAME` and `SAP_PASSWORD`
   - `SAP_COMPANY_DB` = e.g., `SBODemoIN`

**Note:** Requires SAP Business One with Service Layer enabled. Not available for SAP S/4HANA Cloud.

---

### 14. Parivahan (RTO Compliance)

**What it does:** Verify driver licenses, check vehicle registration/insurance/PUC validity, fetch e-challans.

**Steps:**
1. Register at [parivahan.gov.in](https://parivahan.gov.in/) for API access
2. Get your API key
3. Set in Vercel: `PARIVAHAN_API_KEY`

**Note:** Parivahan API access is limited. Lanework falls back to manual tracking when unavailable.

---

### 15. Fleet GPS (Loconav / FleetX)

**What it does:** Real-time vehicle tracking, maintenance scheduling, driver reports.

**Steps:**
1. Sign up at [loconav.com](https://www.loconav.com/) or [fleetx.io](https://fleetx.io/)
2. Go to **Settings → API**
3. Copy your API key
4. Set in Vercel: `LOCONAV_API_KEY` or `FLEETX_API_KEY`

---

## Minimum Viable Setup (Recommended First)

For most Indian MSMEs, start with these **3 integrations**:

| Priority | Integration | Cost | Time to Setup | Value |
|----------|-------------|------|---------------|-------|
| 1 | **Shiprocket** | Free | 5 min | Track & book shipments across 7 carriers |
| 2 | **Weather** | Free | 2 min | Route safety for drivers |
| 3 | **MapmyIndia** | Free | 5 min | Route optimization & address lookup |

Add these when ready:
| Priority | Integration | Cost | Time to Setup |
|----------|-------------|------|---------------|
| 4 | **WhatsApp Business** | Free | 15 min |
| 5 | **Google Sheets** | Free | 10 min |
| 6 | **TallyPrime** | Free (local) | 5 min |

---

## Environment Variables (Copy-Paste Ready)

```bash
# ── Database ──
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/lanework
NEXTAUTH_SECRET=your-32-char-secret-here-at-least-32

# ── AI ──
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_AI_TOKEN=your-cloudflare-ai-token

# ── Shiprocket ──
SHIPROCKET_EMAIL=your-email@example.com
SHIPROCKET_PASSWORD=your-shiprocket-password

# ── Weather ──
OPENWEATHER_API_KEY=your-openweather-api-key

# ── Maps ──
MAPMYINDIA_API_KEY=your-mapmyindia-api-key
MAPMYINDIA_LICENSE_KEY=your-mapmyindia-license-key

# ── Google Sheets ──
GOOGLE_SHEETS_API_KEY=your-google-api-key
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id

# ── TallyPrime ──
TALLY_REST_URL=http://192.168.1.100:9000
TALLY_COMPANY=Your Company Name

# ── GST E-Way Bill ──
GSTN_API_KEY=your-gstn-api-key
GSTN_USERNAME=your-gstn-username
GSTN_PASSWORD=your-gstn-password

# ── FedEx ──
FEDEX_API_KEY=your-fedex-api-key
FEDEX_SECRET_KEY=your-fedex-secret
FEDEX_ACCOUNT_NUMBER=your-fedex-account

# ── DHL ──
DHL_API_KEY=your-dhl-api-key
DHL_ACCOUNT_NUMBER=your-dhl-account

# ── Shopify ──
SHOPIFY_STORE_URL=my-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx

# ── WooCommerce ──
WOO_STORE_URL=https://mystore.com
WOO_CONSUMER_KEY=ck_xxxxx
WOO_CONSUMER_SECRET=cs_xxxxx

# ── WhatsApp Business ──
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAAxxxxx

# ── Email ──
SMTP_HOST=smtp.resend.com
SMTP_USER=resend
SMTP_PASS=re_xxxxx
EMAIL_FROM=Lanework <notifications@yourdomain.com>

# ── SAP B1 ──
SAP_SERVICE_LAYER_URL=https://sap-server:50000/b1s/v1
SAP_USERNAME=manager
SAP_PASSWORD=your-sap-password
SAP_COMPANY_DB=SBODemoIN

# ── Parivahan (RTO) ──
PARIVAHAN_API_KEY=your-parivahan-key

# ── Fleet GPS ──
LOCONAV_API_KEY=your-loconav-key
```
