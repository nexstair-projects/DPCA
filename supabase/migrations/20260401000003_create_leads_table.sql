-- Migration: Phase B — leads table (without first_message_id FK)
-- FK to messages added in a later migration to resolve circular dependency

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
    first_message_id UUID,  -- FK added in migration 20260401000005

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

CREATE TRIGGER set_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
