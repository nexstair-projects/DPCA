# DATABASE_SCHEMA.md — Supabase (PostgreSQL) Schema

> **Database**: Supabase (managed PostgreSQL)
> **Auth**: Supabase Auth (JWT-based)
> **Security**: Row-Level Security (RLS) enabled on ALL tables
> **Naming**: snake_case for tables and columns, UUID primary keys

---

## Table Index

| Table | Purpose | RLS |
|---|---|---|
| `users` | Team member accounts and roles | Yes |
| `inboxes` | Connected email/channel accounts | Yes |
| `messages` | All incoming messages across channels | Yes |
| `drafts` | AI-generated draft replies | Yes |
| `leads` | Extracted lead information | Yes |
| `knowledge_base` | Brand voice, templates, email examples, FAQs | Yes |
| `system_config` | System-wide configuration (brand voice prompt, rules) | Yes |
| `ignored_messages` | Filtered/spam messages for audit | Yes |
| `errors_log` | Workflow and system error tracking | Yes |
| `audit_log` | All user and system actions | Yes |

---

## Schema Definitions

### `users`

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'team_member'
        CHECK (role IN ('admin', 'manager', 'team_member')),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
```

**RLS Policies:**
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own record
CREATE POLICY users_select_own ON users
    FOR SELECT USING (auth.uid() = auth_id);

-- Admins can read all users
CREATE POLICY users_select_admin ON users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

-- Admins can manage users
CREATE POLICY users_manage_admin ON users
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );
```

---

### `inboxes`

```sql
CREATE TABLE inboxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    channel VARCHAR(20) NOT NULL
        CHECK (channel IN ('gmail', 'whatsapp', 'instagram')),
    email_address VARCHAR(255),
    phone_number VARCHAR(50),
    instagram_handle VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- OAuth / API credentials (encrypted at rest by Supabase)
    oauth_access_token TEXT,
    oauth_refresh_token TEXT,
    oauth_token_expires_at TIMESTAMPTZ,
    meta_access_token TEXT,
    meta_page_id VARCHAR(100),

    -- Assignment
    assigned_users UUID[] DEFAULT '{}',

    -- n8n workflow reference
    n8n_workflow_id VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inboxes_channel ON inboxes(channel);
CREATE INDEX idx_inboxes_is_active ON inboxes(is_active);
```

**RLS Policies:**
```sql
ALTER TABLE inboxes ENABLE ROW LEVEL SECURITY;

-- Admins can manage all inboxes
CREATE POLICY inboxes_admin ON inboxes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

-- Users can read inboxes they are assigned to
CREATE POLICY inboxes_assigned ON inboxes
    FOR SELECT USING (
        (SELECT id FROM users WHERE auth_id = auth.uid()) = ANY(assigned_users)
    );

-- Managers can read all inboxes
CREATE POLICY inboxes_manager_read ON inboxes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'manager')
    );
```

---

### `messages`

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inbox_id UUID NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL
        CHECK (channel IN ('gmail', 'whatsapp', 'instagram')),

    -- Sender info
    sender_email VARCHAR(255),
    sender_name VARCHAR(255),
    sender_phone VARCHAR(50),
    sender_instagram_id VARCHAR(100),
    is_known_sender BOOLEAN DEFAULT false,
    sender_type VARCHAR(20) DEFAULT 'unknown'
        CHECK (sender_type IN ('lead', 'client', 'vendor', 'unknown')),

    -- Message content
    subject VARCHAR(500),
    body_raw TEXT NOT NULL,
    body_clean TEXT,
    message_external_id VARCHAR(500) UNIQUE,
    thread_id VARCHAR(500),
    in_reply_to VARCHAR(500),

    -- Classification (populated by WF2)
    category VARCHAR(30)
        CHECK (category IN ('new_inquiry', 'existing_client', 'vendor', 'collaboration', 'general')),
    priority VARCHAR(10)
        CHECK (priority IN ('high', 'medium', 'low')),
    tier SMALLINT CHECK (tier IN (1, 2, 3)),
    classification_confidence DECIMAL(3,2),
    classification_reasoning TEXT,
    estimated_value DECIMAL(12,2),
    guest_count INTEGER,
    classification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (classification_status IN ('pending', 'classified', 'failed')),
    classified_at TIMESTAMPTZ,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'received'
        CHECK (status IN ('received', 'processing', 'draft_ready', 'replied', 'needs_human_reply', 'ignored', 'archived')),

    -- Relationships
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_messages_inbox_id ON messages(inbox_id);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_category ON messages(category);
CREATE INDEX idx_messages_tier ON messages(tier);
CREATE INDEX idx_messages_priority ON messages(priority);
CREATE INDEX idx_messages_received_at ON messages(received_at DESC);
CREATE INDEX idx_messages_sender_email ON messages(sender_email);
CREATE INDEX idx_messages_assigned_to ON messages(assigned_to);
CREATE INDEX idx_messages_classification_status ON messages(classification_status);
CREATE INDEX idx_messages_channel ON messages(channel);
CREATE INDEX idx_messages_external_id ON messages(message_external_id);

