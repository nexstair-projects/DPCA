# SONNET EXECUTION DOCUMENT — DPCA

> **Audience**: Claude Sonnet (the implementation model). You will receive ONLY this document and the codebase. No other context.
> **Project root**: `d:\workspace\DPCA\`
> **Today's date**: 2026-04-29

---

## 0. Project Overview (read first)

**DPCA (Dream Paris Communication Assistant)** is an internal AI tool for **Dream Paris Wedding (DPW)**, a luxury Paris destination-wedding planning company founded by **Audrey** (a French planner based in Dubai with a decade of high-end experience). DPW handles weddings priced €8K–€50K+ for international clients (UK, US, Australia, Middle East).

The system has three pillars:
1. **Ingest** every incoming message across Gmail (and later WhatsApp + Instagram) into a central Supabase database.
2. **Classify and draft** a brand-voice-matched reply using GPT-4o, with knowledge-base context retrieved from Pinecone, while respecting strict brand rules around tone, sender identity, fixed subject lines, and pre/post-contract communication.
3. **Approve** drafts through a Next.js dashboard where the team reviews, edits, regenerates, and sends, with full audit logging.

The brand voice is **luxury authority**: clear, direct, professional, elegant, guiding — never weak, generic, or salesy. The company runs on three sender personas:
- **Audrey** (founder, `audrey@dreampariswedding.com`): lead qualification, calls, contracts.
- **Vanessa** (planner, `vanessa@dreampariswedding.com`): operational planning steps after contract.
- **Frederic** (admin, `admin@dreampariswedding.com`): masterfile, payment receipts, day-of forms.
- **Partners** (`partners@dreampariswedding.com`): vendor-side communication.

There are 19+ planning steps (venue → masterfile → catering → cake → save-the-date → photographer → MC → music → entertainment → beauty → transport → room blocks → design → mood board → tastings → RSVPs → month-of → rehearsal → wedding day). Each step has a **fixed email subject line** that must NEVER be paraphrased.

The Tech Lead is **Abdur Rehman** (n8n + backend), Frontend is **Usama Khan** (React/Next.js dashboard). Today's date is 2026-04-29; Week-4 launch target was 2026-04-25 (slipped).

---

## 1. Current State Summary (what already exists)

### Backend (`backend/`)
- Express + TypeScript + Zod + Supabase JS client.
- Routes: `health.ts`, `messages.ts`, `drafts.ts`, `webhooks.ts`, `inboxes.ts`, `leads.ts`.
- Single Supabase client at `backend/src/lib/supabase.ts` using **service-role key** (bypasses RLS).
- **NO authentication middleware** — all routes are open.
- **NO HMAC validation** on webhooks.
- Webhook endpoints: `/api/webhooks/n8n/{message-ingested, message-classified, draft-generated, lead-extracted, send-result}`.

### Dashboard (`dashboard/`)
- Next.js 14 App Router + Supabase Auth Helpers + SWR + Tailwind.
- Pages: `/login`, `/inbox` (3-panel approval queue with channel filter, category filter, keyboard shortcuts j/k/a/d), `/leads`, `/knowledge-base`, `/settings`, `/dashboard`, `/`.
- `middleware.ts` redirects unauthenticated users to `/login`. Authenticated users are redirected from `/login` to `/inbox`.
- Components: `Sidebar.tsx`, `TopBar.tsx`, `Layout.tsx`.
- Inbox page calls `${BACKEND_URL}/api/messages` directly (no auth header sent, currently works because backend is open).

### Database (`supabase/migrations/`)
- 9 migration files. Schema matches `docs/DATABASE_SCHEMA.md` for tables; the `messages.status` enum was expanded in `20260411000001_expand_message_status.sql` to include `new`, `auto_sent`, `approved`, `discarded`, etc.
- Tables: `users`, `inboxes`, `messages`, `drafts`, `leads`, `knowledge_base`, `system_config`, `ignored_messages`, `errors_log`, `audit_log`.
- 22 RLS policies. 7 `updated_at` triggers. `get_dashboard_stats()` SECURITY DEFINER function.

### n8n (`n8n-workflows/`)
- Eight JSON files: WF1 through WF8.
- **WF1 has working production logic** (Gmail polling, MIME decode, dedupe, Supabase insert, label, trigger WF2). It contains a **hardcoded Supabase service-role JWT** that must be replaced.
- **WF2–WF8 are stubs** — node skeletons with descriptive notes but no executable logic.

### Knowledge Base (`knowledge-base/`)
- Source folder with PDF wedding timelines, mood boards, catering questionnaire, masterfile examples. Most are reference material.
- The crucial document is `Ai Brain Date and Core Report - DREAM PARIS WEDDING.docx`, which encodes the brand brain (positioning, tone, planning logic, fixed subject lines, sender routing, commission rules). A markdown conversion is at `graphify-out/converted/Ai Brain Date and Core Report - DREAM PARIS WEDDING_b9bf4da8.md`.

### Schema-vs-code drift (must fix in Task 1)
- `backend/src/routes/drafts.ts` writes `review_notes` — DB has `rejection_reason`.
- `backend/src/routes/webhooks.ts` writes `confidence_score` to messages — DB has `classification_confidence`.
- `backend/src/routes/webhooks.ts` lead-extracted handler uses `client_name`, `client_email`, `client_phone`, `source` — DB has `client_names` (text[]), `email`, `phone`, `source_channel`.
- `backend/src/routes/webhooks.ts` writes to `errors_log.source` — DB column does not exist; correct column is `workflow_name`.

---

## 2. CRITICAL RULES YOU MUST NEVER VIOLATE

These are non-negotiable. Every decision below flows from them.

### Rule 1 — Fixed subject lines must use EXACT MATCH, NEVER vector search, NEVER paraphrased

The Brand Brain mandates exact subject lines for planning-step emails. Examples:
- `YOUR WEDDING WITH DREAM PARIS WEDDING` — Audrey, contract email
- `MASTERFILE + PAYMENT RECEIPT + WELCOME KIT` — Frederic, post-payment
- `Your Wedding Day-Of Details Form ✨` — Frederic, simultaneous
- All Vanessa planning-step subjects (you will encode them in `system_config.planning_step_subjects`).

These are stored in a deterministic lookup table. Code does `getFixedSubject(planningStep)`, NOT `vectorSearch("contract email subject")`. The LLM is allowed to write the body but is forbidden from changing the subject line. If the LLM output's first line includes a Subject prefix that mismatches the fixed subject, **reject and regenerate**.

### Rule 2 — Commission must NEVER appear in client-facing output

DPW operates with vendor-side commission (often 15%) but the official client-facing position is: **flat-fee model, no commission**. Internal knowledge of commission must never reach a client.

Implementation:
- The brand-voice system prompt (P1) explicitly forbids mentioning commission, kickback, vendor markup, or any phrasing that implies pay-to-recommend.
- A deterministic `commissionSanitizer()` post-processor scans every generated draft for forbidden tokens (English + French + Portuguese variants). If detected → mark draft `needs_human_reply` and trigger regeneration with a stricter prompt. Never auto-send a draft that contains forbidden tokens.
- Forbidden tokens (case-insensitive, regex): `commission`, `kickback`, `markup` (when not preceded by `time`), `vendor pays`, `we receive a fee`, `pay-to-recommend`, `commissionnement`, `pourcentage sur`, `comissão`.

### Rule 3 — Tone rules ALWAYS in system prompt, NEVER retrieved from KB

The brand-voice prompt (P1) is stored in `system_config.brand_voice_prompt` and injected as the `system` message of every draft generation call. It is NEVER stored in `knowledge_base` and never returned by retrieval.

Why: if tone rules are in the KB, retrieval can miss them, truncate them, or compete with email examples for retrieval slots. System prompt = deterministic = brand-safe.

### Rule 4 — Metadata filters MUST apply BEFORE vector similarity search

When retrieving KB context for a draft, the Pinecone `query()` call must use `filter: { category: { "$in": [allowedCategories] } }` based on the **incoming message's** classification category. The category mapping is fixed:

| Message category | KB categories allowed |
|---|---|
| `new_inquiry` | `template`, `email_example`, `faq`, `qualification` |
| `existing_client` | `email_example`, `template`, `process` |
| `vendor` | `vendor`, `template` |
| `collaboration` | `email_example`, `template` |
| `general` | `faq`, `template` |

Do **not** rely on the LLM to filter post-hoc. The `filter` clause is always set, even if it slightly hurts recall.

### Rule 5 — Sender identity must match the planning step EXACTLY

The mapping is deterministic. You will create `system_config.sender_routing` with this content (subject to confirmation in Task 2):

```
{
  "lead_qualification": { "sender": "audrey", "from": "audrey@dreampariswedding.com" },
  "consultation_followup": { "sender": "audrey", "from": "audrey@dreampariswedding.com" },
  "package_pricing_email": { "sender": "audrey", "from": "audrey@dreampariswedding.com" },
  "contract_transmission": { "sender": "audrey", "from": "audrey@dreampariswedding.com", "cc": ["vanessa@dreampariswedding.com", "admin@dreampariswedding.com"] },
  "masterfile_welcome_kit": { "sender": "frederic", "from": "admin@dreampariswedding.com" },
  "day_of_form": { "sender": "frederic", "from": "admin@dreampariswedding.com" },
  "venue_sourcing": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "catering_selection": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "cake_selection": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "save_the_date": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "photo_video": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "mc_officiant": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "music": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "entertainment": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "beauty": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "transport": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "room_blocks": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "design_consultation": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "mood_board_proposal": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "tastings_trials": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "rsvp_print": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "month_of_coordination": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "rehearsal_walkthrough": { "sender": "vanessa", "from": "vanessa@dreampariswedding.com" },
  "vendor_communication": { "sender": "partners", "from": "partners@dreampariswedding.com" },
  "freeform_general": { "sender": "audrey", "from": "audrey@dreampariswedding.com" }
}
```

The code path: `lead.planning_step → sender_routing[step] → from address + signature block`. The LLM never decides who signs.

### Rule 6 — Pre-signature / post-signature gating

A lead has `signature_signed: boolean`. Pre-signature behavior:
- Reply must qualify, set expectations, position the package — not deliver detailed planning work.
- Forbidden: detailed venue lists, vendor recommendations, design proposals, custom timelines.
- The system prompt has a `{{pre_signature_constraint}}` slot that is filled with a strict pre-signature directive when `signature_signed === false`.

Post-signature: the full structured planning system applies.

### Rule 7 — Call availability

Audrey only takes calls Monday and Wednesday. Closed weekends. If a generated draft offers a call slot, the post-processor verifies the proposed day is Mon or Wed. If it's any other day, **strip the slot suggestion and add a generic "Monday or Wednesday at a time of your preference (Paris time)" instead.**

### Rule 8 — RLS-aware backend authentication

The browser → backend path requires JWT authentication. The backend then either:
- Uses the user's JWT to query Supabase (RLS applies), or
- Uses the service-role key only after the middleware has confirmed the user's role permits the operation.

The browser must NEVER receive the service-role key. The service-role client is internal to the backend.

### Rule 9 — Idempotent webhook handlers

n8n may retry webhooks. Every webhook handler must be idempotent:
- `message-ingested`: dedupe on `message_external_id` (already done by Supabase upsert).
- `message-classified`: only update if `classification_status = 'pending'`; otherwise return 200 OK without re-writing.
- `draft-generated`: check if a draft for `(message_id, version)` already exists.
- `send-result`: check current draft status; only update if not already terminal.

### Rule 10 — No credentials in workflow JSONs or git

WF1's hardcoded Supabase JWT must be replaced with a credential-node reference. All n8n credentials live in n8n's credential store. The git-tracked JSONs reference credentials by name only.

---

## 3. Database Schema Changes (run before any code work)

Create `supabase/migrations/20260429000001_planning_step_and_signature.sql`:

```sql
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

