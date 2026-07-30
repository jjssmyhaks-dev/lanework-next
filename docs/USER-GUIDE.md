# Lanework — User Guide

**For logistics operators, not programmers.** This guide explains how to use Lanework without any technical knowledge.

---

## What is Lanework?

Lanework is like having a smart assistant that handles your daily logistics tasks — tracking packages, managing inventory, planning delivery routes — all from one website. It connects to the tools you already use (shipping, accounting, WhatsApp, spreadsheets).

---

## Getting Started

### 1. Sign Up

1. Go to the Lanework website
2. Click **"Get Started"** or **"Register"**
3. Enter your name, email, and a password
4. Click **"Create Account"**

You'll be taken to your Dashboard — your command center.

### 2. Your Dashboard

The Dashboard shows you everything at a glance:

| Card | What it shows |
|------|--------------|
| **Active Shipments** | How many packages are currently in transit |
| **Inventory Items** | How many different products you have in stock |
| **Vehicles** | How many trucks/bikes are active |
| **Pending Orders** | Orders waiting to be processed |

If you're new and haven't added any data yet, the Dashboard will show **"Set up your account"** with step-by-step guidance.

### 3. Connect Your Tools

The **Connections** page is where you link Lanework to your existing services:

1. Click **"Connections"** in the left sidebar
2. You'll see cards for each service you can connect
3. Click **"Connect"** on any card
4. Follow the simple steps that appear

**Example — Connecting Shiprocket:**
1. Click "Connect" on the Shiprocket card
2. The setup guide shows: "Login to Shiprocket → Go to Settings → Copy your Email and Password"
3. Click "I've done this — Connect now"
4. You're connected! Click "Use this tool" to track packages, compare rates, or create shipments

**You don't need to connect everything.** Just connect the tools you actually use.

### 4. Using a Connected Tool

After connecting, click **"Use this tool"** on the card. You'll see buttons like:

| Button | What it does |
|--------|-------------|
| **Find a package** | Enter a tracking number to see where it is |
| **Compare delivery prices** | See which courier is cheapest for your route |
| **Create a new shipment** | Book a delivery with the best courier |
| **Update stock levels** | Pull latest inventory counts from your accounting software |

Click any button and Lanework does the work — showing you results in plain language.

---

## Main Pages

### Shipments
Track all your outgoing packages. See status (in transit, delivered, delayed), carrier, and customer details. Click any shipment for the full tracking history.

### Inventory
See what products you have in stock, what's running low, and what needs reordering. Connects to TallyPrime or Google Sheets to stay in sync automatically.

### Routes
Plan delivery routes for your drivers. Lanework calculates the fastest path, estimates arrival times, and can re-route if there's a delay or bad weather.

### Warehouse
Manage your warehouse operations — dock scheduling, pick lists, and barcode scanning for accuracy.

### Fleet
Track your vehicles in real-time. See maintenance schedules, driver hours, and vehicle compliance status.

### Customers
Your customer directory — names, phone numbers, addresses, and order history all in one place.

### Agents
Your AI assistants. Each one handles a specific job:
- **Shipment Tracking** — Follows every package from pickup to delivery
- **Inventory Management** — Monitors stock levels and reorder points
- **Route Optimization** — Plans the most efficient delivery routes
- **Warehouse Operations** — Manages dock slots and pick runs
- **Fleet Management** — Tracks vehicles and schedules maintenance
- **Customer Communication** — Sends WhatsApp/email updates to customers

---

## Common Tasks

### Track a Package

1. Go to **Connections** → find Shiprocket/your carrier
2. Click **"Use this tool"**
3. Click **"Find a package"**
4. Pick a tracking number from the list
5. See the current location and delivery status

### Send a WhatsApp Update to a Customer

1. Go to **Connections** → **WhatsApp Business**
2. Connect your WhatsApp Business account
3. Click **"Set notification rules"**
4. Choose which events trigger messages (e.g., "Package out for delivery")
5. Lanework automatically sends updates when those events happen

### Check Stock Levels

1. Go to **Connections** → **TallyPrime**
2. Click **"Update stock levels"**
3. Lanework pulls the latest numbers from your accounting software
4. Go to **Inventory** page to see everything

---

## Troubleshooting

### "Couldn't connect" error
- Make sure you have the correct login details for that service
- Check if the service is currently working (try logging into it directly)
- Try disconnecting and reconnecting

### "API key needed" message
- Some services need extra setup (like an API key from their website)
- The setup guide for each connection shows exactly where to find this
- Contact the service provider if you can't find the key

### Page shows "Loading..." for a long time
- Refresh the page
- Check your internet connection
- Wait a minute and try again

### Data looks wrong or outdated
- For connected tools: click **"Update"** or **"Sync"** to refresh
- For manual data: edit it on the relevant page (Shipments, Inventory, etc.)

---

## Need Help?

- **Documentation**: Click **"Docs"** in the navigation bar
- **Email**: support@lanework.com

---

## Glossary

| Term | Plain Meaning |
|------|--------------|
| **AWB** | Air Waybill — just a tracking number for your package |
| **Carrier** | The delivery company (BlueDart, Delhivery, FedEx, etc.) |
| **Pincode** | The 6-digit postal code for pickup or delivery |
| **GSTIN** | Your GST registration number (for e-way bills) |
| **API Key** | A password that lets two software systems talk to each other |
| **Webhook** | A way for one system to automatically send data to another |
