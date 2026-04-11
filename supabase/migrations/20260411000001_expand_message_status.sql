-- Migration: Expand messages.status CHECK constraint to include all statuses used in the codebase
-- Run this in Supabase SQL Editor BEFORE testing the dashboard

-- Drop old restrictive constraint
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;

-- Add expanded constraint covering all statuses used by webhooks, drafts, and n8n
ALTER TABLE messages ADD CONSTRAINT messages_status_check
  CHECK (status IN (
    'received',           -- WF1: initial ingestion
    'new',                -- WF1 webhook: message just ingested
    'processing',         -- WF2: being classified
    'classified',         -- WF2 webhook: classification complete
    'draft_ready',        -- WF5: AI draft generated, awaiting review
    'pending_review',     -- WF5 webhook: draft needs human review
    'auto_sent',          -- WF5 webhook: auto-approved and sent
    'approved',           -- Dashboard: manually approved
    'replied',            -- WF6: reply sent
    'sent',               -- WF6 webhook: send confirmed
    'send_failed',        -- WF6 webhook: send failed
    'needs_human_reply',  -- WF2: routing decision
    'ignored',            -- Dashboard: message ignored
    'discarded',          -- Dashboard: draft rejected/discarded
    'archived'            -- User action: archived
  ));