-- Track which sender persona was used on a draft
ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS sender_persona VARCHAR(20)
    CHECK (sender_persona IN ('audrey', 'vanessa', 'frederic', 'partners')),
  ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subject_line VARCHAR(500),
  ADD COLUMN IF NOT EXISTS planning_step VARCHAR(50);

-- Track planning step transitions for audit
CREATE TABLE IF NOT EXISTS planning_step_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_step VARCHAR(50),
  to_step VARCHAR(50) NOT NULL,
  triggered_by_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  triggered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_planning_step_history_lead ON planning_step_history(lead_id);

ALTER TABLE planning_step_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY psh_admin_manager ON planning_step_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'manager'))
  );
```

Create `supabase/migrations/20260429000002_seed_brand_config.sql` to populate `system_config` with the six prompts (P1–P6 from `docs/PROMPTS.md`), `sender_routing` (the JSON from Rule 5 above), `planning_step_subjects` (the fixed subject map), `email_signatures` (per-sender), and `forbidden_tokens` (commission filter list). See Task 2 below for exact values.

---

## 4. Environment Variables and Config Needed

Update `.env.example` with the following additions. Then update `.env` with real values.

```env
# ────────────────────────────────────────────────────────────
# Existing (keep as-is)
# ────────────────────────────────────────────────────────────
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PINECONE_API_KEY=
PINECONE_INDEX_NAME=dpca-knowledge-base
PINECONE_ENVIRONMENT=
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=
META_WHATSAPP_ACCESS_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=
META_INSTAGRAM_ACCESS_TOKEN=
META_APP_SECRET=
N8N_BASIC_AUTH_USER=
N8N_BASIC_AUTH_PASSWORD=
N8N_WEBHOOK_URL=
N8N_ENCRYPTION_KEY=
NODE_ENV=development
JWT_SECRET=
CORS_ORIGIN=http://localhost:3000

# ────────────────────────────────────────────────────────────
# NEW (add these)
# ────────────────────────────────────────────────────────────

# HMAC secret shared between backend and n8n for webhook signing
N8N_WEBHOOK_SECRET=

# OpenAI model selection (override defaults)
OPENAI_MODEL_DRAFT=gpt-4o
OPENAI_MODEL_CLASSIFY=gpt-4o
OPENAI_MODEL_EMBED=text-embedding-3-small

# Pinecone index host (region-specific URL from Pinecone dashboard)
PINECONE_INDEX_HOST=

# Backend internal API token — used by n8n to call /api/internal/*
INTERNAL_API_TOKEN=

# Tone validation threshold — drafts below this auto-route to human review
TONE_CONFIDENCE_THRESHOLD=75

# Public webhook base URL n8n exposes (used by backend to call back into n8n)
N8N_WEBHOOK_BASE_URL=https://n8n.your-vps.example.com

# Default Gmail sender for outbound replies (must match an OAuth-connected inbox)
DEFAULT_OUTBOUND_INBOX_ID=
```

Update `dashboard/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

---

## 5. Remaining Tasks (numbered, ordered by dependency)

> **For each task**, do exactly what's specified. Do not improvise scope. Do not create files not listed unless explicitly told. After each task, run the listed acceptance criteria.

### TASK 1 — Schema/code drift reconciliation

**Why this first**: subsequent tasks rely on accurate field names. Fixing later cascades into more rework.

**Files to modify**:
- `backend/src/routes/drafts.ts`
- `backend/src/routes/webhooks.ts`

**Changes**:

In `backend/src/routes/drafts.ts`:
1. Replace all `review_notes` with `rejection_reason` (the column name in DB).
2. The `rejectSchema` Zod object: change `review_notes: z.string().min(1)` to `rejection_reason: z.string().min(1)`.

In `backend/src/routes/webhooks.ts`:
1. In `classifySchema`, rename `confidence_score` to `classification_confidence`.
2. The DB write in `/n8n/message-classified` already does `{ ...fields }`; ensure the destructured field name matches the DB column.
3. In `leadSchema` (`/n8n/lead-extracted`), restructure fields:
   - Replace `client_name: z.string()` with `client_names: z.array(z.string()).optional()`.
   - Replace `client_email: z.string().email().optional()` with `email: z.string().email().optional()`.
   - Replace `client_phone: z.string().optional()` with `phone: z.string().optional()`.
   - Replace `source: z.string().optional()` with `source_channel: z.enum(['gmail','whatsapp','instagram']).optional()`.
   - Add `wedding_date_flexible: z.boolean().optional()`.
   - Add `location: z.string().optional()`.
