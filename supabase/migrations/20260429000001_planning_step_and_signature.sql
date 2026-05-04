-- Add planning step state machine to leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS planning_step VARCHAR(50) NOT NULL DEFAULT 'lead_qualification'
    CHECK (planning_step IN (
      'lead_qualification', 'consultation_followup', 'package_pricing_email',
      'contract_transmission', 'masterfile_welcome_kit', 'day_of_form',
      'venue_sourcing', 'catering_selection', 'cake_selection', 'save_the_date',
      'photo_video', 'mc_officiant', 'music', 'entertainment', 'beauty',
      'transport', 'room_blocks', 'design_consultation', 'mood_board_proposal',
      'tastings_trials', 'rsvp_print', 'month_of_coordination',
      'rehearsal_walkthrough', 'wedding_day', 'vendor_communication',
      'freeform_general'
    )),
  ADD COLUMN IF NOT EXISTS signature_signed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_planning_step ON leads(planning_step);
CREATE INDEX IF NOT EXISTS idx_leads_signature_signed ON leads(signature_signed);

-- Track sender persona and subject line used on each draft
ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS sender_persona VARCHAR(20)
    CHECK (sender_persona IN ('audrey', 'vanessa', 'frederic', 'partners')),
  ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subject_line VARCHAR(500),
  ADD COLUMN IF NOT EXISTS planning_step VARCHAR(50);

-- Audit trail for planning step transitions
CREATE TABLE IF NOT EXISTS planning_step_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_step VARCHAR(50),
  to_step VARCHAR(50) NOT NULL,
  triggered_by_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  triggered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planning_step_history_lead ON planning_step_history(lead_id);

ALTER TABLE planning_step_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY psh_admin_manager ON planning_step_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'manager'))
  );
