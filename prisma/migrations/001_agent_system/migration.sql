-- ══════════════════════════════════════════════════════════════
-- Lanework Autonomous Agent System — 12 new tables
-- ══════════════════════════════════════════════════════════════

-- ── Phase 1: Background Polling ──

CREATE TABLE IF NOT EXISTS agent_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  agent_type TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info', -- info, warning, critical
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_poller_state (
  poller_name TEXT PRIMARY KEY,
  last_run_at TIMESTAMPTZ,
  last_status TEXT DEFAULT 'idle', -- idle, running, success, error
  items_checked INTEGER DEFAULT 0,
  alerts_generated INTEGER DEFAULT 0,
  error_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── Phase 2: Event-Driven Triggers ──

CREATE TABLE IF NOT EXISTS agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL, -- poller, webhook, user, system
  entity_type TEXT,
  entity_id TEXT,
  data JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  actions_triggered JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── Phase 3: Workflow Engine ──

CREATE TABLE IF NOT EXISTS agent_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  enabled BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 2,
  timeout_seconds INTEGER DEFAULT 300,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES agent_workflows(id) ON DELETE SET NULL,
  tenant_id TEXT,
  trigger_event_id UUID REFERENCES agent_events(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed, cancelled
  current_step TEXT,
  steps_completed INTEGER DEFAULT 0,
  steps_total INTEGER DEFAULT 0,
  output JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

CREATE TABLE IF NOT EXISTS agent_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES agent_workflow_runs(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, skipped
  input JSONB DEFAULT '{}',
  output JSONB DEFAULT '{}',
  error_message TEXT,
  duration_ms INTEGER,
  mcp_integration TEXT,
  mcp_action TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ── Phase 4: Trust & Approvals ──

CREATE TABLE IF NOT EXISTS agent_trust_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  trust_level TEXT NOT NULL DEFAULT 'propose', -- propose, auto_low_risk, full
  max_auto_risk_score INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(tenant_id, agent_type, action_type)
);

CREATE TABLE IF NOT EXISTS agent_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
  alert_id UUID REFERENCES agent_alerts(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  risk_score INTEGER DEFAULT 0,
  input_data JSONB DEFAULT '{}',
  reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, expired
  decision TEXT,
  decision_reason TEXT,
  decided_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  agent_type TEXT NOT NULL,
  action TEXT NOT NULL,
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  risk_score INTEGER DEFAULT 0,
  trust_level TEXT DEFAULT 'propose',
  approval_id UUID,
  user_id TEXT,
  mode TEXT DEFAULT 'simulated',
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── Phase 5: Learning & Feedback ──

CREATE TABLE IF NOT EXISTS agent_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
  alert_id UUID REFERENCES agent_alerts(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  rating TEXT NOT NULL, -- thumbs_up, thumbs_down
  comment TEXT,
  action_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
  agent_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  predicted_result TEXT,
  actual_result TEXT,
  accuracy_score INTEGER, -- 0-100
  was_correct BOOLEAN,
  financial_impact DECIMAL(12, 2) DEFAULT 0,
  time_saved_minutes INTEGER DEFAULT 0,
  tracked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  pattern_type TEXT NOT NULL, -- approval_pattern, seasonal, frequency, risk_preference
  agent_type TEXT,
  action_type TEXT,
  description TEXT NOT NULL,
  confidence DECIMAL(5, 4) DEFAULT 0, -- 0.0000 to 1.0000
  examples_count INTEGER DEFAULT 0,
  example_ids JSONB DEFAULT '[]',
  auto_apply BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── Indexes ──

CREATE INDEX IF NOT EXISTS idx_agent_alerts_tenant ON agent_alerts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_alerts_unack ON agent_alerts(acknowledged, created_at DESC) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_agent_events_type ON agent_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_events_unprocessed ON agent_events(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_agent_workflow_runs_status ON agent_workflow_runs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_workflow_steps_run ON agent_workflow_steps(run_id, step_index);
CREATE INDEX IF NOT EXISTS idx_agent_approvals_pending ON agent_approvals(status, created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_agent_audit_log_agent ON agent_audit_log(agent_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_agent ON agent_feedback(agent_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_outcomes_agent ON agent_outcomes(agent_type, tracked_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_patterns_tenant ON agent_patterns(tenant_id, agent_type);

-- ── Seed default trust levels ──

-- (Applied via application code per-tenant, not in migration)
