/**
 * Integration Setup Registry — centralized metadata for all 18 connectors.
 * Each entry defines: what the integration does, how to get API keys,
 * which env vars are needed, and step-by-step setup with real URLs.
 */
export interface IntegrationSetupStep {
  step: number;
  title: string;
  instruction: string; // markdown body
  helpUrl?: string;
  envVar?: string;
  screenshot?: string;
}

export interface IntegrationSetup {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  requiredEnvVars: string[];
  optionalEnvVars?: string[];
  setupSteps: IntegrationSetupStep[];
  helpLinks: { label: string; url: string }[];
  testAction: string;
  tier: 1 | 2 | 3; // 1=universal, 2=india-specific, 3=scale
}

export const INTEGRATION_SETUP: Record<string, IntegrationSetup> = {
  // ═══ TIER 1 — Universal ═══
  csv_import: {
    id: "csv_import",
    name: "CSV / Excel Import",
    icon: "file-spreadsheet",
    category: "Data Import",
    description: "Upload shipment, inventory, or order data via CSV or Excel files. No API keys required.",
    requiredEnvVars: [],
    setupSteps: [
      { step: 1, title: "Download template", instruction: "Download the CSV template from `/api/export/csv?entity=shipments&format=csv`. Switch `entity=shipments` to `inventory` or `orders` for other templates." },
      { step: 2, title: "Fill in your data", instruction: "Open the template in Excel or Google Sheets. Fill in one row per record. Keep the header row intact. Save as `.csv` (UTF-8)." },
      { step: 3, title: "Upload", instruction: "Go to **Dashboard → Import** and drag your CSV file, or POST it to `/api/import/csv` with `entity_type` field. That's it!" },
    ],
    helpLinks: [{ label: "CSV format docs", url: "/docs#csv" }],
    testAction: "download_template",
    tier: 1,
  },
  csv_export: {
    id: "csv_export",
    name: "CSV / Excel Export",
    icon: "download",
    category: "Data Export",
    description: "Export any dashboard, report, or agent data as CSV or Excel.",
    requiredEnvVars: [],
    setupSteps: [
      { step: 1, title: "Choose data source", instruction: "Go to any table (Shipments, Inventory, Orders, etc.) and click the **Export** button in the toolbar." },
      { step: 2, title: "Configure export", instruction: "Select columns, date range, and format (CSV or Excel). Click **Download**." },
      { step: 3, title: "Automate (optional)", instruction: "Use the URL `/api/export/csv?entity=shipments&format=csv&from=2024-01-01&to=2024-12-31` for scheduled exports via cron or Zapier." },
    ],
    helpLinks: [{ label: "Export API docs", url: "/docs#csv" }],
    testAction: "view_history",
    tier: 1,
  },
  whatsapp: {
    id: "whatsapp",
    name: "WhatsApp Business API",
    icon: "message-circle",
    category: "Communication",
    description: "Send tracking updates, NDR alerts, POD confirmations, and order intake via WhatsApp.",
    requiredEnvVars: ["WHATSAPP_PHONE_ID", "WHATSAPP_ACCESS_TOKEN"],
    setupSteps: [
      {
        step: 1, title: "Create a Meta App", envVar: "WHATSAPP_PHONE_ID",
        instruction: "Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App**. Select **Business** type. Name it 'Lanework'.",
        helpUrl: "https://developers.facebook.com/apps",
      },
      {
        step: 2, title: "Add WhatsApp product", envVar: "WHATSAPP_PHONE_ID",
        instruction: "In your app dashboard, click **Add Product** → **WhatsApp**. Follow the setup wizard. You'll get a **Phone Number ID** and a test phone number.",
        helpUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
      },
      {
        step: 3, title: "Get access token", envVar: "WHATSAPP_ACCESS_TOKEN",
        instruction: "Go to **WhatsApp → API Setup** in your Meta app. Under **Temporary access token**, click **Generate**. Copy the token. This is your `WHATSAPP_ACCESS_TOKEN`.",
        helpUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
      },
      {
        step: 4, title: "Paste credentials into Lanework",
        instruction: "Go to **Integrations → WhatsApp → Connect**. Paste:\n- `WHATSAPP_PHONE_ID` — from step 2\n- `WHATSAPP_ACCESS_TOKEN` — from step 3\n\nClick **Save & Test**.",
      },
      {
        step: 5, title: "Configure message templates (production only)",
        instruction: "Before going live, create message templates in Meta Business Manager. Go to **WhatsApp Manager → Message Templates**. Create templates for: shipment_picked_up, out_for_delivery, delivered, delayed, rto. Submit for approval.",
        helpUrl: "https://business.facebook.com/wa/manage/message-templates/",
      },
    ],
    helpLinks: [
      { label: "WhatsApp Cloud API Docs", url: "https://developers.facebook.com/docs/whatsapp/cloud-api" },
      { label: "Message Templates", url: "https://business.facebook.com/wa/manage/message-templates/" },
    ],
    testAction: "test_whatsapp",
    tier: 1,
  },
  google_sheets: {
    id: "google_sheets",
    name: "Google Sheets Sync",
    icon: "sheet",
    category: "Data Sync",
    description: "Two-way sync with Google Sheets — push shipments/orders to sheets, pull updates back.",
    requiredEnvVars: ["GOOGLE_SHEETS_API_KEY"],
    setupSteps: [
      {
        step: 1, title: "Enable Sheets API", envVar: "GOOGLE_SHEETS_API_KEY",
        instruction: "Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Library**. Search for **Google Sheets API** and click **Enable**.",
        helpUrl: "https://console.cloud.google.com/apis/library/sheets.googleapis.com",
      },
      {
        step: 2, title: "Create API key", envVar: "GOOGLE_SHEETS_API_KEY",
        instruction: "Go to **Credentials** → **Create Credentials → API Key**. Copy the key — this is your `GOOGLE_SHEETS_API_KEY`. **Restrict the key** to only Google Sheets API for security.",
        helpUrl: "https://console.cloud.google.com/apis/credentials",
      },
      {
        step: 3, title: "Make your sheet public (or share)",
        instruction: "Open your Google Sheet. Click **Share** (top-right). Set to **Anyone with the link can view** for read access. For write access, use a service account — see the advanced setup guide.",
      },
      {
        step: 4, title: "Get spreadsheet ID",
        instruction: "From your sheet URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit` — copy the `SPREADSHEET_ID` part. Paste it into Lanework's Google Sheets config.",
      },
    ],
    helpLinks: [
      { label: "Google Sheets API v4 Docs", url: "https://developers.google.com/sheets/api" },
      { label: "Google Cloud Console", url: "https://console.cloud.google.com" },
    ],
    testAction: "sync_sheet",
    tier: 1,
  },
  generic_webhook: {
    id: "generic_webhook",
    name: "Generic Webhook",
    icon: "webhook",
    category: "API / Webhook",
    description: "Configurable inbound/outbound webhook — connect any TMS, WMS, ERP.",
    requiredEnvVars: [],
    setupSteps: [
      { step: 1, title: "Copy your webhook URL", instruction: "Go to Integrations → Generic Webhook → click **Copy Webhook URL**. Lanework generates a unique inbound webhook endpoint for you." },
      { step: 2, title: "Configure in external system", instruction: "Paste the webhook URL into your TMS, WMS, ERP, or any system that supports webhooks. Set content type to `application/json`." },
      { step: 3, title: "Test the connection", instruction: "Click **Test Webhook** in Lanework, or send a test payload using curl. Check the webhook log to confirm events are received." },
    ],
    helpLinks: [{ label: "Webhook documentation", url: "/docs#webhooks" }],
    testAction: "test_webhook",
    tier: 1,
  },

  // ═══ TIER 2 — India-Specific ═══
  shiprocket: {
    id: "shiprocket",
    name: "Shiprocket",
    icon: "rocket",
    category: "Carrier Aggregator",
    description: "One integration → Delhivery, BlueDart, DTDC, Ecom Express, XpressBees, Shadowfax & more.",
    requiredEnvVars: ["SHIPROCKET_EMAIL", "SHIPROCKET_PASSWORD"],
    optionalEnvVars: ["SHIPROCKET_CHANNEL_ID"],
    setupSteps: [
      {
        step: 1, title: "Login to Shiprocket", envVar: "SHIPROCKET_EMAIL",
        instruction: "Login at [app.shiprocket.in](https://app.shiprocket.in). If you don't have an account, sign up first.",
        helpUrl: "https://app.shiprocket.in",
      },
      {
        step: 2, title: "Go to API settings",
        instruction: "In the left sidebar, go to **Settings → API**. Click **Generate Token** or view your existing API credentials.",
        helpUrl: "https://app.shiprocket.in/settings/api",
      },
      {
        step: 3, title: "Copy credentials",
        instruction: "Copy your **Email** (used to login) and **Password**. These are your `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD`. For multi-channel accounts, also note the **Channel ID**.",
      },
      {
        step: 4, title: "Paste into Lanework",
        instruction: "Go to **Integrations → Shiprocket → Connect**. Paste your email and password. Click **Save & Test**.",
      },
    ],
    helpLinks: [
      { label: "Shiprocket Dashboard", url: "https://app.shiprocket.in" },
      { label: "Shiprocket API Docs", url: "https://apidocs.shiprocket.in" },
    ],
    testAction: "track_shipment",
    tier: 2,
  },
  tally_prime: {
    id: "tally_prime",
    name: "TallyPrime",
    icon: "calculator",
    category: "Accounting",
    description: "Sync inventory, push orders as sales vouchers, check ledgers — the accounting system for Indian MSMEs.",
    requiredEnvVars: ["TALLY_REST_URL"],
    optionalEnvVars: ["TALLY_COMPANY"],
    setupSteps: [
      {
        step: 1, title: "Enable Tally REST server", envVar: "TALLY_REST_URL",
        instruction: "Open TallyPrime on your computer. Press **Ctrl+Alt+R**. This starts the Tally REST server. The default URL is `http://localhost:9000`.",
      },
      {
        step: 2, title: "Get your computer's IP",
        instruction: "If Lanework runs on a cloud server (Vercel), Tally must be accessible from the internet. Use [ngrok](https://ngrok.com) to expose `localhost:9000`: `ngrok http 9000`. Copy the ngrok URL.",
      },
      {
        step: 3, title: "Set company name", envVar: "TALLY_COMPANY",
        instruction: "In Tally, note your company name (visible in the top bar). Set this as `TALLY_COMPANY` if you have multiple companies. Default is auto-detect.",
      },
      {
        step: 4, title: "Paste into Lanework",
        instruction: "Go to **Integrations → TallyPrime → Connect**. Paste:\n- `TALLY_REST_URL` — `http://localhost:9000` or your ngrok URL\n- `TALLY_COMPANY` — your company name\n\nClick **Save & Test**.",
      },
    ],
    helpLinks: [
      { label: "Tally REST API Guide", url: "https://help.tallysolutions.com/article/Tally.ERP9/faq/tally-rest-api.htm" },
      { label: "ngrok download", url: "https://ngrok.com/download" },
    ],
    testAction: "sync_inventory",
    tier: 2,
  },
  gstn_eway_bill: {
    id: "gstn_eway_bill",
    name: "GSTN e-Way Bill API",
    icon: "file-check",
    category: "Compliance",
    description: "Auto-generate e-way bills from shipment data — GST compliance automated.",
    requiredEnvVars: ["GSTN_API_KEY"],
    setupSteps: [
      {
        step: 1, title: "Register for GSTN API access", envVar: "GSTN_API_KEY",
        instruction: "Go to [ewaybillgst.gov.in](https://ewaybillgst.gov.in) → **Registration → API Registration**. You need: valid GSTIN, registered mobile, and email.",
        helpUrl: "https://ewaybillgst.gov.in",
      },
      {
        step: 2, title: "Get API credentials",
        instruction: "After registration approval (1-3 business days), you'll receive a **Client ID**, **Client Secret**, and **API Key**. Store these securely.",
      },
      {
        step: 3, title: "Paste into Lanework",
        instruction: "Go to **Integrations → GSTN E-Way Bill → Connect**. Paste:\n- `GSTN_API_KEY` — your API key\n- For production, also set username and password in integration config.\n\nClick **Save & Test**.",
      },
      {
        step: 4, title: "Test with GSTIN validation",
        instruction: "Try the **Validate GSTIN** action with any valid GSTIN (e.g. `27AABCG2196N1Z1`). If it returns live data, you're connected!",
      },
    ],
    helpLinks: [
      { label: "GSTN E-Way Bill Portal", url: "https://ewaybillgst.gov.in" },
      { label: "GSTN Developer Portal", url: "https://gstn.org.in/developer" },
    ],
    testAction: "validate_gstin",
    tier: 2,
  },
  razorpay: {
    id: "razorpay",
    name: "Razorpay",
    icon: "credit-card",
    category: "Payments",
    description: "COD reconciliation, invoicing, payment tracking, and payment links for Indian logistics.",
    requiredEnvVars: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
    setupSteps: [
      {
        step: 1, title: "Login to Razorpay Dashboard", envVar: "RAZORPAY_KEY_ID",
        instruction: "Login at [dashboard.razorpay.com](https://dashboard.razorpay.com). If you don't have an account, sign up — it's free.",
        helpUrl: "https://dashboard.razorpay.com",
      },
      {
        step: 2, title: "Get API keys",
        instruction: "Go to **Settings → API Keys** (⚙️ icon in sidebar). You'll see **Key ID** and **Key Secret**. Click **Regenerate** if needed. **Download and store securely** — the secret is shown only once.",
        helpUrl: "https://dashboard.razorpay.com/app/keys",
      },
      {
        step: 3, title: "Switch to Live mode (production only)",
        instruction: "By default you get **Test** keys. When ready for production, switch the toggle in Razorpay dashboard to **Live Mode** and use the live Key ID + Key Secret.",
      },
      {
        step: 4, title: "Paste into Lanework",
        instruction: "Go to **Integrations → Razorpay → Connect**. Paste:\n- `RAZORPAY_KEY_ID` — from Razorpay dashboard\n- `RAZORPAY_KEY_SECRET` — from Razorpay dashboard\n\nClick **Save & Test**.",
      },
    ],
    helpLinks: [
      { label: "Razorpay Dashboard", url: "https://dashboard.razorpay.com" },
      { label: "Razorpay API Docs", url: "https://razorpay.com/docs/api" },
    ],
    testAction: "view_transactions",
    tier: 2,
  },

  // ═══ TIER 3 — Scale / Upmarket ═══
  mapmyindia: {
    id: "mapmyindia",
    name: "MapmyIndia API",
    icon: "map-pin",
    category: "Maps / Routing",
    description: "More accurate than Google Maps for Indian addresses, especially tier-2/3 cities.",
    requiredEnvVars: ["MAPMYINDIA_LICENSE_KEY"],
    setupSteps: [
      {
        step: 1, title: "Sign up on MapmyIndia", envVar: "MAPMYINDIA_LICENSE_KEY",
        instruction: "Go to [mapmyindia.com](https://www.mapmyindia.com) → **Sign Up** (free tier available). Verify your email.",
        helpUrl: "https://www.mapmyindia.com",
      },
      {
        step: 2, title: "Get license key",
        instruction: "Login → **Dashboard → API Keys**. Copy the **License Key / API Key**. The free tier includes 10,000 requests/day.",
        helpUrl: "https://www.mapmyindia.com/api/dashboard",
      },
      {
        step: 3, title: "Paste into Lanework",
        instruction: "Go to **Integrations → MapmyIndia → Connect**. Paste your license key. Click **Save & Test**.",
      },
    ],
    helpLinks: [
      { label: "MapmyIndia Dashboard", url: "https://www.mapmyindia.com/api/dashboard" },
      { label: "MapmyIndia API Docs", url: "https://www.mapmyindia.com/api/advanced-maps/doc" },
    ],
    testAction: "geocode",
    tier: 3,
  },
  shopify: {
    id: "shopify",
    name: "Shopify",
    icon: "shopping-cart",
    category: "E-Commerce",
    description: "Auto-sync orders, inventory, and fulfillment for D2C sellers.",
    requiredEnvVars: ["SHOPIFY_STORE_URL", "SHOPIFY_ACCESS_TOKEN"],
    setupSteps: [
      {
        step: 1, title: "Get store URL", envVar: "SHOPIFY_STORE_URL",
        instruction: "Your Shopify store URL is `https://YOUR-STORE.myshopify.com`. Note this down — it's your `SHOPIFY_STORE_URL`.",
      },
      {
        step: 2, title: "Create a custom app",
        instruction: "In Shopify Admin, go to **Settings → Apps and sales channels → Develop apps**. Click **Create an app**. Name it 'Lanework Sync'.",
        helpUrl: "https://admin.shopify.com/store/YOUR-STORE/settings/apps/development",
      },
      {
        step: 3, title: "Configure Admin API scopes",
        instruction: "In your custom app, go to **Configuration → Admin API integration → Configure**. Select these scopes: `read_orders`, `read_products`, `read_inventory`. Click **Save**.",
      },
      {
        step: 4, title: "Get access token", envVar: "SHOPIFY_ACCESS_TOKEN",
        instruction: "Go to **API credentials** tab. Click **Install app**. After installation, you'll see **Admin API access token**. Copy this — it's your `SHOPIFY_ACCESS_TOKEN`.",
      },
      {
        step: 5, title: "Paste into Lanework",
        instruction: "Go to **Integrations → Shopify → Connect**. Paste:\n- `SHOPIFY_STORE_URL` — your `.myshopify.com` URL\n- `SHOPIFY_ACCESS_TOKEN` — from step 4\n\nClick **Save & Test**.",
      },
    ],
    helpLinks: [
      { label: "Shopify Admin API Docs", url: "https://shopify.dev/docs/api/admin-rest" },
      { label: "Shopify Custom Apps", url: "https://help.shopify.com/en/manual/apps/custom-apps" },
    ],
    testAction: "sync_orders",
    tier: 3,
  },
  woocommerce: {
    id: "woocommerce",
    name: "WooCommerce",
    icon: "shopping-bag",
    category: "E-Commerce",
    description: "Order and inventory sync for WooCommerce stores.",
    requiredEnvVars: ["WOO_STORE_URL", "WOO_CONSUMER_KEY", "WOO_CONSUMER_SECRET"],
    setupSteps: [
      {
        step: 1, title: "Enable REST API", envVar: "WOO_STORE_URL",
        instruction: "In WordPress Admin, go to **WooCommerce → Settings → Advanced → REST API**. Click **Add Key**.",
        helpUrl: "https://your-store.com/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys",
      },
      {
        step: 2, title: "Generate API keys",
        instruction: "Description: 'Lanework'. User: select an admin user. Permissions: **Read/Write**. Click **Generate API Key**. You'll get a **Consumer Key** and **Consumer Secret**. **Copy both immediately** — the secret is shown only once.",
      },
      {
        step: 3, title: "Note your store URL",
        instruction: "Your `WOO_STORE_URL` is your WordPress site URL, e.g. `https://your-store.com`. Do NOT include `/wp-admin` or trailing slash.",
      },
      {
        step: 4, title: "Paste into Lanework",
        instruction: "Go to **Integrations → WooCommerce → Connect**. Paste:\n- `WOO_STORE_URL` — your WordPress URL\n- `WOO_CONSUMER_KEY` — from step 2\n- `WOO_CONSUMER_SECRET` — from step 2\n\nClick **Save & Test**.",
      },
    ],
    helpLinks: [
      { label: "WooCommerce REST API Docs", url: "https://woocommerce.com/document/woocommerce-rest-api/" },
      { label: "WooCommerce API Keys", url: "https://woocommerce.com/document/woocommerce-rest-api/#section-2" },
    ],
    testAction: "sync_orders",
    tier: 3,
  },
  amazon_seller: {
    id: "amazon_seller",
    name: "Amazon Seller Central",
    icon: "package",
    category: "E-Commerce",
    description: "FBA and MFN order sync, inventory management.",
    requiredEnvVars: ["AMAZON_SELLER_ID", "AMAZON_AUTH_TOKEN"],
    setupSteps: [
      {
        step: 1, title: "Login to Seller Central",
        instruction: "Login at [sellercentral.amazon.com](https://sellercentral.amazon.com). Go to **Settings → User Permissions**.",
        helpUrl: "https://sellercentral.amazon.com",
      },
      {
        step: 2, title: "Get developer credentials",
        instruction: "Go to **Apps & Services → Develop Apps**. Create a new app. You'll get a **Seller ID** and **Auth Token**. For SP-API, you'll also need an IAM role ARN.",
        helpUrl: "https://developer.amazonservices.com",
      },
      {
        step: 3, title: "Configure permissions",
        instruction: "Enable these API permissions: Orders (read), Inventory (read), Fulfillment (read). Grant access to your app in Seller Central.",
      },
      {
        step: 4, title: "Paste into Lanework",
        instruction: "Go to **Integrations → Amazon Seller → Connect**. Paste your credentials. Click **Save & Test**.",
      },
    ],
    helpLinks: [
      { label: "Amazon Seller Central", url: "https://sellercentral.amazon.com" },
      { label: "SP-API Developer Guide", url: "https://developer-docs.amazon.com/sp-api" },
    ],
    testAction: "sync_orders",
    tier: 3,
  },
  flipkart_seller: {
    id: "flipkart_seller",
    name: "Flipkart Seller",
    icon: "truck",
    category: "E-Commerce",
    description: "Order sync and fulfillment for Flipkart sellers.",
    requiredEnvVars: ["FLIPKART_API_KEY", "FLIPKART_API_SECRET"],
    setupSteps: [
      {
        step: 1, title: "Login to Flipkart Seller Hub",
        instruction: "Login at [seller.flipkart.com](https://seller.flipkart.com). Go to **Settings → API**.",
        helpUrl: "https://seller.flipkart.com",
      },
      {
        step: 2, title: "Generate API keys",
        instruction: "Click **Generate API Key**. You'll receive an **API Key** and **API Secret**. **Store the secret immediately**.",
      },
      {
        step: 3, title: "Note your Seller ID",
        instruction: "Your Seller ID is visible in your Flipkart Seller Hub profile. This is your `FLIPKART_SELLER_ID`.",
      },
      {
        step: 4, title: "Paste into Lanework",
        instruction: "Go to **Integrations → Flipkart Seller → Connect**. Paste your API key and secret. Click **Save & Test**.",
      },
    ],
    helpLinks: [
      { label: "Flipkart Seller Hub", url: "https://seller.flipkart.com" },
      { label: "Flipkart API Docs", url: "https://seller.flipkart.com/api-docs" },
    ],
    testAction: "sync_orders",
    tier: 3,
  },
  loconav: {
    id: "loconav",
    name: "LocoNav",
    icon: "navigation",
    category: "Fleet Telematics",
    description: "Real-time GPS, fuel monitoring, driver behavior, and vehicle diagnostics.",
    requiredEnvVars: ["FLEET_API_SECRET"],
    setupSteps: [
      {
        step: 1, title: "Login to LocoNav",
        instruction: "Login at [loconav.com](https://www.loconav.com). Go to **Developer → API** or contact LocoNav support for API access.",
        helpUrl: "https://www.loconav.com",
      },
      {
        step: 2, title: "Get API secret", envVar: "FLEET_API_SECRET",
        instruction: "In the developer dashboard, generate an **API Key / Secret**. Copy the secret. This is your `FLEET_API_SECRET`.",
      },
      {
        step: 3, title: "Paste into Lanework",
        instruction: "Go to **Integrations → LocoNav → Connect**. Paste your API secret. Click **Save & Test**. Lanework will pull vehicle locations, status, and alerts.",
      },
    ],
    helpLinks: [
      { label: "LocoNav", url: "https://www.loconav.com" },
    ],
    testAction: "track_all",
    tier: 3,
  },
  fleetx: {
    id: "fleetx",
    name: "FleetX",
    icon: "activity",
    category: "Fleet Telematics",
    description: "Vehicle tracking, fuel management, trip analytics, and driver performance.",
    requiredEnvVars: ["FLEET_API_SECRET"],
    setupSteps: [
      {
        step: 1, title: "Login to FleetX",
        instruction: "Login at [fleetx.io](https://www.fleetx.io). Go to **Settings → API**.",
        helpUrl: "https://www.fleetx.io",
      },
      {
        step: 2, title: "Get API token", envVar: "FLEET_API_SECRET",
        instruction: "Generate an **API token**. Copy it — this is your `FLEET_API_SECRET`.",
      },
      {
        step: 3, title: "Paste into Lanework",
        instruction: "Go to **Integrations → FleetX → Connect**. Paste your API token. Click **Save & Test**.",
      },
    ],
    helpLinks: [
      { label: "FleetX", url: "https://www.fleetx.io" },
    ],
    testAction: "track_all",
    tier: 3,
  },
  sap_b1: {
    id: "sap_b1",
    name: "SAP Business One",
    icon: "building",
    category: "ERP",
    description: "Full ERP integration for mid-market / larger MSMEs running SAP B1.",
    requiredEnvVars: ["SAP_SERVICE_LAYER_URL", "SAP_COMPANY_DB"],
    setupSteps: [
      {
        step: 1, title: "Enable Service Layer", envVar: "SAP_SERVICE_LAYER_URL",
        instruction: "Service Layer must be enabled on your SAP B1 server. The default URL is `https://your-server:50000/b1s/v1`. Contact your SAP admin to confirm the URL and port.",
      },
      {
        step: 2, title: "Create a Service Layer user",
        instruction: "In SAP B1, create a dedicated user (e.g., `LANEWORK_API`) with read access to Business Partners, Items, Orders, and Deliveries. Do NOT use the manager account.",
      },
      {
        step: 3, title: "Get company DB name", envVar: "SAP_COMPANY_DB",
        instruction: "The company database name (e.g., `SBODemoIN`) is visible in SAP B1 login screen or Service Layer login. This is your `SAP_COMPANY_DB`.",
      },
      {
        step: 4, title: "Configure in Lanework",
        instruction: "Go to **Integrations → SAP B1 → Connect**. Provide:\n- Service Layer URL\n- Username & Password (from step 2)\n- Company DB (from step 3)\n\nClick **Save & Test**.",
      },
    ],
    helpLinks: [
      { label: "SAP B1 Service Layer Docs", url: "https://help.sap.com/docs/SAP_BUSINESS_ONE" },
      { label: "SAP B1 Developer Portal", url: "https://blogs.sap.com/tag/sap-business-one-service-layer/" },
    ],
    testAction: "sync_orders",
    tier: 3,
  },
};

/** Get setup for a specific integration ID. Returns null if not found. */
export function getIntegrationSetup(id: string): IntegrationSetup | null {
  return INTEGRATION_SETUP[id] || null;
}

/** List all integration IDs */
export function getAllIntegrationIds(): string[] {
  return Object.keys(INTEGRATION_SETUP);
}

/** Get all integrations grouped by tier */
export function getIntegrationsByTier(): { tier1: IntegrationSetup[]; tier2: IntegrationSetup[]; tier3: IntegrationSetup[] } {
  const tier1: IntegrationSetup[] = [];
  const tier2: IntegrationSetup[] = [];
  const tier3: IntegrationSetup[] = [];
  for (const [_, setup] of Object.entries(INTEGRATION_SETUP)) {
    if (setup.tier === 1) tier1.push(setup);
    else if (setup.tier === 2) tier2.push(setup);
    else tier3.push(setup);
  }
  return { tier1, tier2, tier3 };
}