4. In `/n8n/send-result`, change `errors_log` insert: rename `source: 'WF6'` to `workflow_name: 'WF6'` (DB column name) and add `error_type: 'send_failure'` (already there).
5. The status string `'auto_sent'` is fine (covered by the migration). Confirm `messages_status_check` constraint includes all statuses you write.

**Code pattern to follow**: existing Zod + Supabase pattern in `backend/src/routes/messages.ts`.

**Acceptance criteria**:
- `npm run build` (in `backend/`) compiles with no TypeScript errors.
- Reject a draft via `POST /api/drafts/:id/reject` with `{reviewed_by, rejection_reason}` — Supabase row updates `rejection_reason` column.
- POST `/api/webhooks/n8n/lead-extracted` with `{client_names: ["Jane Doe"], email: "j@example.com", source_channel: "gmail", inbox_id, ...}` — row appears in `leads` with all fields populated.

---

### TASK 2 — Database migrations + system_config seeding

**Files to create**:
- `supabase/migrations/20260429000001_planning_step_and_signature.sql` (exact SQL from Section 3)
- `supabase/migrations/20260429000002_seed_brand_config.sql` (see below)

**Migration 2 content**: insert/upsert these rows into `system_config`:

```sql
-- Brand voice prompt (P1 from docs/PROMPTS.md, with additions for commission and pre/post signature)
INSERT INTO system_config (config_key, config_value, description) VALUES
('brand_voice_prompt', to_jsonb($P1$
You are the AI communication assistant for Dream Paris Wedding (DPW), a luxury Paris destination-wedding planning company founded by Audrey. You write replies on behalf of the team. The current sender persona is: {{sender_persona}} ({{sender_full_name}}). Always sign off as {{sender_signature}}.

## Brand Identity
DPW is a high-end, expert-led, process-heavy planning company. Voice: clear, direct, professional, elegant, guiding. Tone descriptor: LUXURY AUTHORITY — never weak, generic, salesy, or apologetic. Confidence without arrogance. Warmth without weakness.

## ABSOLUTE RULES (violating any of these is unacceptable)
1. NEVER mention commission, kickback, vendor markup, vendor pays us, "we receive a fee from", or any phrasing implying pay-to-recommend. The official client-facing position is: flat-fee planning model, no commission. This applies to all languages.
2. NEVER mention AI, automation, or that this message was drafted automatically.
3. NEVER invent details not present in the original message or knowledge base context. No fabricated dates, prices, vendor names, availabilities, or guarantees.
4. NEVER use generic openers ("Thank you for reaching out", "I hope this email finds you well", "Just circling back").
5. NEVER use corporate filler ("per our policy", "please be advised", "at your earliest convenience").
6. NEVER promise specific dates or pricing without team confirmation.
7. Calls: Audrey takes calls only on Mondays and Wednesdays. Never offer Friday/weekend slots.
8. Subject lines for planning-step emails are FIXED. The subject is provided to you separately ({{fixed_subject}}); never paraphrase or change it.

## PRE-SIGNATURE vs POST-SIGNATURE
Current state: signature_signed = {{signature_signed}}.
{{pre_signature_constraint}}

## Voice & Tone Calibration by Category
- new_inquiry: warm, excited, aspirational, authoritative. Qualify the lead. Always include consultation invitation (Mon/Wed Paris time).
- existing_client: familiar, reassuring, efficient. Reference their timeline.
- vendor: professional, respectful, action-oriented. Maintain warmth but prioritise clarity and next steps. May come from partners@dreampariswedding.com.
- collaboration: appreciative, professional, open. Polite filtering.
- general: helpful, concise, inviting. Answer directly, gently invite deeper engagement.

## Channel Rules
- Gmail: full email structure. Greeting, body paragraphs, sign-off with full name and Dream Paris Wedding beneath.
- WhatsApp: shorter, conversational. 1-2 emojis allowed sparingly. No formal sign-off. Under 300 words.
- Instagram: casual but elegant. Emojis allowed. Under 200 words.

## Length Guidelines
- new_inquiry: 150-300 words
- existing_client: 100-200 words
- vendor: 80-150 words
- general: 80-150 words
- WhatsApp: 50-150 words
- Instagram: 40-100 words

## Sign-off
{{sender_signature}}
$P1$), 'Master brand voice system prompt for AI drafting (P1). Slots: sender_persona, sender_full_name, sender_signature, fixed_subject, signature_signed, pre_signature_constraint.')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = now();

-- P2 Classification (verbatim from docs/PROMPTS.md)
INSERT INTO system_config (config_key, config_value, description) VALUES
('classification_prompt', to_jsonb($P2$
You are a message classification engine for Dream Paris Wedding, a luxury Paris wedding planning company.

Analyse the following incoming message and classify it. Return ONLY a valid JSON object with no additional text.

Categories: "new_inquiry" | "existing_client" | "vendor" | "collaboration" | "general"
Priority: "high" | "medium" | "low"
Tier: 1 | 2 | 3

Tier 3 if: guest_count > 20 OR estimated_value > 5000 OR mentions cancel/complaint/legal/refund/dispute OR confidence < 0.70.
Tier 2 if: existing_client | vendor | collaboration | unknown sender.
Tier 1 if: general FAQ-type with clear KB answers, simple follow-ups from known contacts.

Estimated value buckets:
- < 20 guests: 8000-15000
- 20-60 guests: 15000-30000
- 60+ guests: 30000-50000+
- Insufficient info: null

Sender context: name {{sender_name}}, email {{sender_email}}, known {{is_known_sender}}, type {{sender_type}}.
Subject: {{subject}}
Body:
{{body_clean}}

Return JSON: {"category", "priority", "confidence", "tier", "estimated_value", "guest_count", "reasoning"}
$P2$), 'Classification prompt (P2). Used by classifier service.')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = now();

-- P3 Draft Generation user message template
INSERT INTO system_config (config_key, config_value, description) VALUES
('draft_user_template', to_jsonb($P3$
## Your Task
Write a reply to the following incoming message on behalf of Dream Paris Wedding.

Sender persona for this reply: {{sender_persona}} ({{sender_full_name}}, {{sender_email}})
Fixed subject line (DO NOT change): {{fixed_subject}}
Channel: {{channel}}
Category: {{category}}
Priority: {{priority}}
Lead planning step: {{planning_step}}
Signature signed: {{signature_signed}}

## Original Message
From: {{original_sender_name}} <{{original_sender_email}}>
Subject: {{original_subject}}
Date: {{received_at}}

{{body_clean}}

## Relevant Knowledge Base Context
The following are brand-approved templates, email examples, and FAQs retrieved from our knowledge base. Use them to match tone and inform your reply. Do NOT mention them or quote them verbatim.

---
{{retrieved_context}}
---

## Instructions
1. Write the reply body only. Do NOT include a Subject line in your output.
2. Sign off as {{sender_signature}}.
3. Reference specific details the sender mentioned.
4. Include a clear next step. If proposing a call, say "Monday or Wednesday at your preferred time (Paris time)" — never offer a specific weekend or Friday slot.
5. Stay within the word-count guideline for this category.
6. Do NOT invent any details not in the message or KB context above.
7. Do NOT mention commission, vendor markup, or any pay-to-recommend phrasing.
$P3$), 'Draft generation user-message template (P3).')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = now();

-- P4 Lead Extraction
INSERT INTO system_config (config_key, config_value, description) VALUES
('lead_extraction_prompt', to_jsonb($P4$
You are a lead data extraction engine for Dream Paris Wedding.

Extract structured lead information from the message. Return ONLY a valid JSON object. Use null for any field not explicitly present.

From: {{sender_name}} <{{sender_email}}>
Subject: {{subject}}

{{body_clean}}

Return JSON:
{"client_names": ["string"]|null, "email": "string"|null, "phone": "string"|null, "location": "string"|null, "wedding_date": "YYYY-MM-DD or descriptive"|null, "wedding_date_flexible": true|false|null, "guest_count": number|null, "budget_range": "string"|null, "venue_preference": "string"|null, "services_requested": ["string"]|null, "how_found_us": "string"|null, "ai_summary": "2-3 sentences"}
$P4$), 'Lead extraction prompt (P4).')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = now();

-- P5 Regeneration
INSERT INTO system_config (config_key, config_value, description) VALUES
('regeneration_prompt', to_jsonb($P5$
## Task
Write a fresh reply. A previous draft was generated but needs improvement based on team feedback.

## Previous Draft (do not reuse phrasing)
{{previous_draft_text}}

## Team Feedback
{{regeneration_instructions}}

## Original Message
From: {{original_sender_name}} <{{original_sender_email}}>
Subject: {{original_subject}}
Channel: {{channel}}
Category: {{category}}

{{body_clean}}

## Knowledge Base Context
---
{{retrieved_context}}
---

## Instructions
1. Write a NEW reply. Do not edit/rephrase the previous draft.
2. Address the specific feedback above.
3. All brand-voice rules from your system instructions apply.
4. If no specific feedback, aim for a warmer, more personalised tone.
5. Sign off as {{sender_signature}}. Do not include a Subject line.
$P5$), 'Regeneration prompt (P5).')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = now();

-- P6 Tone Validation
INSERT INTO system_config (config_key, config_value, description) VALUES
('tone_validation_prompt', to_jsonb($P6$
You evaluate AI-generated draft replies against Dream Paris Wedding's brand standards. Voice: warm, elegant, personal, confident, guiding, never weak or generic. No corporate filler. No commission language. No invented details. Appropriate length for category and channel.

Category: {{category}}
Channel: {{channel}}

Draft:
{{draft_text}}

Original message (for context):
{{body_clean}}

Return JSON only: {"tone_score": 0-100, "passes": boolean, "issues": ["string"], "suggestion": "string"|null}

Scoring: 90-100 excellent, 75-89 good, 60-74 acceptable with edits, <60 fails. passes=true if tone_score >= 75.
$P6$), 'Tone validation prompt (P6).')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = now();

-- Sender routing map (per Rule 5 in SONNET_EXECUTION.md)
INSERT INTO system_config (config_key, config_value, description) VALUES
('sender_routing', '{
  "lead_qualification": {"sender":"audrey","from":"audrey@dreampariswedding.com","full_name":"Audrey","signature":"Warm regards,\nAudrey\nDream Paris Wedding"},
  "consultation_followup": {"sender":"audrey","from":"audrey@dreampariswedding.com","full_name":"Audrey","signature":"Warm regards,\nAudrey\nDream Paris Wedding"},
  "package_pricing_email": {"sender":"audrey","from":"audrey@dreampariswedding.com","full_name":"Audrey","signature":"Looking forward to working with you,\nAudrey"},
  "contract_transmission": {"sender":"audrey","from":"audrey@dreampariswedding.com","full_name":"Audrey","cc":["vanessa@dreampariswedding.com","admin@dreampariswedding.com"],"signature":"Warm regards,\nAudrey"},
  "masterfile_welcome_kit": {"sender":"frederic","from":"admin@dreampariswedding.com","full_name":"Frédéric","signature":"Warm regards,\nFrédéric\nEvent Administrative Assistant\nDream Paris Wedding"},
  "day_of_form": {"sender":"frederic","from":"admin@dreampariswedding.com","full_name":"Frédéric","signature":"Warm regards,\nFrédéric\nDream Paris Wedding"},
  "venue_sourcing": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "catering_selection": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "cake_selection": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "save_the_date": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "photo_video": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "mc_officiant": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "music": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "entertainment": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "beauty": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "transport": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "room_blocks": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "design_consultation": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "mood_board_proposal": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "tastings_trials": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "rsvp_print": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "month_of_coordination": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "rehearsal_walkthrough": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa\nDream Paris Wedding"},
  "wedding_day": {"sender":"vanessa","from":"vanessa@dreampariswedding.com","full_name":"Vanessa","signature":"Best,\nVanessa"},
  "vendor_communication": {"sender":"partners","from":"partners@dreampariswedding.com","full_name":"Dream Paris Wedding","signature":"Best regards,\nDream Paris Wedding"},
  "freeform_general": {"sender":"audrey","from":"audrey@dreampariswedding.com","full_name":"Audrey","signature":"Warm regards,\nAudrey\nDream Paris Wedding"}
}'::jsonb, 'Mapping from planning_step to sender persona, from-address, signature, and CCs.')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = now();

-- Fixed subject lines (per planning step). EXACT MATCH ONLY — never paraphrase.
INSERT INTO system_config (config_key, config_value, description) VALUES
('planning_step_subjects', '{
  "contract_transmission": "YOUR WEDDING WITH DREAM PARIS WEDDING",
  "masterfile_welcome_kit": "MASTERFILE + PAYMENT RECEIPT + WELCOME KIT",
  "day_of_form": "Your Wedding Day-Of Details Form ✨",
  "venue_sourcing": "VENUE SELECTION",
  "catering_selection": "CATERING SELECTION",
  "cake_selection": "WEDDING CAKE",
  "save_the_date": "SAVE THE DATE & INVITATION DIRECTION",
  "photo_video": "PHOTOGRAPHER & VIDEOGRAPHER",
  "mc_officiant": "MC / OFFICIANT",
  "music": "MUSIC SELECTION",
  "entertainment": "ENTERTAINMENT VENDORS",
  "beauty": "BEAUTY SERVICES",
  "transport": "TRANSPORTATION",
  "room_blocks": "ROOM BLOCKS",
  "design_consultation": "DESIGN CONSULTATION",
  "mood_board_proposal": "MOOD BOARD & DECOR PROPOSAL",
  "tastings_trials": "TASTINGS & TRIALS",
  "rsvp_print": "RSVP & PRINT MATERIALS",
  "month_of_coordination": "MONTH-OF COORDINATION",
  "rehearsal_walkthrough": "REHEARSAL & FINAL WALKTHROUGH"
}'::jsonb, 'Fixed exact-match subject lines per planning step. Never paraphrase.')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = now();

-- Forbidden tokens (commission filter)
INSERT INTO system_config (config_key, config_value, description) VALUES
('forbidden_tokens', '{
  "patterns": [
    "(?i)\\bcommission\\b",
    "(?i)\\bkickback\\b",
    "(?i)\\b(?<!time\\s)markup\\b",
    "(?i)\\bvendor\\s+pays\\b",
    "(?i)\\bwe\\s+receive\\s+a?\\s*fee\\s+from\\b",
    "(?i)\\bpay-?to-?recommend\\b",
    "(?i)commissionnement",
    "(?i)pourcentage\\s+sur",
    "(?i)comiss[ãa]o"
  ],
  "action": "regenerate_then_flag"
}'::jsonb, 'Regex patterns for client-facing commission/kickback language. Action: regenerate up to 2x; if still present, flag for human review.')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = now();

-- Pre-signature constraint text (injected into P1 system prompt when signature_signed=false)
INSERT INTO system_config (config_key, config_value, description) VALUES
('pre_signature_constraint', to_jsonb($PSC$
The lead has NOT yet signed the contract. Pre-signature behavior:
- Reply must qualify the lead, set expectations, and position our service. Do NOT deliver detailed planning work.
- Do NOT provide specific venue lists, vendor names, design proposals, or custom timelines.
- Tone: warm, professional, but controlled. The objective is to determine fit, not to over-deliver.
- If the inquiry has insufficient info (no date, no guest count, no budget), use the qualification template flow.
- If sufficient info, propose a Monday or Wednesday call (Paris time).
$PSC$), 'Constraint injected when lead.signature_signed=false.')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = now();

-- Auto-send rules (existing key, ensure shape)
UPDATE system_config SET config_value = '{"tier_1_enabled": true, "min_tone_confidence": 75, "min_classification_confidence": 0.85}'::jsonb
WHERE config_key = 'auto_send_rules';
```

