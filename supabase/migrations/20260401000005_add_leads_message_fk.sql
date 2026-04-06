-- Migration: Phase D — Add deferred FK from leads.first_message_id → messages
-- Resolves the circular dependency between leads and messages

ALTER TABLE leads
    ADD CONSTRAINT fk_leads_first_message
    FOREIGN KEY (first_message_id) REFERENCES messages(id) ON DELETE SET NULL;
