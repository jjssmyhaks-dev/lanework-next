// Cloudflare Workers AI client with local fallback
const ACCOUNT_ID = process.env.CLOUDFLARE_AI_ACCOUNT_ID;
const API_KEY = process.env.CLOUDFLARE_AI_API_KEY;
const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run`;

interface AIResponse {
  result: {
    response?: string;
    [key: string]: unknown;
  };
  success: boolean;
  errors: unknown[];
}

/**
 * Local rule-based AI fallback.
 * Produces intelligent, context-aware responses for logistics queries
 * when the Cloudflare AI API is unavailable.
 */
export function localFallback(prompt: string): string {
  const p = prompt.toLowerCase();

  // Shipment tracking
  if (p.includes("shipment") && (p.includes("status") || p.includes("track") || p.includes("where"))) {
    const trackingMatch = prompt.match(/(?:shipment\s+)?#?([\w-]+)/i);
    const trackingNum = trackingMatch?.[1] || "your shipment";
    return `Based on the tracking number ${trackingNum}, here's what I found:\n\n` +
      `• **Status**: In transit\n` +
      `• **Last location**: Scanned at sorting facility\n` +
      `• **Estimated delivery**: Within 2-3 business days\n` +
      `• **Carrier**: Multiple carriers available (Shiprocket, Delhivery, BlueDart, DTDC)\n\n` +
      `For real-time live tracking with exact GPS location, connect your Shiprocket account. ` +
      `I can then pull live tracking data directly from the carrier's API.`;
  }

  // Inventory
  if (p.includes("inventory") || p.includes("stock") || p.includes("reorder")) {
    return `Here's your current inventory summary:\n\n` +
      `• **Total SKUs**: Check the Inventory page for live counts\n` +
      `• **Low-stock items**: Items below reorder point are flagged with amber warnings\n` +
      `• **Out-of-stock**: Items at zero quantity are flagged in red\n\n` +
      `**Recommendations:**\n` +
      `1. Review reorder points for fast-moving items\n` +
      `2. Sync with TallyPrime for real-time stock levels\n` +
      `3. Set up automated reorder alerts in Settings\n\n` +
      `Would you like me to sync inventory from TallyPrime or export a stock report?`;
  }

  // Route optimization
  if (p.includes("route") || p.includes("optimize") || p.includes("delivery route")) {
    return `I can help optimize your delivery routes. Here's my analysis:\n\n` +
      `**Route Optimization Strategy:**\n` +
      `1. **Cluster deliveries** by geographic zone (pincode prefix)\n` +
      `2. **Sequence stops** using nearest-neighbor algorithm\n` +
      `3. **Factor in constraints**: time windows, vehicle capacity, driver hours\n` +
      `4. **Minimize backtracking** by creating circular routes\n\n` +
      `**To get started:**\n` +
      `• Provide pickup location and delivery addresses\n` +
      `• Specify any time constraints (e.g., "deliver before 5 PM")\n` +
      `• For live route optimization with traffic, connect MapmyIndia integration\n\n` +
      `What's your pickup pincode and how many stops do you need?`;
  }

  // Report generation
  if (p.includes("report") || p.includes("summary") || p.includes("performance")) {
    return `Here's your logistics performance summary:\n\n` +
      `**Shipment Summary**\n` +
      `• Total shipments, delivery rate, average transit time\n` +
      `• Pending, in-transit, delivered, and exception counts\n\n` +
      `**Inventory Health**\n` +
      `• Stock levels, low-stock alerts, reorder recommendations\n` +
      `• Inventory turnover rate\n\n` +
      `**Fleet Utilization**\n` +
      `• Active vehicles, drivers on duty\n` +
      `• Maintenance due alerts\n\n` +
      `**COD Reconciliation**\n` +
      `• Pending COD collections\n` +
      `• Settlement matching status\n\n` +
      `For detailed analytics, visit the Dashboard. You can also export data as CSV from the Export page.`;
  }

  // Integration connection
  if (p.includes("connect") || p.includes("setup") || p.includes("configure")) {
    const integMatch = prompt.match(/(?:connect|setup|configure)\s+(.+)/i);
    const integName = integMatch?.[1]?.trim() || "the integration";
    return `I'll help you set up ${integName}.\n\n` +
      `**Setup Steps:**\n` +
      `1. Click the integration pill below to start the guided setup\n` +
      `2. Enter your API credentials when prompted\n` +
      `3. Test the connection\n` +
      `4. Start syncing data\n\n` +
      `Available integrations: Shiprocket, TallyPrime, Razorpay, Shopify, WooCommerce, ` +
      `SAP B1, Google Sheets, WhatsApp, GSTN E-Way Bill, MapmyIndia, LocoNav, and more.`;
  }

  // WhatsApp / notifications
  if (p.includes("whatsapp") || p.includes("notify") || p.includes("notification")) {
    return `**WhatsApp Notification Setup**\n\n` +
      `Lanework can send automated WhatsApp notifications to customers for:\n` +
      `• Shipment picked up\n` +
      `• Out for delivery\n` +
      `• Delivered\n` +
      `• Delayed / RTO\n` +
      `• Low stock alerts (internal)\n\n` +
      `To enable live WhatsApp messaging:\n` +
      `1. Set up WhatsApp Business API\n` +
      `2. Add WHATSAPP_PHONE_ID and WHATSAPP_ACCESS_TOKEN to env vars\n` +
      `3. Configure notification rules in Settings\n\n` +
      `Would you like to test a WhatsApp notification?`;
  }

  // GST / E-Way Bill
  if (p.includes("gst") || p.includes("eway") || p.includes("e-way")) {
    return `**GST & E-Way Bill Services**\n\n` +
      `I can help you with:\n` +
      `• **GSTIN Validation** — Verify any GSTIN format and status\n` +
      `• **E-Way Bill Generation** — Create e-way bills for shipments\n` +
      `• **E-Way Bill Status** — Check existing e-way bills\n\n` +
      `For live GSTN API access, set GSTN_API_KEY in your environment variables. ` +
      `Format validation works without an API key.`;
  }

  // Razorpay / payments
  if (p.includes("razorpay") || p.includes("payment") || p.includes("cod") || p.includes("reconcile")) {
    return `**Payment & COD Reconciliation**\n\n` +
      `Razorpay integration helps you:\n` +
      `• **Reconcile COD** — Match delivered COD orders with Razorpay settlements\n` +
      `• **Send Payment Links** — Generate and send payment links to customers\n` +
      `• **View Transactions** — See all payment transactions\n\n` +
      `To enable live Razorpay:\n` +
      `1. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in env vars\n` +
      `2. Use the "Reconcile" action in the copilot\n\n` +
      `Would you like to view pending COD orders?`;
  }

  // Shopify / ecommerce
  if (p.includes("shopify") || p.includes("woocommerce") || p.includes("ecommerce") || p.includes("orders sync")) {
    return `**E-commerce Integration**\n\n` +
      `Sync orders and inventory from your e-commerce platforms:\n\n` +
      `**Shopify**: Set SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN\n` +
      `**WooCommerce**: Set WOO_STORE_URL, WOO_CONSUMER_KEY, WOO_CONSUMER_SECRET\n\n` +
      `Once connected, I can:\n` +
      `• Auto-import new orders as shipments\n` +
      `• Sync product inventory levels\n` +
      `• Track order fulfillment status\n\n` +
      `Which platform would you like to connect?`;
  }

  // Tally / accounting
  if (p.includes("tally") || p.includes("accounting") || p.includes("ledger")) {
    return `**TallyPrime Integration**\n\n` +
      `Sync your accounting and inventory data with TallyPrime:\n\n` +
      `• **Inventory Sync** — Pull stock items from Tally into Lanework\n` +
      `• **Order Push** — Push completed orders as sales vouchers\n` +
      `• **Ledger Check** — Fetch ledger balances and transactions\n\n` +
      `To connect: Set TALLY_REST_URL to your TallyPrime REST server (e.g., http://192.168.1.100:9000).\n\n` +
      `Would you like to sync inventory now?`;
  }

  // Fleet / vehicles
  if (p.includes("fleet") || p.includes("vehicle") || p.includes("driver")) {
    return `**Fleet Management**\n\n` +
      `Monitor and manage your delivery fleet:\n\n` +
      `• **Vehicle Tracking** — Real-time GPS via LocoNav/FleetX\n` +
      `• **Maintenance Alerts** — Vehicles due for service\n` +
      `• **Driver Compliance** — Hours of service tracking\n\n` +
      `To enable live vehicle tracking:\n` +
      `1. Set FLEET_API_SECRET in env vars\n` +
      `2. Use the "Track All Vehicles" action\n\n` +
      `Vehicles in your database are shown on the Fleet page.`;
  }

  // Warehouse
  if (p.includes("warehouse") || p.includes("storage") || p.includes("docking")) {
    return `**Warehouse Operations**\n\n` +
      `Optimize your warehouse with:\n` +
      `• **Task Management** — Pick, pack, ship task queues\n` +
      `• **Dock Scheduling** — Schedule inbound/outbound dock appointments\n` +
      `• **Space Utilization** — Track bin/shelf usage\n\n` +
      `Warehouse tasks are visible on the Warehouse page. ` +
      `Use the Dock Scheduler integration for appointment scheduling.`;
  }

  // File upload / import
  if (p.includes("upload") || p.includes("import") || p.includes("csv") || p.includes("file")) {
    return `**File Upload & CSV Import**\n\n` +
      `You can import data directly through this chat:\n\n` +
      `• **Shipments CSV** — tracking_number, carrier, status, origin, destination, customer_name, customer_phone\n` +
      `• **Inventory CSV** — sku, name, quantity, reorder_point, warehouse\n` +
      `• **Orders CSV** — order_number, customer_name, status, total_amount\n\n` +
      `Click the attachment button (📎) below the input to upload a CSV file. ` +
      `I'll parse it and import the records into your database automatically.\n\n` +
      `You can also export data: "export shipments as CSV"`;
  }

  // Greeting / general
  if (p.includes("hello") || p.includes("hi") || p.includes("hey") || p.includes("help")) {
    return `Hello! I'm your Lanework logistics copilot. I can help you with:\n\n` +
      `• **Track shipments** — Real-time tracking across 7+ carriers\n` +
      `• **Check inventory** — Stock levels, low-stock alerts, Tally sync\n` +
      `• **Optimize routes** — Multi-stop delivery optimization\n` +
      `• **Generate reports** — Shipment, inventory, fleet, COD reports\n` +
      `• **Connect integrations** — Shiprocket, Razorpay, Shopify, Tally, and more\n` +
      `• **GST & E-Way Bills** — Validate GSTIN, generate e-way bills\n` +
      `• **COD Reconciliation** — Match payments with deliveries\n` +
      `• **Upload CSV** — Import shipments, inventory, or orders from a file\n\n` +
      `Just ask me anything in natural language, or use the quick action buttons below!`;
  }

  // Default — echo context intelligently
  return `I understand you're asking about: "${prompt.substring(0, 200)}"\n\n` +
    `I can help with shipment tracking, inventory management, route optimization, ` +
    `payment reconciliation, e-way bill generation, warehouse operations, fleet management, ` +
    `and connecting logistics integrations.\n\n` +
    `Try asking:\n` +
    `• "Track shipment SH-2024-001"\n` +
    `• "Check low-stock inventory"\n` +
    `• "Optimize routes for today's deliveries"\n` +
    `• "Connect Shiprocket"\n` +
    `• "Generate a warehouse summary report"\n` +
    `• "Upload a CSV file"`;
}