**Acceptance criteria**:
- Run `supabase db push` (or apply via SQL editor). No errors.
- `SELECT config_key FROM system_config ORDER BY config_key;` returns at least: `auto_send_rules`, `brand_voice_prompt`, `business_hours`, `classification_prompt`, `draft_user_template`, `email_signature`, `exclusion_list`, `forbidden_tokens`, `lead_extraction_prompt`, `notification_emails`, `planning_step_subjects`, `pre_signature_constraint`, `regeneration_prompt`, `sender_routing`, `tone_validation_prompt`.
- `SELECT planning_step, signature_signed FROM leads LIMIT 1;` returns columns (no error).
- `SELECT * FROM planning_step_history LIMIT 0;` returns the empty result (table exists).

---

### TASK 3 — Backend authentication middleware

**Files to create**:
- `backend/src/middleware/auth.ts`
- `backend/src/middleware/hmac.ts`
- `backend/src/lib/supabaseAuth.ts` (separate from `supabase.ts` — for user-scoped clients)

**Files to modify**:
- `backend/src/index.ts`

**Logic — `backend/src/middleware/auth.ts`**:

```typescript
import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AuthedRequest extends Request {
  user?: { id: string; auth_id: string; email: string; role: 'admin' | 'manager' | 'team_member' }
  userJwt?: string
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing bearer token' })

  const { data, error } = await adminClient.auth.getUser(token)
  if (error || !data.user) return res.status(401).json({ error: 'Invalid token' })

  const { data: userRow, error: userErr } = await adminClient
    .from('users').select('id, auth_id, email, role, is_active').eq('auth_id', data.user.id).single()
  if (userErr || !userRow || !userRow.is_active) {
    return res.status(403).json({ error: 'User not provisioned or inactive' })
  }
  req.user = { id: userRow.id, auth_id: userRow.auth_id, email: userRow.email, role: userRow.role as any }
  req.userJwt = token
  next()
}

export function requireRole(...roles: Array<'admin' | 'manager' | 'team_member'>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient role' })
    next()
  }
}
```