-- Composite indexes for common queries
CREATE INDEX idx_messages_inbox_status ON messages(inbox_id, status);
CREATE INDEX idx_messages_inbox_received ON messages(inbox_id, received_at DESC);
CREATE INDEX idx_messages_status_tier ON messages(status, tier);
```

**RLS Policies:**
```sql
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Admins and managers can read all messages
CREATE POLICY messages_admin_manager ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE auth_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Team members can read messages from their assigned inboxes
CREATE POLICY messages_team ON messages
    FOR SELECT USING (
        inbox_id IN (
            SELECT id FROM inboxes
            WHERE (SELECT id FROM users WHERE auth_id = auth.uid()) = ANY(assigned_users)
        )
    );

-- n8n service role can insert/update (uses service_role key)
-- Service role bypasses RLS — no policy needed for n8n writes
```

---

### `drafts`

```sql
CREATE TABLE drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,

    -- Draft content
    draft_text TEXT NOT NULL,
    edited_text TEXT,
    original_draft_text TEXT,

    -- AI metadata
    model_used VARCHAR(50) NOT NULL DEFAULT 'gpt-4o',
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    tone_confidence INTEGER CHECK (tone_confidence BETWEEN 0 AND 100),
    context_sources UUID[] DEFAULT '{}',

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending_review'
        CHECK (status IN (
            'pending_review', 'auto_approved', 'approved',
            'edited_approved', 'rejected', 'sent', 'send_failed'
        )),
    rejection_reason TEXT,

    -- Assignment
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    reviewed_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique constraint: one active draft per message per version
    UNIQUE(message_id, version)
);

CREATE INDEX idx_drafts_message_id ON drafts(message_id);
CREATE INDEX idx_drafts_status ON drafts(status);
CREATE INDEX idx_drafts_assigned_to ON drafts(assigned_to);
CREATE INDEX idx_drafts_created_at ON drafts(created_at DESC);
CREATE INDEX idx_drafts_status_created ON drafts(status, created_at DESC);
```

**RLS Policies:**
```sql
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

-- Admins and managers can view all drafts
CREATE POLICY drafts_admin_manager ON drafts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE auth_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Team members can view drafts assigned to them
CREATE POLICY drafts_team ON drafts
    FOR SELECT USING (
        assigned_to = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- Admins, managers, and assigned users can update drafts
CREATE POLICY drafts_update ON drafts
    FOR UPDATE USING (
        assigned_to = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM users
            WHERE auth_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );
```

---

### `leads`

```sql
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Contact info
    client_names TEXT[] DEFAULT '{}',
    email VARCHAR(255),
    phone VARCHAR(50),
    location VARCHAR(255),

    -- Wedding details
    wedding_date DATE,
    wedding_date_flexible BOOLEAN DEFAULT true,
    guest_count INTEGER,
    budget_range VARCHAR(100),
    venue_preference TEXT,
    services_requested TEXT[] DEFAULT '{}',

    -- Source tracking
    source_channel VARCHAR(20)
        CHECK (source_channel IN ('gmail', 'whatsapp', 'instagram')),
    how_found_us VARCHAR(255),
    first_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

    -- AI-generated
    ai_summary TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'booked', 'lost', 'archived')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,

    -- Activity timeline (JSONB array)
    activity_timeline JSONB DEFAULT '[]'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_source_channel ON leads(source_channel);
CREATE INDEX idx_leads_wedding_date ON leads(wedding_date);
```

**Activity Timeline Entry Format:**
```json
{
  "timestamp": "2026-03-30T09:42:00Z",
  "type": "message_received | draft_sent | status_changed | note_added | lead_created",
  "description": "Initial inquiry received via Gmail",
  "user_id": "uuid | null",
  "message_id": "uuid | null"
}
```

**RLS Policies:**
```sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Admins and managers can manage all leads
CREATE POLICY leads_admin_manager ON leads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE auth_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Team members can view leads assigned to them
CREATE POLICY leads_team_read ON leads
    FOR SELECT USING (
        assigned_to = (SELECT id FROM users WHERE auth_id = auth.uid())
    );
