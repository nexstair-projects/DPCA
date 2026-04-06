-- Migration: Enable RLS and create all 22 policies across 10 tables

------------------------------------------------------------
-- users (3 policies)
------------------------------------------------------------
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

------------------------------------------------------------
-- inboxes (3 policies)
------------------------------------------------------------
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

------------------------------------------------------------
-- messages (2 policies)
------------------------------------------------------------
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

-- n8n uses service_role key which bypasses RLS — no write policy needed

------------------------------------------------------------
-- drafts (3 policies)
------------------------------------------------------------
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

------------------------------------------------------------
-- leads (2 policies)
------------------------------------------------------------
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

------------------------------------------------------------
-- knowledge_base (2 policies)
------------------------------------------------------------
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Only admins can manage knowledge base
CREATE POLICY kb_admin ON knowledge_base
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

-- All authenticated users can read active entries
CREATE POLICY kb_read ON knowledge_base
    FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

------------------------------------------------------------
-- system_config (2 policies)
------------------------------------------------------------
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage config
CREATE POLICY config_admin ON system_config
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

-- All authenticated users can read config
CREATE POLICY config_read ON system_config
    FOR SELECT USING (auth.uid() IS NOT NULL);

------------------------------------------------------------
-- ignored_messages (1 policy)
------------------------------------------------------------
ALTER TABLE ignored_messages ENABLE ROW LEVEL SECURITY;

-- Admins can view all ignored messages
CREATE POLICY ignored_admin ON ignored_messages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

------------------------------------------------------------
-- errors_log (2 policies)
------------------------------------------------------------
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

------------------------------------------------------------
-- audit_log (2 policies)
------------------------------------------------------------
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY audit_admin ON audit_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

-- Insert allowed for all authenticated users (logging their own actions)
CREATE POLICY audit_insert ON audit_log
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