**Logic — `backend/src/middleware/hmac.ts`**:

```typescript
import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

export function requireHmac(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) return res.status(500).json({ error: 'N8N_WEBHOOK_SECRET not configured' })

  const sig = req.header('x-dpca-signature') || ''
  const body = JSON.stringify(req.body) // body must already be parsed JSON
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid signature' })
  }
  next()
}

export function requireInternalToken(req: Request, res: Response, next: NextFunction) {
  const token = req.header('x-internal-token') || ''
  if (!token || token !== process.env.INTERNAL_API_TOKEN) {
    return res.status(401).json({ error: 'Invalid internal token' })
  }
  next()
}
```

**Modify `backend/src/index.ts`**:
- Apply `requireAuth` to `/api/messages`, `/api/drafts`, `/api/leads`, `/api/inboxes`.
- Apply `requireHmac` to all `/api/webhooks/*` routes (it's a middleware on the router).
- `requireInternalToken` will protect the new `/api/internal/*` routes added in Task 4.
- Keep `/api/health` unauthenticated.

```typescript
import { requireAuth } from './middleware/auth'
import { requireHmac } from './middleware/hmac'

app.use('/api/health', healthRouter)
app.use('/api/messages', requireAuth, messagesRouter)
app.use('/api/drafts', requireAuth, draftsRouter)
app.use('/api/leads', requireAuth, leadsRouter)
app.use('/api/inboxes', requireAuth, inboxesRouter)
app.use('/api/webhooks', requireHmac, webhooksRouter)
```

**Acceptance criteria**:
- `curl -X GET http://localhost:3001/api/messages` returns 401 with `{"error":"Missing bearer token"}`.
- `curl -X GET http://localhost:3001/api/messages -H "Authorization: Bearer <valid_jwt>"` returns the messages list.
- `curl -X POST http://localhost:3001/api/webhooks/n8n/message-classified -H "Content-Type: application/json" -d '{...}'` returns 401 (no signature).
- With valid HMAC header, the webhook accepts the payload.

---

### TASK 4 — Backend AI services

This is the largest task. Build the services in `backend/src/services/` and the internal HTTP routes that wrap them.

**Install npm packages** in `backend/`:
```
npm install openai @pinecone-database/pinecone
```

**Files to create**:
- `backend/src/lib/openai.ts`
- `backend/src/lib/pinecone.ts`
- `backend/src/lib/systemConfig.ts` (cached config getter)
- `backend/src/services/classifier.ts`
- `backend/src/services/retrieval.ts`
- `backend/src/services/draftGenerator.ts`
- `backend/src/services/leadExtractor.ts`
- `backend/src/services/embedder.ts`
- `backend/src/services/sanitizers.ts`
- `backend/src/routes/internal.ts`

**`backend/src/lib/openai.ts`**:
```typescript
import OpenAI from 'openai'
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
export const MODEL_DRAFT = process.env.OPENAI_MODEL_DRAFT || 'gpt-4o'
export const MODEL_CLASSIFY = process.env.OPENAI_MODEL_CLASSIFY || 'gpt-4o'
export const MODEL_EMBED = process.env.OPENAI_MODEL_EMBED || 'text-embedding-3-small'
```

**`backend/src/lib/pinecone.ts`**:
```typescript
import { Pinecone } from '@pinecone-database/pinecone'
export const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
export const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME!, process.env.PINECONE_INDEX_HOST)
```

**`backend/src/lib/systemConfig.ts`**:
- Export `getConfig(key: string): Promise<unknown>` with a 60-second in-memory cache.
- Export `getConfigs(...keys: string[]): Promise<Record<string,unknown>>` for batch fetch.
- Reads from `system_config` via the service-role client.

**`backend/src/services/classifier.ts`**:
- Export `classify({message_id}): Promise<ClassificationResult>`.
- Steps:
  1. Fetch the message row (full body, sender info).
  2. Fetch `classification_prompt` from `system_config`.
  3. Render the template with the message context.
  4. Call OpenAI Chat Completions with `model: MODEL_CLASSIFY, temperature: 0.1, max_tokens: 300, response_format: { type: 'json_object' }`. System message is the prompt; user message can be empty or the body again — keep consistent.
  5. Parse JSON. Validate against Zod schema `ClassificationResultSchema`.
  6. Apply safety overrides:
     - If `confidence < 0.70` → `tier = Math.min(3, tier + 1)`.
     - If `category === 'new_inquiry' && (estimated_value > 5000 || guest_count > 20)` → `tier = 3`.
     - If body matches `/cancel|complaint|legal|refund|dispute/i` → `tier = 3`.
     - If `sender_type === 'unknown' && tier === 1` → `tier = 2`.
  7. Update `messages` row: `category, priority, tier, classification_confidence, estimated_value, guest_count, classification_reasoning, classification_status='classified', classified_at=now()`.
  8. Return the result.

**`backend/src/services/retrieval.ts`**:
- Export `retrieve({message_id, category, subject, body_clean, top_k = 5}): Promise<RetrievedContext>`.
- Steps:
  1. Build query text: `subject + " " + body_clean.slice(0, 500)`.
  2. Embed via OpenAI (`MODEL_EMBED`).
  3. Build the metadata filter from category mapping (Rule 4):
     ```
     const filterMap = {
       new_inquiry: ['template','email_example','faq','qualification'],
       existing_client: ['email_example','template','process'],
       vendor: ['vendor','template'],
       collaboration: ['email_example','template'],
       general: ['faq','template']
     }
     ```
  4. Query Pinecone: `index.query({ vector, topK, filter: { category: { $in: filterMap[category] } }, includeMetadata: true })`.
  5. Hydrate KB rows from Supabase by `pinecone_id` to get full `content`.
  6. Concatenate as `## [Title] ([category])\n[content]\n\n---\n\n` blocks, truncate to ~1500 tokens (~6000 chars).
  7. Return `{ context_text, source_ids: kb_entry_ids[] }`.

**`backend/src/services/sanitizers.ts`**:
- Export `commissionSanitize(text: string): { passed: boolean; matches: string[] }`.
- Loads `forbidden_tokens.patterns` from system_config, compiles to RegExp[], runs each against text, collects matches.
- Returns `passed: matches.length === 0`.
- Export `callAvailabilitySanitize(text: string): { fixed: string; changed: boolean }`.
  - Detects day-name + time patterns. If proposed day is not Monday or Wednesday, replace with "Monday or Wednesday at a time of your preference (Paris time)".
- Export `subjectLineEnforcer(actualSubject: string | null, expectedSubject: string | null): { ok: boolean; subject: string }` — returns `{ ok: true, subject: expectedSubject }` if a fixed subject is required; comparison is exact-match string equality.

**`backend/src/services/draftGenerator.ts`**:
- Export `generateDraft({message_id, lead_id?, regeneration_instructions?, previous_draft_id?}): Promise<DraftResult>`.
- Steps:
  1. Fetch message + classification + lead (if any).
  2. Determine `planning_step`: from `lead.planning_step` if lead exists, else `'freeform_general'`.
  3. Determine `signature_signed`: from `lead.signature_signed` if lead exists, else `false`.
  4. Look up sender persona: `sender_routing[planning_step]`.
  5. Look up fixed subject: `planning_step_subjects[planning_step]` (may be null).
  6. Retrieve context via `retrieve()`.
  7. Build system message from `brand_voice_prompt` template, filling slots:
     - `sender_persona`, `sender_full_name`, `sender_signature`
     - `fixed_subject` (or empty)
     - `signature_signed`
     - `pre_signature_constraint` (if !signed, fill with `pre_signature_constraint` config; else empty string)
  8. Build user message from `draft_user_template` (or `regeneration_prompt` if regenerating), fill all slots.
  9. Call OpenAI: `temperature: 0.4, max_tokens: 800`.
  10. Run `commissionSanitize(text)`. If failed AND retries < 2 → re-call OpenAI with appended system reminder "Your previous output mentioned forbidden commission/markup language. Rewrite without any commission, kickback, or pay-to-recommend phrasing." If failed after 2 retries → mark `status: 'pending_review'` and add note `'Commission filter triggered — needs human review'` to `audit_log.metadata`.
  11. Run `callAvailabilitySanitize(text)`.
  12. Optionally call P6 tone validator (set `tone_confidence`). If `tone_confidence < TONE_CONFIDENCE_THRESHOLD` → force `status: 'pending_review'` (override Tier 1 auto-approve).
  13. Insert draft row with `sender_persona, sender_email, subject_line, planning_step, draft_text, tone_confidence, context_sources, model_used, prompt_tokens, completion_tokens, status`.
  14. Update message status accordingly.
  15. Return draft.

**`backend/src/services/leadExtractor.ts`**:
- Export `extractLead({message_id}): Promise<Lead>`.
- Calls OpenAI with P4. Parses JSON. Upserts into `leads` table by `email`. Appends to `activity_timeline`. Returns the lead.

**`backend/src/services/embedder.ts`**:
- Export `embedKbEntry(kbId: string)` and `embedKbBatch(kbIds?: string[])`.
- For each entry: load `title + content`, embed, upsert to Pinecone with metadata `{category, subcategory, title, kb_id}`. Update `knowledge_base` row: `embedding_status='embedded', pinecone_id=kbId, embedded_at=now()`.

**`backend/src/routes/internal.ts`**:
- Apply `requireInternalToken` middleware.
- Routes:
  - `POST /classify` → calls `classifier.classify()`. Body: `{message_id}`.
  - `POST /generate-draft` → calls `draftGenerator.generateDraft()`. Body: `{message_id, regeneration_instructions?, previous_draft_id?}`.
  - `POST /extract-lead` → calls `leadExtractor.extractLead()`. Body: `{message_id}`.
  - `POST /embed-kb` → calls `embedder.embedKbBatch()`. Body: `{kb_ids?: string[]}`.
  - `POST /retrieve` → calls `retrieval.retrieve()` (used by tests). Body: `{message_id}`.

Mount in `backend/src/index.ts`:
```typescript
import { internalRouter } from './routes/internal'
import { requireInternalToken } from './middleware/hmac'
app.use('/api/internal', requireInternalToken, internalRouter)
```

**Acceptance criteria** (manual + automated):
- Insert a test message with category=`new_inquiry`. Call `POST /api/internal/classify`. Verify `messages` row updated with category, priority, tier, classification_confidence.
- Call `POST /api/internal/generate-draft`. Verify a draft row appears with `sender_persona='audrey'` (since `planning_step='lead_qualification'` for new lead), no commission language, signed off as Audrey.
- Insert a KB entry with category=`vendor`. Call `POST /api/internal/embed-kb`. Verify `embedding_status='embedded'` and `pinecone_id` populated. Confirm Pinecone has the vector.
- Test commission filter: temporarily seed a draft template that includes "vendor commission". Generate. Verify auto-regenerate happens; if all retries fail, draft is `pending_review` and `audit_log` has the metadata note.
- Test pre-signature gating: lead with `signature_signed=false`. Generate draft for new_inquiry. Verify draft does NOT include specific venue names or vendor names.
- Test call availability: prompt the model in a way that might suggest Friday. Verify post-processor rewrites to Monday/Wednesday wording.

---

### TASK 5 — Wire n8n workflows as thin HTTP orchestrators

The strategic decision: **n8n triggers + channel I/O**, **backend does AI**. n8n calls `/api/internal/*` endpoints; the backend owns prompts, retrieval, sanitizers, and storage.

**Files to modify**:
- `n8n-workflows/WF1-email-ingestion.json`
- `n8n-workflows/WF2-classification.json`
- `n8n-workflows/WF5-draft-generation.json`
- `n8n-workflows/WF6-auto-send.json`
- `n8n-workflows/WF7-lead-extraction.json`
- `n8n-workflows/WF8-dashboard-actions.json`

**WF1**: Replace the inline JWT in the HTTP Request node with a credential reference. In n8n, create a credential `Supabase REST - Service Role` of type "Header Auth" with `apikey` and `Authorization: Bearer ...`. Update the JSON's `credentials` block to reference it. Remove the inline `headerParameters` containing the JWT.

**WF2** — replace OpenAI node + safety logic with a single HTTP call:
- Webhook trigger `POST /webhook/wf2-trigger` with body `{message_external_id}`.
- HTTP node: `POST {{$env.BACKEND_URL}}/api/internal/classify` with body `{message_external_id}` and header `x-internal-token: {{$env.INTERNAL_API_TOKEN}}`.
- Decision node: if response has `tier === 3` → trigger Tier-3 notify branch; else trigger WF5 webhook with body `{message_id}`. If `category === 'new_inquiry'` → also trigger WF7.

**WF5** — drop OpenAI node:
- Webhook `POST /webhook/wf5-trigger` with body `{message_id}`.
- HTTP node: `POST {{$env.BACKEND_URL}}/api/internal/generate-draft`.
- If response includes `auto_send: true` → trigger WF6 with body `{draft_id}`.
- Else: end workflow (draft sits awaiting human review).

**WF6** — Gmail send (real config):
- Webhook `POST /webhook/send-message` with body `{draft_id}`.
- HTTP node fetch draft + message: `GET {{$env.BACKEND_URL}}/api/messages/:id` (server-to-server, must use internal token mode — add `requireInternalToken` to a new `/api/internal/messages/:id` route returning the same shape).
- Switch on `channel`:
  - `gmail`: Gmail Send node configured with the draft's `sender_email` as the from address (requires that the corresponding inbox has an OAuth credential matching that mailbox), `subject_line` from draft, `draft_text` as body, `In-Reply-To: original message_id_header`, `References: thread_id`. Apply label `AI-Sent`, remove `AI-Processing`. CC the draft's `cc` array if present (from sender_routing). Implement 3 retries with exponential backoff using n8n's Retry on Fail node setting.
  - `whatsapp` and `instagram`: stub branches that log a warning and update the draft to `send_failed` with `error_message: 'channel not yet enabled (Meta App Review pending)'`. Do NOT attempt to call Meta APIs until those credentials exist.
- HTTP callback: `POST /api/webhooks/n8n/send-result` with body `{draft_id, message_id, success, sent_at?, error_message?}` and an HMAC signature header.

**WF7** — `POST /api/internal/extract-lead` with `{message_id}`. No additional logic.

**WF8** — replace per-action logic with a single HTTP call:
- Webhook `POST /webhook/draft-action` with body `{action, draft_id, message_id, user_id, ...}`.
- For `regenerate`, `reject`, `reassign`: call `POST /api/internal/dashboard-action` with the same body.
- For `approve` and `edit_and_send`: backend `/api/drafts/:id/approve` already handles state; from there, call WF6 send-message webhook to physically send.
- Note: the current backend `/api/drafts/:id/regenerate` already triggers a webhook to n8n. Keep that, but also add a parallel `/api/internal/regenerate-draft` so n8n can invoke regeneration entirely server-side without the backend round-trip if needed. Pick one path; the simpler is: dashboard → backend → backend internal generator (no n8n round-trip for regen).

**Add backend route `/api/internal/dashboard-action`** in `backend/src/routes/internal.ts`:
- Body: `{action, draft_id, message_id, user_id, ...}`.
- Dispatches: `regenerate` → `draftGenerator.generateDraft({message_id, previous_draft_id: draft_id, regeneration_instructions})`. `reject` → updates draft status + audit. `reassign` → updates assigned_to + audit.

**Acceptance criteria**:
- Send a real email to the test Gmail inbox. Within 90 seconds, see: a row in `messages` (status=`classified` then `draft_ready`), a row in `drafts` (with sender_persona populated, sanitizers passed). Dashboard inbox shows the message with the draft.
- From the dashboard, click "Approve & Send". The reply lands in the original Gmail thread within 30 seconds. The Gmail label `AI-Sent` is applied.
- From the dashboard, click "Regenerate" with instructions "make it warmer and shorter". A new draft (version=2) appears.

---

### TASK 6 — Dashboard UX gaps

**Files to modify**:
- `dashboard/app/inbox/page.tsx`

**New components**:
- `dashboard/components/RegenerateModal.tsx`
- `dashboard/components/RejectModal.tsx`
- `dashboard/components/VersionHistory.tsx`
- `dashboard/components/ContextSources.tsx`

**RegenerateModal**:
- Props: `open: boolean, draftId: string, onClose, onSubmit(instructions: string)`.
- UI: textarea labeled "What should be different?", primary button "Regenerate", secondary "Cancel".
- On submit: `POST /api/drafts/:id/regenerate` with `{reviewed_by, instructions}`. On 200 → `mutate()` and close.
- Match the design tokens already in `inbox/page.tsx` (gold/serif/sans). Modal overlay with `position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100;`.

**RejectModal**:
- Props: `open, draftId, onClose, onSubmit(reason: string, category: string)`.
- UI: dropdown of reason categories (`tone_off`, `factual_error`, `commission_leak`, `wrong_sender`, `length`, `other`), textarea for free-form reason.
- On submit: `POST /api/drafts/:id/reject` with `{reviewed_by, rejection_reason: \`[${category}] ${reason}\`}`.

**VersionHistory**:
- Props: `messageId: string`.
- Fetches all drafts for the message (`GET /api/messages/:id` already returns `drafts(*)`).
- Renders a collapsible panel listing each version with: version number, created_at, sender_persona, status, tone_confidence, "View" button to load that version into the editor.

**ContextSources**:
- Props: `draftId: string, contextSources: string[]` (UUIDs).
- Fetches KB titles from Supabase (`SELECT id, title, category FROM knowledge_base WHERE id IN (...)`).
- Renders a list of small chips with the KB title and category, each linking to `/knowledge-base?selected=<id>`.
- Lives in the meta panel of the inbox view, below "Today's Stats".

**Modify `inbox/page.tsx`**:
- Add buttons "↻ Regenerate" and "✕ Reject with reason" to the Review Header. Wire them to the new modals.
- Replace the current `handleDiscard` with the modal flow.
- Add `<VersionHistory messageId={selected.id} />` in the right meta panel below "Sending Mode".
- Add `<ContextSources draftId={activeDraft.id} contextSources={activeDraft.context_sources ?? []} />` below "Channel Activity".

**Acceptance criteria**:
- Click "Regenerate" on a draft → modal opens → enter "make warmer" → submit → new draft version appears within 30s, modal closes, inbox refreshes.
- Click "Reject" → modal opens with dropdown + textarea → submit → draft status flips to `rejected` with `rejection_reason` populated.
- Version history shows all draft versions; clicking "View" loads that version into the textarea.
- Context sources display 3-5 chips with KB titles; clicking a chip navigates to the KB page with that entry selected.

---

### TASK 7 — Knowledge base import pipeline

**Files to create**:
- `scripts/kb-import.ts`
- `knowledge-base/README.md` (folder structure documentation — short)
- `knowledge-base/brand-voice/audrey-tone.md` (seed file)
- `knowledge-base/email-examples/lead-qualification-incomplete.md` (seed)
- `knowledge-base/email-examples/lead-qualification-complete.md` (seed)
- `knowledge-base/email-examples/contract-transmission.md` (seed)
- `knowledge-base/email-examples/masterfile-welcome-kit.md` (seed)
- `knowledge-base/templates/call-confirmation-whatsapp.md` (seed)
- (continue with 15+ files extracted from `graphify-out/converted/Ai Brain Date and Core Report - DREAM PARIS WEDDING_b9bf4da8.md`)

**Folder structure**:
```
knowledge-base/
  brand-voice/        # category=brand_voice — but note: brand voice rules go in system_config, NOT here. This subfolder is for brand-voice EXAMPLES (sample sentences, openings, closings)
  email-examples/     # category=email_example
  templates/          # category=template
  faqs/               # category=faq
  vendors/            # category=vendor
  process/            # category=process
  qualification/      # category=qualification
```

**File frontmatter format**:
```yaml
---
title: "Lead qualification — incomplete info"
category: email_example
subcategory: lead_qualification
tags: [audrey, pre_signature, gmail]
---

Content body here…
```

**Script logic — `scripts/kb-import.ts`**:
- Reads all `.md` files in `knowledge-base/`.
- Parses YAML frontmatter (use `gray-matter` package).
- For each file: upsert into `knowledge_base` by `(title, category)` natural key. Set `embedding_status='pending'`. Body = the markdown content after frontmatter.
- After all upserts: collect all `pending` IDs, POST `/api/internal/embed-kb` with the IDs.
- Print summary: imported N files, embedded M.

**Run via** `npx tsx scripts/kb-import.ts`.

**Acceptance criteria**:
- 15+ KB files committed.
- Running the script imports them; `SELECT count(*) FROM knowledge_base WHERE is_active` shows the increased count.
- All have `embedding_status='embedded'` after the script completes.
- Pinecone index has the corresponding vectors.
- A test classification of a `new_inquiry` message retrieves at least one `email_example` from the seeded set.

---

### TASK 8 — Audit log viewer + analytics page

**Files to create**:
- `dashboard/app/audit/page.tsx`
- `dashboard/app/analytics/page.tsx`

**Audit page**:
- Admin-only (check via `supabase.auth.getUser()` + role lookup; redirect non-admins to `/inbox`).
- Table: timestamp, user email, action_type, draft_id (link to inbox), message_id (link), metadata (JSON pretty-printed).
- Filters: action_type dropdown, user dropdown, date range.
- Reads from `audit_log` directly via Supabase (RLS allows admin read).

**Analytics page**:
- Admin/manager.
- Charts (use Recharts — `npm install recharts` in dashboard):
  - Approval rate (last 30 days): % of drafts with status in `(approved, edited_approved, sent)` vs total reviewed.
  - Avg response time (last 30 days): minutes from `messages.received_at` to `drafts.sent_at`.
  - Channel breakdown: pie of message counts by channel.
  - Tone confidence distribution: histogram of `drafts.tone_confidence`.
  - Daily message volume: line chart, last 30 days.
- Reads via the `get_dashboard_stats()` function plus direct queries.

**Acceptance criteria**:
- Audit page renders 50+ rows after running through 5 approve/reject/regenerate flows.
- Analytics charts render with at least 7 days of seeded data.
- Both pages are protected: non-authenticated → redirect to `/login`; non-admin viewing audit → redirect to `/inbox`.

---

### TASK 9 — Bulk actions on inbox

**Files to modify**:
- `dashboard/app/inbox/page.tsx`
- `backend/src/routes/drafts.ts`

**Backend**:
- Add `POST /api/drafts/bulk` accepting `{action: 'approve'|'reject'|'reassign', draft_ids: string[], reviewed_by: string, ...}`. Loop over IDs and call existing handlers; aggregate results.

**Dashboard**:
- Add a checkbox to each MessageItem in the inbox list.
- Multi-select state: array of selected message IDs.
- When ≥ 1 selected: show a contextual action bar at the bottom of the list with "Approve all (N)", "Reject all", "Reassign all".
- "Reject all" opens RejectModal in bulk mode (one reason for the batch).

**Acceptance criteria**:
- Select 3 messages → click "Approve all" → all 3 drafts move to `approved` status, all 3 messages refresh in the list.

---

### TASK 10 — Final security pass + smoke test

**Verify**:
- [ ] `curl http://localhost:3001/api/messages` (no auth) returns 401.
- [ ] `curl http://localhost:3001/api/webhooks/n8n/message-classified` (no signature) returns 401.
- [ ] Search the codebase for any literal Supabase JWT (`eyJhbGciOiJIUzI1NiI...`). Should return zero matches outside `.env`.
- [ ] Search for `service_role` in the dashboard code (`dashboard/`). Should return zero matches.
- [ ] Confirm `dashboard/middleware.ts` redirects unauthenticated users.
- [ ] Send a test email through the full pipeline. Confirm: ingested → classified → drafted → human-approved → sent. Check audit_log has all events.
- [ ] Test commission filter: configure a fake KB entry that says "we receive a 15% commission". Trigger draft generation referencing it. Verify the draft is regenerated; if it persists, draft is flagged for human review.
- [ ] Test pre-signature: lead with signature_signed=false, message asks "what venues do you recommend?". Generated draft should NOT name specific venues; should redirect to qualification call.
- [ ] Test fixed subject: simulate a contract transmission. Verify the outgoing email's subject is exactly `YOUR WEDDING WITH DREAM PARIS WEDDING` (case-sensitive).
- [ ] Test sender routing: post-payment email is sent from `admin@dreampariswedding.com` and signs off as Frédéric.

---

## 6. Testing Instructions per Module

| Module | How to test |
|---|---|
| **Backend auth** | `npm run dev` → `curl` calls with/without bearer token. |
| **HMAC** | `curl` with crafted signature using `openssl dgst -sha256 -hmac $N8N_WEBHOOK_SECRET` on the body. |
| **Classifier** | Insert message → POST `/api/internal/classify` → assert DB updated. Run with 5 sample messages of different categories. |
| **Retrieval** | Seed KB entries with distinct categories → POST `/api/internal/retrieve` → assert filter applied (no `vendor` entries returned for `new_inquiry` query). |
| **Draft generator** | Seed lead with `planning_step='lead_qualification', signature_signed=false` → generate → assert draft body has no specific venue names, signs off as Audrey. Then update lead to `signature_signed=true, planning_step='masterfile_welcome_kit'` → generate → assert draft signs off as Frédéric. |
| **Sanitizers** | Unit-test `commissionSanitize("we receive a commission of 15%")` → `passed: false`. `commissionSanitize("the time markup")` → `passed: true` (negative lookbehind). `callAvailabilitySanitize("how about Friday at 3pm?")` → returns text with "Monday or Wednesday at a time of your preference (Paris time)". |
| **Embedder** | Seed KB entry → POST `/api/internal/embed-kb` → check `embedding_status='embedded'` and Pinecone index has the vector. |
| **Lead extractor** | Insert message with explicit lead details (Stephanie + Daniel, July 2026, 80 guests, Château) → extract → assert `leads` row populated. |
| **n8n WF1** | Send real email to test inbox → wait 2 min → verify message in DB. |
| **End-to-end** | The smoke test in Task 10. |
| **Dashboard modals** | Manual UI tests from Task 6. |

---

## 7. Order of Operations (do this in this exact sequence)

1. Task 1 (schema/code drift)
2. Task 2 (migrations + system_config seed)
3. Task 3 (backend auth + HMAC)
4. Task 4 (backend AI services) — biggest task, expect most time here
5. Task 5 (n8n thin orchestrators) — depends on 4
6. Task 6 (dashboard UX) — can start in parallel with 5
7. Task 7 (KB import pipeline) — can start in parallel with 5/6
8. Task 10 (security + smoke test) — must succeed before considering anything else done
9. Task 8 (audit log + analytics)
10. Task 9 (bulk actions)

---

## 8. What to Do When You're Stuck

- **Schema column doesn't exist**: check both `docs/DATABASE_SCHEMA.md` (canonical intent) and `supabase/migrations/*` (actual deployed state). If they disagree, the migrations are reality. If a column is missing, write a new migration; don't paper over with code workarounds.
- **OpenAI returns malformed JSON**: use `response_format: { type: 'json_object' }` on Chat Completions. If still flaky, retry once with appended "Return ONLY valid JSON, no preamble".
- **Pinecone empty results**: confirm the index dimension matches `text-embedding-3-small` (1536). Confirm `category` metadata is stored as a string, not an array, when upserting.
- **Auth middleware breaks dashboard**: dashboard's `inbox/page.tsx` currently calls backend without auth header. After Task 3, you must update fetch calls to include `Authorization: Bearer ${session.access_token}` from Supabase. Look for `BACKEND_URL` usages in `dashboard/app/inbox/page.tsx` and update each.
- **WF1 still references inline JWT after edit**: the credential reference goes in `credentials.httpHeaderAuth.name` field, not inline parameters. Confirm by re-importing the JSON into n8n and checking the node config.
- **Cannot rotate the exposed Supabase service-role JWT yourself**: flag this to the user immediately. They must rotate via Supabase dashboard. Do not proceed with Track C until rotation is confirmed.

---

## 9. What NOT to Do

- Do not add multi-tenancy beyond DPW.
- Do not implement WhatsApp/Instagram channels (Meta blocked). Stub the WF6 branches with `send_failed` + error message.
- Do not add new pages or routes not listed.
- Do not refactor existing `inbox/page.tsx` styling — it's intentional, match those tokens for new components.
- Do not modify `n8n-workflows/WF1-email-ingestion - old.json` (kept for reference).
- Do not add comments explaining what the code does — only WHY when the why is non-obvious.
- Do not introduce ORM/query builders. Stick with `@supabase/supabase-js`.
- Do not add a new auth provider — Supabase Auth is the only one.
- Do not commit `.env`. Confirm `.gitignore` excludes it.

---

## 10. Definition of Done

You are done when **all** of these are true:

- [ ] All 10 tasks completed with their acceptance criteria passing.
- [ ] `backend/` tsc build is clean.
- [ ] `dashboard/` next build is clean.
- [ ] Send a real test email → reply lands in original thread within 90 seconds total. The reply has the correct sender, correct subject, no commission language, signs off correctly.
- [ ] No TypeScript `any` types added except where absolutely necessary (Supabase response types).
- [ ] No hardcoded secrets in any committed file.
- [ ] `curl` smoke tests in Task 10 all pass.
- [ ] At least 50 KB entries embedded and demonstrably retrieved.
- [ ] Audit log shows entries for every approve/reject/regenerate action you performed during testing.