```

---

### `knowledge_base`

```sql
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content
    title VARCHAR(500) NOT NULL,
    category VARCHAR(30) NOT NULL
        CHECK (category IN (
            'brand_voice', 'template', 'email_example',
            'faq', 'vendor', 'process', 'qualification'
        )),
    subcategory VARCHAR(100),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Embedding status
    embedding_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (embedding_status IN ('pending', 'processing', 'embedded', 'failed')),
    pinecone_id VARCHAR(255),
    embedded_at TIMESTAMPTZ,

    -- Management
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_category ON knowledge_base(category);
CREATE INDEX idx_kb_subcategory ON knowledge_base(subcategory);
CREATE INDEX idx_kb_embedding_status ON knowledge_base(embedding_status);
CREATE INDEX idx_kb_is_active ON knowledge_base(is_active);
CREATE INDEX idx_kb_category_active ON knowledge_base(category, is_active);
```

**RLS Policies:**
```sql
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Only admins can manage knowledge base
CREATE POLICY kb_admin ON knowledge_base
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

-- All authenticated users can read active entries
CREATE POLICY kb_read ON knowledge_base
    FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);
```

---

### `system_config`

```sql
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_config_key ON system_config(config_key);
```

**Default Config Entries:**
```sql
INSERT INTO system_config (config_key, config_value, description) VALUES
('brand_voice_prompt', '"..."'::jsonb, 'Master brand voice system prompt for AI drafting'),
('classification_prompt', '"..."'::jsonb, 'System prompt for message classification'),
('lead_extraction_prompt', '"..."'::jsonb, 'System prompt for lead detail extraction'),
('email_signature', '{"default": "Sophie Laurent\nDream Paris Wedding"}'::jsonb, 'Email signature templates'),
('auto_send_rules', '{"tier_1_enabled": true, "min_confidence": 85}'::jsonb, 'Auto-send configuration'),
('business_hours', '{"timezone": "Europe/Paris", "start": "09:00", "end": "18:00"}'::jsonb, 'Business hours config'),
('exclusion_list', '{"emails": [], "domains": []}'::jsonb, 'Sender exclusion list'),
('notification_emails', '{"tier_3_alerts": [], "error_alerts": []}'::jsonb, 'Notification recipients');
```

**RLS Policies:**
```sql
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage config
CREATE POLICY config_admin ON system_config
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

-- All authenticated users can read config
CREATE POLICY config_read ON system_config
    FOR SELECT USING (auth.uid() IS NOT NULL);
```

---

### `ignored_messages`

```sql
CREATE TABLE ignored_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inbox_id UUID NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL,
    sender_email VARCHAR(255),
    sender_name VARCHAR(255),
    subject VARCHAR(500),
    body_snippet TEXT,
    message_external_id VARCHAR(500),
    ignore_reason VARCHAR(50) NOT NULL
        CHECK (ignore_reason IN (
            'auto_reply', 'spam', 'noreply', 'exclusion_list',
            'duplicate', 'delivery_notification', 'out_of_office'
        )),
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ignored_inbox ON ignored_messages(inbox_id);
CREATE INDEX idx_ignored_reason ON ignored_messages(ignore_reason);
CREATE INDEX idx_ignored_received ON ignored_messages(received_at DESC);
```

**RLS Policies:**
```sql
ALTER TABLE ignored_messages ENABLE ROW LEVEL SECURITY;

-- Admins can view all ignored messages
CREATE POLICY ignored_admin ON ignored_messages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );
```

---

### `errors_log`

```sql
CREATE TABLE errors_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id VARCHAR(100),
    workflow_name VARCHAR(255),
    node_name VARCHAR(255),
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    context JSONB DEFAULT '{}'::jsonb,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    severity VARCHAR(10) NOT NULL DEFAULT 'error'
        CHECK (severity IN ('warning', 'error', 'critical')),
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_errors_severity ON errors_log(severity);
CREATE INDEX idx_errors_resolved ON errors_log(resolved);
CREATE INDEX idx_errors_workflow ON errors_log(workflow_name);
CREATE INDEX idx_errors_created ON errors_log(created_at DESC);
CREATE INDEX idx_errors_unresolved ON errors_log(resolved, created_at DESC) WHERE resolved = false;
```

**RLS Policies:**
```sql
ALTER TABLE errors_log ENABLE ROW LEVEL SECURITY;

