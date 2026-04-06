-- Migration: Phase E — Remaining tables
-- Creates: drafts, ignored_messages, errors_log, audit_log

------------------------------------------------------------
-- 1. drafts
------------------------------------------------------------
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

CREATE TRIGGER set_updated_at BEFORE UPDATE ON drafts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

------------------------------------------------------------
-- 2. ignored_messages
------------------------------------------------------------
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

------------------------------------------------------------
-- 3. errors_log
------------------------------------------------------------
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

------------------------------------------------------------
-- 4. audit_log
------------------------------------------------------------
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
