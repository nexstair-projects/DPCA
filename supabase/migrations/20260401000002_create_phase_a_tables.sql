-- Migration: Phase A — Tables with no cross-dependencies
-- Creates: users, inboxes, system_config, knowledge_base

-- =============================================================
-- 1. users
-- =============================================================
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

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- 2. inboxes
-- =============================================================
CREATE TABLE inboxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    channel VARCHAR(20) NOT NULL
        CHECK (channel IN ('gmail', 'whatsapp', 'instagram')),
    email_address VARCHAR(255),
    phone_number VARCHAR(50),
    instagram_handle VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    oauth_access_token TEXT,
    oauth_refresh_token TEXT,
    oauth_token_expires_at TIMESTAMPTZ,
    meta_access_token TEXT,
    meta_page_id VARCHAR(100),
    assigned_users UUID[] DEFAULT '{}',
    n8n_workflow_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inboxes_channel ON inboxes(channel);
CREATE INDEX idx_inboxes_is_active ON inboxes(is_active);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON inboxes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- 3. system_config
-- =============================================================
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

CREATE TRIGGER set_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- 4. knowledge_base
-- =============================================================
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    category VARCHAR(30) NOT NULL
        CHECK (category IN (
            'brand_voice', 'template', 'email_example',
            'faq', 'vendor', 'process', 'qualification'
        )),
    subcategory VARCHAR(100),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (embedding_status IN ('pending', 'processing', 'embedded', 'failed')),
    pinecone_id VARCHAR(255),
    embedded_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_category ON knowledge_base(category);
CREATE INDEX idx_kb_subcategory ON knowledge_base(subcategory);
CREATE INDEX idx_kb_embedding_status ON knowledge_base(embedding_status);
CREATE INDEX idx_kb_is_active ON knowledge_base(is_active);
CREATE INDEX idx_kb_category_active ON knowledge_base(category, is_active);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