-- Admins can manage all errors
CREATE POLICY errors_admin ON errors_log
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

-- Managers can view errors
CREATE POLICY errors_manager_read ON errors_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'manager')
    );
```

---

### `audit_log`

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    draft_id UUID REFERENCES drafts(id) ON DELETE SET NULL,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_action ON audit_log(action_type);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_draft ON audit_log(draft_id);
CREATE INDEX idx_audit_message ON audit_log(message_id);
```

**Action Types:**
```
approve_draft, edit_draft, reject_draft, regenerate_draft, reassign_draft,
login, logout, create_user, update_user, deactivate_user,
create_kb_entry, update_kb_entry, delete_kb_entry, embed_kb_entry,
update_config, connect_inbox, disconnect_inbox,
auto_send, manual_send, send_failed
```

**RLS Policies:**
```sql
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY audit_admin ON audit_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

-- Insert allowed for all authenticated users (logging their own actions)
CREATE POLICY audit_insert ON audit_log
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

---

## Database Functions

### Auto-update `updated_at` trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON inboxes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON drafts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Dashboard Statistics Function

```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_inbox_ids UUID[] DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'pending_review', (
            SELECT COUNT(*) FROM drafts
            WHERE status = 'pending_review'
            AND (p_inbox_ids IS NULL OR message_id IN (
                SELECT id FROM messages WHERE inbox_id = ANY(p_inbox_ids)
            ))
        ),
        'auto_sent_today', (
            SELECT COUNT(*) FROM drafts
            WHERE status = 'sent' AND sent_at >= CURRENT_DATE
            AND reviewed_by IS NULL
            AND (p_inbox_ids IS NULL OR message_id IN (
                SELECT id FROM messages WHERE inbox_id = ANY(p_inbox_ids)
            ))
        ),
        'approved_today', (
            SELECT COUNT(*) FROM drafts
            WHERE status IN ('approved', 'edited_approved', 'sent')
            AND reviewed_at >= CURRENT_DATE
            AND reviewed_by IS NOT NULL
            AND (p_inbox_ids IS NULL OR message_id IN (
                SELECT id FROM messages WHERE inbox_id = ANY(p_inbox_ids)
            ))
        ),
        'avg_tone_confidence', (
            SELECT COALESCE(AVG(tone_confidence), 0) FROM drafts
            WHERE created_at >= CURRENT_DATE
            AND (p_inbox_ids IS NULL OR message_id IN (
                SELECT id FROM messages WHERE inbox_id = ANY(p_inbox_ids)
            ))
        ),
        'avg_response_time_minutes', (
            SELECT COALESCE(
                AVG(EXTRACT(EPOCH FROM (d.sent_at - m.received_at)) / 60), 0
            )
            FROM drafts d
            JOIN messages m ON d.message_id = m.id
            WHERE d.sent_at >= CURRENT_DATE
            AND (p_inbox_ids IS NULL OR m.inbox_id = ANY(p_inbox_ids))
        ),
        'channel_counts', (
            SELECT json_object_agg(channel, cnt) FROM (
                SELECT channel, COUNT(*) as cnt
                FROM messages
                WHERE received_at >= CURRENT_DATE
                AND (p_inbox_ids IS NULL OR inbox_id = ANY(p_inbox_ids))
                GROUP BY channel
            ) sub
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Migration / Seed Order

Execute in this order to respect foreign key dependencies:

1. `users` (after Supabase Auth accounts are created)
2. `inboxes`
3. `system_config` (insert default entries)
4. `knowledge_base`
5. `messages` (test data)
6. `leads`
7. `drafts` (test data)
8. `ignored_messages`
9. `errors_log`
10. `audit_log`
11. Apply all triggers
12. Apply all RLS policies

---

## Data Retention Policy

| Table | Retention | Action |
|---|---|---|
| `messages` | 12 months active | Archive to cold storage after 12 months |
| `drafts` | 12 months active | Archive with parent message |
| `audit_log` | 24 months | Purge after 24 months |
| `errors_log` | 6 months | Purge resolved errors after 6 months |
| `ignored_messages` | 3 months | Purge after 3 months |
| `leads` | Indefinite | Never auto-purge |
| `knowledge_base` | Indefinite | Never auto-purge |
