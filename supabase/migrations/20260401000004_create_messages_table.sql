-- Migration: Phase C — messages table (references inboxes, leads, users)

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

CREATE TRIGGER set_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