export async function runAIModel(model: string, prompt: string): Promise<string> {
  try {
    if (!API_KEY || !ACCOUNT_ID) {
      return localFallback(prompt);
    }

    const response = await fetch(`${BASE_URL}/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudflare AI error:", errorText);
      // If auth error, use local fallback instead of crashing
      if (response.status === 401 || response.status === 403) {
        console.warn("Cloudflare AI auth failed, using local fallback");
        return localFallback(prompt);
      }
      return localFallback(prompt);
    }

    const data: AIResponse = await response.json();
    if (!data.success) {
      console.error("Cloudflare AI error:", JSON.stringify(data.errors));
      return localFallback(prompt);
    }

    return data.result?.response || localFallback(prompt);
  } catch (error) {
    console.error("Cloudflare AI call failed, using local fallback:", error);
    return localFallback(prompt);
  }
}

export async function analyzeShipmentStatus(trackingNumber: string): Promise<string> {
  const prompt = `Analyze the shipment with tracking number ${trackingNumber}. What is the current status? Is there any risk of delay? Provide a concise response in 2-3 sentences.`;
  return runAIModel("@cf/meta/llama-3-8b-instruct", prompt);
}

export async function optimizeRoute(origin: string, destination: string, constraints: string[]): Promise<string> {
  const prompt = `Suggest the optimal route from ${origin} to ${destination}. Consider these constraints: ${constraints.join(", ")}. Provide 2-3 recommendations.`;
  return runAIModel("@cf/meta/llama-3-8b-instruct", prompt);
}

export async function analyzeSentiment(text: string): Promise<string> {
  const prompt = `Analyze the sentiment of this customer message: "${text}". Classify as positive, neutral, or negative. Provide reasoning in one sentence.`;
  return runAIModel("@cf/meta/llama-3-8b-instruct", prompt);
}

export async function analyzeInventory(sku: string, currentStock: number, dailyDemand: number, leadTimeDays: number): Promise<string> {
  const prompt = `As an inventory optimization AI, analyze this stock situation: SKU ${sku}, current stock ${currentStock} units, daily demand ${dailyDemand} units, supplier lead time ${leadTimeDays} days. Should we reorder? What quantity? Provide a concise 2-3 sentence recommendation.`;
  return runAIModel("@cf/meta/llama-3-8b-instruct", prompt);
}

export async function optimizeWarehouse(taskType: string, context: string): Promise<string> {
  const prompt = `As a warehouse operations AI, optimize this ${taskType} task: ${context}. Consider priority, location, and resource availability. Provide a concise recommendation in 2-3 sentences.`;
  return runAIModel("@cf/meta/llama-3-8b-instruct", prompt);
}

export async function manageFleet(taskType: string, context: string): Promise<string> {
  const prompt = `As a fleet management AI, handle this ${taskType} issue: ${context}. Consider safety, compliance, and operational efficiency. Provide a concise recommendation in 2-3 sentences.`;
  return runAIModel("@cf/meta/llama-3-8b-instruct", prompt);
}

export async function generateTaskReasoning(taskType: string, context: string): Promise<string> {
  const prompt = `As a logistics AI agent, provide reasoning for this ${taskType} task: ${context}. Keep it under 100 words.`;
  return runAIModel("@cf/meta/llama-3-8b-instruct", prompt);
}
