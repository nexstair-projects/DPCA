-- Fix system_config key names to match backend service expectations.
-- The original seed used 'draft_user_template' and 'regeneration_prompt' but
-- draftGenerator.ts looks up 'draft_generation_prompt' and 'draft_regeneration_prompt'.
-- Safe to re-run in all states:
--   If correct key already exists  → DELETE the stale old-named row
--   If correct key does not exist  → RENAME the old row via UPDATE

-- P3: handle draft_user_template → draft_generation_prompt
DELETE FROM system_config
WHERE config_key = 'draft_user_template'
  AND EXISTS (SELECT 1 FROM system_config WHERE config_key = 'draft_generation_prompt');

UPDATE system_config
SET config_key = 'draft_generation_prompt', updated_at = now()
WHERE config_key = 'draft_user_template'
  AND NOT EXISTS (SELECT 1 FROM system_config WHERE config_key = 'draft_generation_prompt');

-- P5: handle regeneration_prompt → draft_regeneration_prompt
DELETE FROM system_config
WHERE config_key = 'regeneration_prompt'
  AND EXISTS (SELECT 1 FROM system_config WHERE config_key = 'draft_regeneration_prompt');

UPDATE system_config
SET config_key = 'draft_regeneration_prompt', updated_at = now()
WHERE config_key = 'regeneration_prompt'
  AND NOT EXISTS (SELECT 1 FROM system_config WHERE config_key = 'draft_regeneration_prompt');
