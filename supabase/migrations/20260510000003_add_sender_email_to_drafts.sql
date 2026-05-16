-- Add sender_email to drafts to record which account sent the reply.
-- Populated on approve; used by n8n to select the correct outbound Gmail inbox.
ALTER TABLE drafts ADD COLUMN sender_email VARCHAR(255);
