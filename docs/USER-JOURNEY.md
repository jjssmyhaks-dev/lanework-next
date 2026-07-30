<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LaneWork — User Journey Walkthrough</title>
<style>
  /* ═══════════════════════════════════════════════ */
  /* Tailwind-lite inline design system              */
  /* ═══════════════════════════════════════════════ */
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#1e293b;line-height:1.6}
  .container{max-width:960px;margin:0 auto;padding:0 24px}

  /* Hero */
  .hero{background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#334155 100%);color:#fff;padding:80px 0 60px;text-align:center;position:relative;overflow:hidden}
  .hero::after{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle at 30% 70%,rgba(59,130,246,.15) 0%,transparent 60%),radial-gradient(circle at 70% 30%,rgba(16,185,129,.10) 0%,transparent 60%);pointer-events:none}
  .hero h1{font-size:clamp(2rem,5vw,3.2rem);font-weight:800;letter-spacing:-0.03em;margin-bottom:16px;position:relative;z-index:1}
  .hero p{font-size:1.15rem;opacity:.85;max-width:600px;margin:0 auto;position:relative;z-index:1}
  .badge{display:inline-block;background:rgba(59,130,246,.2);color:#93c5fd;border:1px solid rgba(59,130,246,.3);padding:4px 14px;border-radius:99px;font-size:.8rem;font-weight:600;letter-spacing:.04em;margin-bottom:20px;position:relative;z-index:1}

  /* Sections */
  section{padding:64px 0}
  section:nth-child(even){background:#fff}
  section:nth-child(odd){background:#f8fafc}
  .section-header{text-align:center;margin-bottom:48px}
  .section-header .step-num{display:inline-block;background:#3b82f6;color:#fff;font-size:.75rem;font-weight:800;padding:4px 12px;border-radius:99px;letter-spacing:.05em;margin-bottom:12px}
  .section-header h2{font-size:clamp(1.5rem,3vw,2rem);font-weight:700;margin-bottom:8px}
  .section-header p{color:#64748b;max-width:500px;margin:0 auto}

  /* Cards */
  .card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;transition:box-shadow .2s,transform .2s}
  .card:hover{box-shadow:0 8px 30px rgba(0,0,0,.06);transform:translateY(-2px)}
  .card .card-icon{font-size:2rem;margin-bottom:12px}
  .card h3{font-size:1.15rem;font-weight:700;margin-bottom:8px}
  .card p{color:#64748b;font-size:.9rem}

  /* Screens */
  .screen{border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.04);margin-top:32px}
  .screen-header{background:#f1f5f9;padding:10px 18px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #e2e8f0}
  .screen-dot{width:10px;height:10px;border-radius:50%}
  .screen-dot:nth-child(1){background:#ef4444}.screen-dot:nth-child(2){background:#f59e0b}.screen-dot:nth-child(3){background:#10b981}
  .screen-body{padding:0}
  .screen-inset{padding:32px}
  .screen-inset h4{font-size:1.05rem;font-weight:700;margin-bottom:12px}

  /* Mock UI elements */
  .mock-nav{background:#fff;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;font-size:.85rem;font-weight:600}
  .mock-nav .logo{font-weight:800;font-size:1.1rem;color:#0f172a;display:flex;align-items:center;gap:8px}
  .mock-nav .nav-links{display:flex;gap:20px}
  .mock-nav .nav-links span{color:#64748b;cursor:pointer}
  .mock-nav .nav-avatar{width:32px;height:32px;border-radius:50%;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem}

  .mock-chat{border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}
  .mock-chat-msg{padding:16px 18px;display:flex;gap:12px;align-items:flex-start}
  .mock-chat-msg.user{background:#fff}
  .mock-chat-msg.ai{background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0}
  .mock-chat-msg .avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;flex-shrink:0}
  .mock-chat-msg .avatar.user-av{background:#3b82f6;color:#fff}
  .mock-chat-msg .avatar.ai-av{background:#10b981;color:#fff}
  .mock-chat-input{border-top:1px solid #e2e8f0;padding:14px 18px;display:flex;gap:10px;align-items:center}
  .mock-input{flex:1;padding:10px 14px;border:1px solid #e2e8f0;border-radius:10px;font-size:.85rem;color:#94a3b8;background:#f8fafc}

  .mock-field{margin-bottom:16px}
  .mock-field label{display:block;font-size:.8rem;font-weight:600;color:#475569;margin-bottom:4px}
  .mock-field input,.mock-field select{width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:10px;font-size:.85rem;background:#fff}
  .mock-field input:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1)}

  .mock-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:10px;font-weight:600;font-size:.85rem;cursor:pointer;border:none;transition:all .15s}
  .mock-btn.primary{background:#3b82f6;color:#fff}
  .mock-btn.primary:hover{background:#2563eb}
  .mock-btn.outline{background:#fff;color:#3b82f6;border:1px solid #3b82f6}
  .mock-btn.sm{padding:6px 14px;font-size:.78rem}
  .mock-btn.green{background:#10b981;color:#fff;font-size:.75rem;padding:4px 12px}

  .mock-tag{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:6px;font-size:.7rem;font-weight:600}
  .mock-tag.blue{background:#eff6ff;color:#2563eb}
  .mock-tag.green{background:#ecfdf5;color:#059669}

  .mock-stat{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px}
  .mock-stat .val{font-size:1.6rem;font-weight:800;color:#0f172a}
  .mock-stat .lbl{font-size:.78rem;color:#64748b;margin-top:2px}

  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:24px}
  .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
  .grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}

  .callout{background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:20px 24px;display:flex;gap:14px;align-items:flex-start;margin-top:24px}
  .callout.green{background:#ecfdf5;border-color:#a7f3d0}
  .callout.amber{background:#fffbeb;border-color:#fde68a}
  .callout .callout-icon{font-size:1.4rem;flex-shrink:0}
  .callout p{font-size:.9rem;color:#334155}

  .timeline{position:relative;padding-left:32px}
  .timeline::before{content:'';position:absolute;left:12px;top:8px;bottom:8px;width:2px;background:#e2e8f0}
  .timeline-step{position:relative;margin-bottom:28px}
  .timeline-step::before{content:'';position:absolute;left:-26px;top:4px;width:12px;height:12px;border-radius:50%;background:#3b82f6;border:2px solid #fff;box-shadow:0 0 0 2px #3b82f6}
  .timeline-step.complete::before{background:#10b981;box-shadow:0 0 0 2px #10b981}
  .timeline-step h4{font-weight:700;font-size:.95rem;margin-bottom:2px}
  .timeline-step p{font-size:.82rem;color:#64748b}

  /* Responsive */
  @media(max-width:640px){
    .grid-2,.grid-3,.grid-4{grid-template-columns:1fr}
    .mock-nav .nav-links{display:none}
    section{padding:40px 0}
    .hero{padding:50px 0 40px}
  }

  /* Print-friendly */
  @media print{
    body{color:#000;background:#fff}
    .hero{background:#fff!important;color:#000!important;padding:20px 0;border-bottom:2px solid #000}
    section{page-break-inside:avoid}
  }

  /* Scrollbar */
  ::-webkit-scrollbar{width:8px}
  ::-webkit-scrollbar-track{background:#f1f5f9}
  ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}

  /* Tooltip on hover */
  .tool-hover{cursor:default;border-bottom:1px dotted #3b82f6}

  .progress-bar{height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden}
  .progress-bar-fill{height:100%;background:linear-gradient(90deg,#3b82f6,#10b981);border-radius:3px}

  .divider{height:1px;background:#e2e8f0;margin:24px 0}
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════ -->
<!-- HERO                                             -->
<!-- ═══════════════════════════════════════════════ -->
<header class="hero">
  <div class="container">
    <span class="badge">📘 FOR LOGISTICS OPERATORS</span>
    <h1>🚛 Your First Day with LaneWork</h1>
    <p>A complete walkthrough — from opening the website to running your daily logistics operations like a pro.</p>
  </div>
</header>

<!-- ═══════════════════════════════════════════════ -->
<!-- 1. JOURNEY OVERVIEW                             -->
<!-- ═══════════════════════════════════════════════ -->
<section>
  <div class="container">
    <div class="section-header">
      <span class="step-num">OVERVIEW</span>
      <h2>🗺️ Journey Map</h2>
      <p>Seven steps to go from new visitor to daily power-user. Each one takes just a few minutes.</p>
    </div>

    <div class="card-grid">
      <div class="card">
        <div class="card-icon">🌐</div>
        <h3>1. Landing Page</h3>
        <p>Arrive at LaneWork. See what the product does, ask the AI assistant a question right from the homepage.</p>
        <div class="mock-tag blue" style="margin-top:10px">⏱ ~2 min</div>
      </div>
      <div class="card">
        <div class="card-icon">📝</div>
        <h3>2. Sign Up</h3>
        <p>Create your account with email, name, and company. One form, 30 seconds.</p>
        <div class="mock-tag blue" style="margin-top:10px">⏱ ~1 min</div>
      </div>
      <div class="card">
        <div class="card-icon">📊</div>
        <h3>3. Dashboard</h3>
        <p>Log in for the first time. Meet the onboarding wizard that guides you through setup.</p>
        <div class="mock-tag blue" style="margin-top:10px">⏱ ~3 min</div>
      </div>
      <div class="card">
        <div class="card-icon">🔌</div>
        <h3>4. Connect a Tool</h3>
        <p>Link your first service — Shiprocket, ClickPost, or any integration. Fill in credentials once.</p>
        <div class="mock-tag blue" style="margin-top:10px">⏱ ~3 min</div>
      </div>
      <div class="card">
        <div class="card-icon">⚡</div>
        <h3>5. Use a Tool</h3>
        <p>Run your first action: track a package, check a shipment, look up inventory. See results instantly.</p>
        <div class="mock-tag blue" style="margin-top:10px">⏱ ~2 min</div>
      </div>
      <div class="card">
        <div class="card-icon">🤖</div>
        <h3>6. Explore Agents</h3>
        <p>Visit agent pages. Each one specialises — Shipment Agent, Inventory Agent, Reports Agent. Pick what you need.</p>
        <div class="mock-tag blue" style="margin-top:10px">⏱ ~5 min</div>
      </div>
      <div class="card">
        <div class="card-icon">🔄</div>
        <h3>7. Daily Usage</h3>
        <p>Come back every day. Dashboard updates in real-time. Track shipments, manage inventory, run reports.</p>
        <div class="mock-tag green" style="margin-top:10px">🔁 Ongoing</div>
      </div>
    </div>

    <!-- Timeline view -->
    <div class="timeline" style="margin-top:48px">
      <div class="timeline-step complete"><h4>🌐 Land on homepage</h4><p>Ask the AI chatbot a question — no account needed.</p></div>
      <div class="timeline-step complete"><h4>📝 Create your account</h4><p>Email, password, company name. Done.</p></div>
      <div class="timeline-step complete"><h4>📊 See your dashboard</h4><p>Onboarding wizard pops up to guide you.</p></div>
      <div class="timeline-step complete"><h4>🔌 Connect your first tool</h4><p>Shiprocket, ClickPost, or any integration.</p></div>
      <div class="timeline-step complete"><h4>⚡ Run your first action</h4><p>Track a shipment. See results in seconds.</p></div>
      <div class="timeline-step"><h4>🤖 Meet the agents</h4><p>Each agent handles a different part of logistics.</p></div>
      <div class="timeline-step"><h4>🔄 Use it every day</h4><p>Dashboard stays live. Everything updates in real-time.</p></div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════ -->
<!-- 2. STEP 1 — LANDING PAGE                        -->
<!-- ═══════════════════════════════════════════════ -->
<section>
  <div class="container">
    <div class="section-header">
      <span class="step-num">STEP 1</span>
      <h2>🌐 Landing Page</h2>
      <p>Your first impression of LaneWork — and you can already talk to the AI.</p>
    </div>

    <div class="card-grid">
      <div class="card">
        <div class="card-icon">👀</div>
        <h3>What You See</h3>
        <p>A clean, modern page with a hero headline: <em>"Your Logistics Command Centre"</em>. Below it, value cards showing what LaneWork can do — track shipments, manage inventory, generate reports, and chat with AI agents.</p>
      </div>
      <div class="card">
        <div class="card-icon">💬</div>
        <h3>Chat Bubble</h3>
        <p>Bottom-right corner: a friendly chat bubble. Click it and a chat window opens. You can ask things like <em>"Can LaneWork track my Shiprocket orders?"</em> — the AI answers immediately, even before you sign up.</p>
      </div>
      <div class="card">
        <div class="card-icon">🔝</div>
        <h3>Top Navigation</h3>
        <p>Simple nav bar with: <strong>Logo</strong> | <strong>Features</strong> | <strong>Pricing</strong> | <strong>Sign In</strong> | <strong>Get Started</strong> button. Clean and uncluttered.</p>
      </div>
    </div>

    <!-- Screen mockup -->
    <div class="screen">
      <div class="screen-header">
        <span class="screen-dot"></span><span class="screen-dot"></span><span class="screen-dot"></span>
        <span style="font-size:.75rem;color:#94a3b8;margin-left:4px">lanework.com</span>
      </div>
      <div class="screen-inset">
        <!-- Nav -->
        <div class="mock-nav" style="padding:10px 0;border-bottom:1px solid #e2e8f0;margin-bottom:24px">
          <div class="logo">🚛 LaneWork</div>
          <div class="nav-links">
            <span>Features</span><span>Pricing</span><span>Docs</span>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <span class="mock-btn outline sm">Sign In</span>
            <span class="mock-btn primary sm">Get Started →</span>
          </div>
        </div>

        <!-- Hero area -->
        <div style="text-align:center;padding:32px 0 16px">
          <span class="mock-tag blue" style="margin-bottom:12px">🤖 AI-Powered Logistics</span>
          <h3 style="font-size:1.6rem;font-weight:800;margin:12px 0 8px">Your Logistics Command Centre</h3>
          <p style="color:#64748b;max-width:480px;margin:0 auto 20px">Connect your shipping tools, track every package, manage inventory — all through simple chat. No training needed.</p>
          <span class="mock-btn primary">🚀 Get Started Free</span>
        </div>

        <!-- Feature cards -->
        <div class="grid-3" style="margin-top:24px">
          <div style="background:#f8fafc;border-radius:12px;padding:18px;text-align:center">
            <div style="font-size:1.8rem;margin-bottom:6px">📦</div>
            <div style="font-weight:700;font-size:.9rem;margin-bottom:4px">Shipment Tracking</div>
            <div style="font-size:.78rem;color:#64748b">Track across couriers in one place</div>
          </div>
          <div style="background:#f8fafc;border-radius:12px;padding:18px;text-align:center">
            <div style="font-size:1.8rem;margin-bottom:6px">🏗️</div>
            <div style="font-weight:700;font-size:.9rem;margin-bottom:4px">Inventory Management</div>
            <div style="font-size:.78rem;color:#64748b">Know your stock levels, always</div>
          </div>
          <div style="background:#f8fafc;border-radius:12px;padding:18px;text-align:center">
            <div style="font-size:1.8rem;margin-bottom:6px">💬</div>
            <div style="font-weight:700;font-size:.9rem;margin-bottom:4px">AI Chat Assistant</div>
            <div style="font-size:.78rem;color:#64748b">Ask questions, get answers instantly</div>
          </div>
        </div>

        <!-- Chat bubble mock -->
        <div style="margin-top:24px">
          <p style="font-size:.8rem;font-weight:600;color:#64748b;margin-bottom:10px">💬 Try the chat (bottom-right corner of the real page):</p>
          <div class="mock-chat" style="max-width:420px;margin-left:auto;box-shadow:0 4px 20px rgba(0,0,0,.08)">
            <div class="mock-chat-msg user">
              <div class="avatar user-av">👤</div>
              <div style="font-size:.85rem">Can LaneWork track my Shiprocket orders?</div>
            </div>
            <div class="mock-chat-msg ai">
              <div class="avatar ai-av">🤖</div>
              <div style="font-size:.85rem">Yes! 🎉 LaneWork connects directly to Shiprocket. Once you link your account, you can track any AWB, see all active shipments, and even get delivery updates — all by just asking me. Would you like to create a free account to try it?</div>
            </div>
            <div class="mock-chat-input">
              <div class="mock-input">Type your question...</div>
              <span class="mock-btn primary sm">Send</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="callout">
      <div class="callout-icon">💡</div>
      <div><strong>No account needed for chat!</strong> The homepage chatbot works for everyone. Try asking it anything about logistics before you even sign up.</div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════ -->
<!-- 3. STEP 2 — SIGN UP                             -->
<!-- ═══════════════════════════════════════════════ -->
<section>
  <div class="container">
    <div class="section-header">
      <span class="step-num">STEP 2</span>
      <h2>📝 Sign Up</h2>
      <p>Create your account in under a minute. One form, four fields.</p>
    </div>

    <div class="grid-2">
      <div>
        <div class="card" style="height:100%">
          <div class="card-icon">✍️</div>
          <h3>What You Do</h3>
          <p>Click the <strong>"Get Started"</strong> or <strong>"Sign Up"</strong> button on the homepage. You'll see a clean registration form:</p>
          <ul style="margin-top:12px;padding-left:20px;font-size:.88rem;color:#475569;line-height:2">
            <li>📧 <strong>Email address</strong> — your work email</li>
            <li>👤 <strong>Full name</strong> — your name</li>
            <li>🏢 <strong>Company name</strong> (optional)</li>
            <li>🔒 <strong>Password</strong> — at least 8 characters</li>
          </ul>
          <p style="margin-top:12px;font-size:.85rem;color:#64748b">Click <strong>"Create Account"</strong>. Check your email for a verification link, click it, and you're in!</p>
        </div>
      </div>
      <div>
        <div class="screen">
          <div class="screen-header">
            <span class="screen-dot"></span><span class="screen-dot"></span><span class="screen-dot"></span>
            <span style="font-size:.75rem;color:#94a8b8;margin-left:4px">Sign Up</span>
          </div>
          <div class="screen-inset">
            <div style="text-align:center;margin-bottom:24px">
              <div style="font-size:2rem;margin-bottom:4px">🚛</div>
              <h4>Create your account</h4>
              <p style="font-size:.8rem;color:#64748b">Free forever. No credit card required.</p>
            </div>
            <div class="mock-field">
              <label>📧 Email</label>
              <input type="email" placeholder="you@company.com" value="rajesh@fastship.in" style="color:#1e293b">
            </div>
            <div class="mock-field">
              <label>👤 Full Name</label>
              <input type="text" placeholder="Your name" value="Rajesh Kumar" style="color:#1e293b">
            </div>
            <div class="mock-field">
              <label>🏢 Company (optional)</label>
              <input type="text" placeholder="Company name" value="FastShip Logistics" style="color:#1e293b">
            </div>
            <div class="mock-field">
              <label>🔒 Password</label>
              <input type="password" placeholder="Min 8 characters" value="••••••••" style="color:#1e293b">
            </div>
            <span class="mock-btn primary" style="width:100%;justify-content:center;margin-top:8px">✨ Create Account</span>
            <p style="text-align:center;font-size:.78rem;color:#94a3b8;margin-top:14px">Already have an account? <span style="color:#3b82f6;cursor:pointer;font-weight:600">Sign in</span></p>
          </div>
        </div>
      </div>
    </div>

    <div class="callout green" style="margin-top:24px">
      <div class="callout-icon">✅</div>
      <div><strong>After signing up:</strong> Check your inbox for a verification email from LaneWork. Click the link, and you'll be taken straight to your new dashboard.</div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════ -->
<!-- 4. STEP 3 — DASHBOARD + ONBOARDING              -->
<!-- ═══════════════════════════════════════════════ -->
<section>
  <div class="container">
    <div class="section-header">
      <span class="step-num">STEP 3</span>
      <h2>📊 Dashboard & Onboarding</h2>
      <p>Your first login — the dashboard welcomes you and a friendly wizard guides you through setup.</p>
    </div>

    <div class="screen">
      <div class="screen-header">
        <span class="screen-dot"></span><span class="screen-dot"></span><span class="screen-dot"></span>
        <span style="font-size:.75rem;color:#94a3b8;margin-left:4px">Dashboard — LaneWork</span>
      </div>
      <div class="screen-inset">
        <!-- Nav -->
        <div class="mock-nav" style="padding:10px 0;border-bottom:1px solid #e2e8f0;margin-bottom:20px">
          <div class="logo">🚛 LaneWork</div>
          <div class="nav-links">
            <span>📊 Dashboard</span>
            <span>🔌 Connections</span>
            <span>🤖 Agents</span>
            <span>📋 Reports</span>
          </div>
          <div class="nav-avatar">RK</div>
        </div>

        <!-- Welcome banner -->
        <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:14px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:16px">
          <div style="font-size:2.2rem">👋</div>
          <div style="flex:1">
            <h4 style="margin-bottom:4px">Welcome, Rajesh! 🎉</h4>
            <p style="font-size:.85rem;color:#475569">Your dashboard is ready. Let's set things up so you can start tracking shipments.</p>
            <div class="progress-bar" style="margin-top:10px;max-width:300px">
              <div class="progress-bar-fill" style="width:0%"></div>
            </div>
            <p style="font-size:.72rem;color:#94a3b8;margin-top:4px">Setup progress: 0 of 3 steps</p>
          </div>
          <span class="mock-btn primary">🚀 Start Setup</span>
        </div>

        <!-- Onboarding wizard card -->
        <div style="background:#fff;border:2px solid #3b82f6;border-radius:16px;padding:24px;margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
            <span style="font-size:1.6rem">🧙</span>
            <div>
              <h4 style="margin-bottom:2px">Onboarding Wizard</h4>
              <p style="font-size:.8rem;color:#64748b">3 quick steps to get you running</p>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px">
            <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0">
              <span style="font-size:1.4rem">✅</span>
              <div style="flex:1"><strong>Step 1:</strong> Create your account</div>
              <span class="mock-tag green">Done</span>
            </div>
            <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe">
              <span style="font-size:1.4rem">2️⃣</span>
              <div style="flex:1"><strong>Step 2:</strong> Connect your first tool (Shiprocket, ClickPost, etc.)</div>
              <span class="mock-btn primary sm">Do This →</span>
            </div>
            <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0">
              <span style="font-size:1.4rem">3️⃣</span>
              <div style="flex:1"><strong>Step 3:</strong> Run your first action — track a shipment!</div>
              <span style="font-size:.78rem;color:#94a3b8">Waiting...</span>
            </div>
          </div>
        </div>

        <!-- Dashboard stats (empty state) -->
        <div class="grid-4">
          <div class="mock-stat" style="text-align:center">
            <div class="val">—</div>
            <div class="lbl">📦 Active Shipments</div>
            <p style="font-size:.7rem;color:#94a3b8;margin-top:4px">Connect a tool first</p>
          </div>
          <div class="mock-stat" style="text-align:center">
            <div class="val">—</div>
            <div class="lbl">🚚 In Transit</div>
            <p style="font-size:.7rem;color:#94a3b8;margin-top:4px">Connect a tool first</p>
          </div>
          <div class="mock-stat" style="text-align:center">
            <div class="val">—</div>
            <div class="lbl">✅ Delivered Today</div>
            <p style="font-size:.7rem;color:#94a3b8;margin-top:4px">Connect a tool first</p>
          </div>
          <div class="mock-stat" style="text-align:center">
            <div class="val">0</div>
            <div class="lbl">🔌 Tools Connected</div>
          </div>
        </div>
      </div>
    </div>

    <div class="callout amber">
      <div class="callout-icon">🧙</div>
      <div><strong>The wizard won't annoy you.</strong> You can dismiss it anytime and come back later from Settings → Onboarding. But following it step-by-step is the fastest way to get value.</div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════ -->
<!-- 5. STEP 4 — CONNECT FIRST TOOL                 -->
<!-- ═══════════════════════════════════════════════ -->
<section>
  <div class="container">
    <div class="section-header">
      <span class="step-num">STEP 4</span>
      <h2>🔌 Connect Your First Tool</h2>
      <p>Link Shiprocket (or any tool) to LaneWork. One credential form — done forever.</p>
    </div>

    <div class="grid-2">
      <div>
        <div class="card" style="height:100%">
          <div class="card-icon">🧭</div>
          <h3>How You Get There</h3>
          <ol style="margin-top:12px;padding-left:20px;font-size:.88rem;color:#475569;line-height:2.2">
            <li>Click <strong>"Connections"</strong> in the sidebar or top nav</li>
            <li>You'll see a grid of available tools — Shiprocket, ClickPost, Delhivery, BlueDart, and more</li>
            <li>Each card shows the tool logo, name, and a short description of what it does</li>
            <li>Click the <strong>"Connect"</strong> button on any card</li>
            <li>A credential form slides open — fill in your API keys or login details</li>
            <li>Click <strong>"Test & Save"</strong></li>
            <li>✅ The card turns green — you're connected!</li>
          </ol>
        </div>
      </div>
      <div>
        <div class="screen">
          <div class="screen-header">
            <span class="screen-dot"></span><span class="screen-dot"></span><span class="screen-dot"></span>
            <span style="font-size:.75rem;color:#94a3b8;margin-left:4px">Connections — LaneWork</span>
          </div>
          <div class="screen-inset">
            <h4 style="margin-bottom:4px">🔌 Available Tools</h4>
            <p style="font-size:.8rem;color:#64748b;margin-bottom:16px">Connect your logistics tools. Your credentials are encrypted.</p>

            <!-- Tool cards grid -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
              <!-- Shiprocket card — Connected state -->
              <div style="border:2px solid #10b981;border-radius:14px;padding:16px;background:#f0fdf4">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span style="font-size:1.5rem">📦</span>
                  <div>
                    <div style="font-weight:700;font-size:.85rem">Shiprocket</div>
                    <div style="font-size:.7rem;color:#059669">✅ Connected</div>
                  </div>
                </div>
                <p style="font-size:.72rem;color:#475569;margin-bottom:10px">Track shipments, create orders, manage returns</p>

                <!-- Expanded credential form -->
                <div style="background:#fff;border-radius:10px;padding:14px;margin-top:8px">
                  <p style="font-size:.72rem;font-weight:600;color:#475569;margin-bottom:8px">🔐 Credentials</p>
                  <div class="mock-field" style="margin-bottom:8px">
                    <label style="font-size:.7rem">API Key</label>
                    <input value="sk_live_abc123xyz..." style="font-size:.75rem;padding:6px 10px;color:#1e293b" readonly>
                  </div>
                  <div class="mock-field" style="margin-bottom:8px">
                    <label style="font-size:.7rem">API Secret</label>
                    <input type="password" value="••••••••••••••••" style="font-size:.75rem;padding:6px 10px">
                  </div>
                  <div style="display:flex;gap:8px">
                    <span class="mock-btn green sm">✅ Connected</span>
                    <span class="mock-btn outline sm">🔄 Re-test</span>
                  </div>
                </div>
              </div>

              <!-- ClickPost card — Not connected -->
              <div style="border:1px solid #e2e8f0;border-radius:14px;padding:16px;background:#fff">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span style="font-size:1.5rem">📮</span>
                  <div>
                    <div style="font-weight:700;font-size:.85rem">ClickPost</div>
                    <div style="font-size:.7rem;color:#94a3b8">Not connected</div>
                  </div>
                </div>
                <p style="font-size:.72rem;color:#475569;margin-bottom:10px">Multi-carrier tracking & notification management</p>
                <span class="mock-btn outline sm" style="width:100%;justify-content:center">🔌 Connect</span>
              </div>

              <!-- Delhivery -->
              <div style="border:1px solid #e2e8f0;border-radius:14px;padding:16px;background:#fff">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span style="font-size:1.5rem">🚚</span>
                  <div>
                    <div style="font-weight:700;font-size:.85rem">Delhivery</div>
                    <div style="font-size:.7rem;color:#94a3b8">Not connected</div>
                  </div>
                </div>
                <p style="font-size:.72rem;color:#475569;margin-bottom:10px">Direct courier integration for Delhivery</p>
                <span class="mock-btn outline sm" style="width:100%;justify-content:center">🔌 Connect</span>
              </div>

              <!-- BlueDart -->
              <div style="border:1px solid #e2e8f0;border-radius:14px;padding:16px;background:#fff">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span style="font-size:1.5rem">✈️</span>
                  <div>
                    <div style="font-weight:700;font-size:.85rem">BlueDart</div>
                    <div style="font-size:.7rem;color:#94a3b8">Not connected</div>
                  </div>
                </div>
                <p style="font-size:.72rem;color:#475569;margin-bottom:10px">BlueDart aviation & ground shipping</p>
                <span class="mock-btn outline sm" style="width:100%;justify-content:center">🔌 Connect</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="callout green">
      <div class="callout-icon">🔐</div>
      <div><strong>Your credentials are safe.</strong> LaneWork encrypts all API keys and secrets. Nobody — not even LaneWork staff — can see them in plain text after you save.</div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════ -->
<!-- 6. STEP 5 — USE A TOOL                          -->
<!-- ═══════════════════════════════════════════════ -->
<section>
  <div class="container">
    <div class="section-header">
      <span class="step-num">STEP 5</span>
      <h2>⚡ Use a Tool — Track a Package</h2>
      <p>Now the real magic: run an action and see results instantly.</p>
    </div>

    <div class="grid-2">
      <div>
        <div class="card" style="height:100%">
          <div class="card-icon">🎯</div>
          <h3>How It Works</h3>
          <ol style="margin-top:12px;padding-left:20px;font-size:.88rem;color:#475569;line-height:2.2">
            <li>Go to <strong>Connections</strong></li>
            <li>Click the connected Shiprocket card — it <strong>expands</strong> to show available actions</li>
            <li>Available actions appear as buttons:
              <ul style="margin-top:4px;padding-left:18px">
                <li>🔍 <strong>Find a Package</strong></li>
                <li>📋 <strong>List All Shipments</strong></li>
                <li>📊 <strong>Shipment Summary</strong></li>
                <li>🔄 <strong>Track by AWB</strong></li>
              </ul>
            </li>
            <li>Click an action — a small form appears to enter details (e.g., AWB number)</li>
            <li>Click <strong>"Run"</strong></li>
            <li>Results appear right below the card in a clean, readable format</li>
          </ol>
        </div>
      </div>
      <div>
        <div class="screen">
          <div class="screen-header">
            <span class="screen-dot"></span><span class="screen-dot"></span><span class="screen-dot"></span>
            <span style="font-size:.75rem;color:#94a3b8;margin-left:4px">Shiprocket — Find Package</span>
          </div>
          <div class="screen-inset">
            <!-- Expanded card with actions -->
            <div style="border:2px solid #10b981;border-radius:14px;padding:18px;background:#f0fdf4;margin-bottom:16px">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                <span style="font-size:1.5rem">📦</span>
                <div>
                  <div style="font-weight:700">Shiprocket</div>
                  <div style="font-size:.72rem;color:#059669">✅ Connected · Ready</div>
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <span class="mock-btn primary sm">🔍 Find Package</span>
                <span class="mock-btn outline sm">📋 All Shipments</span>
                <span class="mock-btn outline sm">📊 Summary</span>
                <span class="mock-btn outline sm">🔄 Track AWB</span>
              </div>

              <!-- Action form -->
              <div style="margin-top:14px;padding:14px;background:#fff;border-radius:10px">
                <p style="font-size:.78rem;font-weight:600;margin-bottom:8px">🔍 Find a Package</p>
                <div style="display:flex;gap:8px">
                  <input placeholder="Enter AWB or Order ID" value="AWB-987654321" style="flex:1;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:.82rem;color:#1e293b">
                  <span class="mock-btn primary sm">🔍 Find</span>
                </div>
              </div>
            </div>

            <!-- Results -->
            <div style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
              <div style="background:#f8fafc;padding:12px 16px;font-weight:700;font-size:.85rem;border-bottom:1px solid #e2e8f0">
                📋 Search Result
              </div>
              <div style="padding:16px">
                <div class="grid-2" style="margin-bottom:12px">
                  <div><span style="font-size:.72rem;color:#94a3b8">AWB Number</span><br><strong style="font-size:.88rem">AWB-987654321</strong></div>
                  <div><span style="font-size:.72rem;color:#94a3b8">Order ID</span><br><strong style="font-size:.88rem">ORD-45678</strong></div>
                  <div><span style="font-size:.72rem;color:#94a3b8">Status</span><br><span class="mock-tag green">🚚 In Transit</span></div>
                  <div><span style="font-size:.72rem;color:#94a3b8">Courier</span><br><strong style="font-size:.88rem">Delhivery</strong></div>
                  <div><span style="font-size:.72rem;color:#94a3b8">Origin</span><br><strong style="font-size:.88rem">Mumbai, MH</strong></div>
                  <div><span style="font-size:.72rem;color:#94a3b8">Destination</span><br><strong style="font-size:.88rem">Bengaluru, KA</strong></div>
                </div>
                <div class="divider"></div>
                <p style="font-size:.78rem;font-weight:600;margin-bottom:8px">📍 Tracking Updates</p>
                <div style="font-size:.8rem;color:#475569;line-height:1.8">
                  <div>🟢 <strong>Jul 30, 18:30</strong> — Out for delivery, Bengaluru Hub</div>
                  <div>🔵 <strong>Jul 30, 10:15</strong> — Reached Bengaluru Sorting Centre</div>
                  <div>🔵 <strong>Jul 29, 22:00</strong> — Departed Mumbai Gateway</div>
                  <div>🔵 <strong>Jul 29, 14:30</strong> — Pickup confirmed, Mumbai</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="callout">
      <div class="callout-icon">⚡</div>
      <div><strong>Pro tip:</strong> You can also just ask the AI chat: <em>"Track AWB-987654321"</em> — it'll call the tool for you and show results in the chat. No clicking needed!</div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════ -->
<!-- 7. STEP 6 — EXPLORE AGENTS                      -->
<!-- ═══════════════════════════════════════════════ -->
<section>
  <div class="container">
    <div class="section-header">
      <span class="step-num">STEP 6</span>
      <h2>🤖 Explore the Agents</h2>
      <p>Meet the AI-powered specialists. Each agent handles one part of your logistics workflow.</p>
    </div>

    <div class="card-grid">
      <div class="card">
        <div class="card-icon">📦</div>
        <h3>Shipment Agent</h3>
        <p>Your tracking expert. Ask it <em>"Where is my package?"</em> or <em>"Show all delayed shipments"</em>. It talks to Shiprocket, ClickPost, Delhivery — whatever you've connected.</p>
        <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px">
          <span class="mock-tag blue">Track AWB</span>
          <span class="mock-tag blue">Bulk Status</span>
          <span class="mock-tag blue">Delays</span>
          <span class="mock-tag blue">NDR</span>
        </div>
      </div>
      <div class="card">
        <div class="card-icon">🏗️</div>
        <h3>Inventory Agent</h3>
        <p>Know your stock at all times. Ask <em>"How many units of SKU-123 are left?"</em> or <em>"Which products are running low?"</em>. Syncs with your inventory system.</p>
        <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px">
          <span class="mock-tag blue">Stock Levels</span>
          <span class="mock-tag blue">Low Stock Alerts</span>
          <span class="mock-tag blue">SKU Lookup</span>
        </div>
      </div>
      <div class="card">
        <div class="card-icon">📊</div>
        <h3>Reports Agent</h3>
        <p>Generates summaries and reports. Ask <em>"Give me today's delivery report"</em> or <em>"Compare this week's shipments vs last week"</em>. Numbers, charts, and insights.</p>
        <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px">
          <span class="mock-tag blue">Daily Report</span>
          <span class="mock-tag blue">Weekly Summary</span>
          <span class="mock-tag blue">Trends</span>
        </div>
      </div>
      <div class="card">
        <div class="card-icon">🔔</div>
        <h3>Alerts Agent</h3>
        <p>Proactive notifications. It watches your shipments and inventory and tells you when something needs attention — delays, returns, low stock, failed deliveries.</p>
        <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px">
          <span class="mock-tag blue">Delay Alerts</span>
          <span class="mock-tag blue">RTO Alerts</span>
          <span class="mock-tag blue">Stock Alerts</span>
        </div>
      </div>
      <div class="card">
        <div class="card-icon">💬</div>
        <h3>General Assistant</h3>
        <p>The chat agent on every page. Ask anything — it routes to the right specialist agent automatically. <em>"Show me everything about order ORD-45678"</em> — it pulls shipment + inventory + reports in one conversation.</p>
        <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px">
          <span class="mock-tag blue">Any Question</span>
          <span class="mock-tag blue">Cross-Agent</span>
          <span class="mock-tag blue">Always Available</span>
        </div>
      </div>
    </div>

    <!-- Agent page mock -->
    <div class="screen" style="margin-top:32px">
      <div class="screen-header">
        <span class="screen-dot"></span><span class="screen-dot"></span><span class="screen-dot"></span>
        <span style="font-size:.75rem;color:#94a3b8;margin-left:4px">Agents — Shipment Agent</span>
      </div>
      <div class="screen-inset">
        <div style="display:flex;align-items:flex-start;gap:20px">
          <div style="font-size:3rem">🤖</div>
          <div style="flex:1">
            <h4>Shipment Agent</h4>
            <p style="font-size:.85rem;color:#64748b;margin-bottom:12px">Tracks shipments across all your connected couriers. Just ask in plain English.</p>
            <div style="display:flex;gap:8px;margin-bottom:16px">
              <span class="mock-tag green">🟢 Active</span>
              <span class="mock-tag blue">📦 Using Shiprocket</span>
            </div>
            <p style="font-size:.8rem;font-weight:600;margin-bottom:8px">💬 Try asking:</p>
            <div style="display:flex;flex-direction:column;gap:6px">
              <div style="background:#f8fafc;padding:8px 12px;border-radius:8px;font-size:.82rem;cursor:pointer;border:1px solid #e2e8f0">"Track AWB-987654321"</div>
              <div style="background:#f8fafc;padding:8px 12px;border-radius:8px;font-size:.82rem;cursor:pointer;border:1px solid #e2e8f0">"Show all delayed shipments"</div>
              <div style="background:#f8fafc;padding:8px 12px;border-radius:8px;font-size:.82rem;cursor:pointer;border:1px solid #e2e8f0">"What's the status of ORD-45678?"</div>
              <div style="background:#f8fafc;padding:8px 12px;border-radius:8px;font-size:.82rem;cursor:pointer;border:1px solid #e2e8f0">"Any RTOs today?"</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="callout">
      <div class="callout-icon">🧠</div>
      <div><strong>Agents learn your workflow.</strong> The more you use them, the better they understand your patterns. The Shipment Agent will remember which couriers you use most and prioritise those results.</div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════ -->
<!-- 8. STEP 7 — DAILY USAGE                         -->
<!-- ═══════════════════════════════════════════════ -->
<section>
  <div class="container">
    <div class="section-header">
      <span class="step-num">STEP 7</span>
      <h2>🔄 Daily Usage — Live Dashboard</h2>
      <p>Come back every day. Your dashboard updates automatically. Everything you need at a glance.</p>
    </div>

    <div class="screen">
      <div class="screen-header">
        <span class="screen-dot"></span><span class="screen-dot"></span><span class="screen-dot"></span>
        <span style="font-size:.75rem;color:#94a3b8;margin-left:4px">Dashboard — Live</span>
      </div>
      <div class="screen-inset">
        <!-- Nav -->
        <div class="mock-nav" style="padding:10px 0;border-bottom:1px solid #e2e8f0;margin-bottom:20px">
          <div class="logo">🚛 LaneWork</div>
          <div class="nav-links">
            <span style="color:#0f172a">📊 Dashboard</span>
            <span>🔌 Connections</span>
            <span>🤖 Agents</span>
            <span>📋 Reports</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:1.2rem">🔔</span>
            <div class="nav-avatar">RK</div>
          </div>
        </div>

        <!-- Real-time badge -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px">
          <span style="width:8px;height:8px;border-radius:50%;background:#10b981;animation:pulse 2s infinite"></span>
          <span style="font-size:.78rem;color:#059669;font-weight:600">Live · Updated just now</span>
        </div>

        <!-- Stats grid — populated -->
        <div class="grid-4" style="margin-bottom:24px">
          <div class="mock-stat">
            <div class="val">1,247</div>
            <div class="lbl">📦 Active Shipments</div>
            <div style="font-size:.7rem;color:#059669;margin-top:4px">↑ 12% vs yesterday</div>
          </div>
          <div class="mock-stat">
            <div class="val">843</div>
            <div class="lbl">🚚 In Transit</div>
            <div style="font-size:.7rem;color:#64748b;margin-top:4px">Across 4 couriers</div>
          </div>
          <div class="mock-stat">
            <div class="val">312</div>
            <div class="lbl">✅ Delivered Today</div>
            <div style="font-size:.7rem;color:#059669;margin-top:4px">94.2% success rate</div>
          </div>
          <div class="mock-stat">
            <div class="val">18</div>
            <div class="lbl">⚠️ Exceptions</div>
            <div style="font-size:.7rem;color:#ef4444;margin-top:4px">5 RTO · 8 Delayed · 5 NDR</div>
          </div>
        </div>

        <!-- Two-column layout: shipments + alerts -->
        <div class="grid-2">
          <!-- Recent shipments -->
          <div style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
            <div style="background:#f8fafc;padding:12px 16px;font-weight:700;font-size:.85rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
              📦 Recent Shipments
              <span style="color:#3b82f6;font-size:.75rem;cursor:pointer">View All →</span>
            </div>
            <div style="padding:8px 0">
              <div style="padding:10px 16px;display:flex;align-items:center;gap:10px;font-size:.82rem;border-bottom:1px solid #f1f5f9">
                <span style="font-size:1.1rem">📦</span>
                <div style="flex:1"><strong>AWB-987654321</strong><br><span style="color:#64748b;font-size:.75rem">ORD-45678 · Bengaluru</span></div>
                <span class="mock-tag green">In Transit</span>
              </div>
              <div style="padding:10px 16px;display:flex;align-items:center;gap:10px;font-size:.82rem;border-bottom:1px solid #f1f5f9">
                <span style="font-size:1.1rem">📦</span>
                <div style="flex:1"><strong>AWB-987654322</strong><br><span style="color:#64748b;font-size:.75rem">ORD-45679 · Delhi</span></div>
                <span class="mock-tag green">Delivered</span>
              </div>
              <div style="padding:10px 16px;display:flex;align-items:center;gap:10px;font-size:.82rem;border-bottom:1px solid #f1f5f9">
                <span style="font-size:1.1rem">📦</span>
                <div style="flex:1"><strong>AWB-987654323</strong><br><span style="color:#64748b;font-size:.75rem">ORD-45680 · Mumbai</span></div>
                <span class="mock-tag" style="background:#fef3c7;color:#d97706">Delayed</span>
              </div>
              <div style="padding:10px 16px;display:flex;align-items:center;gap:10px;font-size:.82rem">
                <span style="font-size:1.1rem">📦</span>
                <div style="flex:1"><strong>AWB-987654324</strong><br><span style="color:#64748b;font-size:.75rem">ORD-45681 · Chennai</span></div>
                <span class="mock-tag green">Out for Delivery</span>
              </div>
            </div>
          </div>

          <!-- Alerts panel -->
          <div style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
            <div style="background:#f8fafc;padding:12px 16px;font-weight:700;font-size:.85rem;border-bottom:1px solid #e2e8f0">
              🔔 Alerts & Notifications
            </div>
            <div style="padding:8px 0">
              <div style="padding:10px 16px;display:flex;gap:10px;font-size:.8rem;border-bottom:1px solid #f1f5f9;align-items:flex-start">
                <span>⚠️</span>
                <div><strong>5 shipments delayed</strong><br><span style="color:#64748b;font-size:.75rem">Mumbai-Delhi route · Weather</span></div>
                <span style="font-size:.7rem;color:#94a3b8;white-space:nowrap">2h ago</span>
              </div>
              <div style="padding:10px 16px;display:flex;gap:10px;font-size:.8rem;border-bottom:1px solid #f1f5f9;align-items:flex-start">
                <span>🔄</span>
                <div><strong>3 RTO initiated</strong><br><span style="color:#64748b;font-size:.75rem">Customer refused · Bengaluru</span></div>
                <span style="font-size:.7rem;color:#94a3b8;white-space:nowrap">4h ago</span>
              </div>
              <div style="padding:10px 16px;display:flex;gap:10px;font-size:.8rem;border-bottom:1px solid #f1f5f9;align-items:flex-start">
                <span>📋</span>
                <div><strong>Daily report ready</strong><br><span style="color:#64748b;font-size:.75rem">Jul 30 summary available</span></div>
                <span style="font-size:.7rem;color:#94a3b8;white-space:nowrap">6h ago</span>
              </div>
              <div style="padding:10px 16px;display:flex;gap:10px;font-size:.8rem;align-items:flex-start">
                <span>🏗️</span>
                <div><strong>Low stock: SKU-789</strong><br><span style="color:#64748b;font-size:.75rem">Only 12 units left · Reorder now</span></div>
                <span style="font-size:.7rem;color:#94a3b8;white-space:nowrap">8h ago</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Inventory snapshot -->
        <div style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-top:24px">
          <div style="background:#f8fafc;padding:12px 16px;font-weight:700;font-size:.85rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
            🏗️ Inventory Snapshot
            <span style="color:#3b82f6;font-size:.75rem;cursor:pointer">Manage →</span>
          </div>
          <div style="padding:16px">
            <div class="grid-4">
              <div style="text-align:center">
                <div style="font-size:1.5rem;font-weight:800">5,420</div>
                <div style="font-size:.75rem;color:#64748b">Total SKUs</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:1.5rem;font-weight:800;color:#ef4444">3</div>
                <div style="font-size:.75rem;color:#64748b">Low Stock</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:1.5rem;font-weight:800;color:#f59e0b">12</div>
                <div style="font-size:.75rem;color:#64748b">Out of Stock</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:1.5rem;font-weight:800;color:#10b981">98%</div>
                <div style="font-size:.75rem;color:#64748b">Fill Rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="callout green" style="margin-top:24px">
      <div class="callout-icon">🔄</div>
      <div><strong>Real-time updates.</strong> The dashboard refreshes automatically. When a shipment status changes, you'll see it here within seconds — no need to refresh the page.</div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════ -->
<!-- FOOTER                                          -->
<!-- ═══════════════════════════════════════════════ -->
<section style="background:#0f172a;color:#fff;padding:48px 0">
  <div class="container" style="text-align:center">
    <div style="font-size:2rem;margin-bottom:12px">🚛</div>
    <h3 style="margin-bottom:8px;font-size:1.3rem">You're Ready to Go!</h3>
    <p style="opacity:.75;max-width:480px;margin:0 auto 20px;font-size:.9rem">From landing page to daily power-user — the entire journey takes less than 30 minutes. LaneWork grows with your logistics needs.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <span class="mock-btn primary">🚀 Get Started Free</span>
      <span class="mock-btn outline" style="border-color:rgba(255,255,255,.3);color:#fff">📖 Read Docs</span>
    </div>
    <p style="margin-top:32px;font-size:.72rem;opacity:.5">LaneWork · AI-Powered Logistics Platform · © 2026</p>
  </div>
</section>

<style>
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
</style>

</body>
</html>
