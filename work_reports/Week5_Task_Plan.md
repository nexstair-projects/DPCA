# DPCA — Week 5 Task Plan
**Date**: 2026-05-04 (Monday)
**Hard Deadline**: Saturday 2026-05-09 — Gmail full workflow live end-to-end
**Source docs**: `docs/SONNET_EXECUTION.md`, `docs/IMPLEMENTATION_PLAN.md`

---

## AI Provider Decision

**Claude AI (Anthropic) replaces OpenAI GPT-4o** for all LLM tasks:

- Classification (P2), draft generation (P1/P3/P5), lead extraction (P4), tone validation (P6)
- Package: `@anthropic-ai/sdk` · Models: `claude-sonnet-4-6` (classify/draft), `claude-haiku-4-5-20251001` (tone validation)
- **Embeddings exception**: Anthropic has no embeddings API. OpenAI `text-embedding-3-small` (1536-dim) is kept **only** for Pinecone vector embeddings. Alternatively, Voyage AI (`voyage-3`) can replace this in a future sprint but requires recreating the Pinecone index at 1024 dims.
- `ANTHROPIC_API_KEY` added to `.env.example`. `OPENAI_API_KEY` remains for embeddings only.

---

## Definition of "Gmail Full Workflow Done"

A real email arrives at the DPW Gmail inbox → ingested → classified by Claude Sonnet → context retrieved from Pinecone → draft generated with correct sender persona, sanitizers passed → team approves via dashboard → reply sent back into the original Gmail thread with the correct subject, sender, and signature.

---

## What Is Already Done

| Item | Status |
|---|---|
| DB schema (10 tables, 22 RLS, 7 triggers) | ✅ Done |
| Backend skeleton (routes, Zod, Supabase client) | ✅ Done |
| Dashboard skeleton (login, inbox 3-panel, leads, KB, settings) | ✅ Done |
| WF1 (Gmail polling, MIME decode, dedup, DB insert, label, WF2 trigger) | ✅ Working |
| n8n workflow JSONs WF2–WF8 (stubs only) | ✅ Skeleton only |
| `.env.example`, `docker-compose.yml`, project scaffolding | ✅ Done |

---

## Ordered Task List with Timeline

### DAY 1 — Monday 2026-05-04 ✅ COMPLETE

#### Goal: Clean foundation — schema correct, DB seeded, backend secured

| # | Task | Status | What Was Done |
|---|---|---|---|
| 1 | **Schema/code drift fixes** | ✅ Done | `drafts.ts`: `review_notes` → `rejection_reason` (schema + handler). `webhooks.ts`: `confidence_score` → `classification_confidence` + added `classification_reasoning`; lead fields renamed (`client_name`→`client_names[]`, `client_email`→`email`, `client_phone`→`phone`, `source`→`source_channel`); added `location`, `wedding_date_flexible`, `how_found_us`; `errors_log.source` → `workflow_name`. `tsc --noEmit` passes clean. |
| 2 | **DB migrations + system_config seed** | ✅ Done | `20260429000001_planning_step_and_signature.sql`: adds `planning_step`, `signature_signed`, `signed_at` to `leads`; adds `sender_persona`, `sender_email`, `subject_line`, `planning_step` to `drafts`; creates `planning_step_history` table with RLS. `20260429000002_seed_brand_config.sql`: seeds P1–P6 prompts, `sender_routing`, `planning_step_subjects`, `forbidden_tokens`, `pre_signature_constraint`, `auto_send_rules`. **Run `supabase db push` to apply.** |
| 3 | **Backend auth + HMAC middleware** | ✅ Done | Created `backend/src/middleware/auth.ts` (`requireAuth`, `requireRole`). Created `backend/src/middleware/hmac.ts` (`requireHmac`, `requireInternalToken`). Updated `index.ts`: `requireAuth` on messages/drafts/inboxes/leads; `requireHmac` on webhooks; `/health` stays open. |
| 4 | **⚠️ Manual: Rotate Supabase service-role JWT** | ⚠️ YOU MUST DO | Go to Supabase dashboard → Settings → API → rotate the service-role key. The old key is committed in `n8n-workflows/WF1-email-ingestion.json`. Do NOT run WF6 until rotated. |

> **Remaining for today**: Run `supabase db push` to apply the two migrations. Verify with `SELECT config_key FROM system_config ORDER BY config_key;` — expect 15+ rows.

---

### DAY 2 — Tuesday 2026-05-05

#### Goal: AI services implemented in backend using Claude Sonnet

| # | Task | Source Ref | Key Actions |
|---|---|---|---|
| 5 | **AI service libs** | SONNET Task 4 (part 1) | Install `npm install @anthropic-ai/sdk` in `backend/` (replaces `openai` for LLM). Keep `npm install openai` for embeddings only. Create `backend/src/lib/anthropic.ts` (Anthropic client + model constants). Create `backend/src/lib/openai.ts` (OpenAI client for embeddings only — no chat completions). Create `backend/src/lib/pinecone.ts` (Pinecone client + index). Create `backend/src/lib/systemConfig.ts` (60s cached config getter). |
| 6 | **Classifier service** | SONNET Task 4 (part 2) | Create `backend/src/services/classifier.ts`: fetch message → render P2 prompt → call **Claude Sonnet** (`messages.create`, `max_tokens: 300`) with system: classification_prompt and user: rendered context → parse JSON → apply safety overrides → update `messages` row with `classification_confidence`. |
| 7 | **Retrieval service** | SONNET Task 4 (part 3) | Create `backend/src/services/retrieval.ts`: embed query via **OpenAI text-embedding-3-small** → Pinecone query with `filter: { category: { $in: filterMap[category] } }` → hydrate KB rows from Supabase → return `{ context_text, source_ids }`. |
| 8 | **Sanitizers** | SONNET Task 4 (part 4) | Create `backend/src/services/sanitizers.ts`: `commissionSanitize()` (loads `forbidden_tokens` from config), `callAvailabilitySanitize()` (replaces non-Mon/Wed day offers), `subjectLineEnforcer()` (exact-match). |

---

### DAY 3 — Wednesday 2026-05-06

#### Goal: Draft generator + lead extractor + internal routes

| # | Task | Source Ref | Key Actions |
|---|---|---|---|
| 9 | **Draft generator service** | SONNET Task 4 (part 5) | Create `backend/src/services/draftGenerator.ts`: fetch message + lead → determine `planning_step` + `signature_signed` → look up sender persona + fixed subject from `system_config` → retrieve context → build system message from P1 (fill all slots) + user message from P3/P5 → call **Claude Sonnet** (`max_tokens: 1024, temperature: 1` — Claude uses 0-1 temperature scale) → run `commissionSanitize` (2 retries then flag) → run `callAvailabilitySanitize` → call **Claude Haiku** for P6 tone validation → insert draft with all fields. |
| 10 | **Lead extractor + embedder** | SONNET Task 4 (part 6) | Create `backend/src/services/leadExtractor.ts` (**Claude Sonnet** with P4, upsert leads by email). Create `backend/src/services/embedder.ts` (**OpenAI text-embedding-3-small**, upsert to Pinecone, update `embedding_status='embedded'`). |
| 11 | **Internal API routes** | SONNET Task 4 (part 7) | Create `backend/src/routes/internal.ts` with `requireInternalToken`: `POST /classify`, `POST /generate-draft`, `POST /extract-lead`, `POST /embed-kb`, `POST /retrieve`, `POST /dashboard-action`. Mount at `/api/internal` in `index.ts`. |

---

### DAY 4 — Thursday 2026-05-07

#### Goal: Wire n8n workflows — make the Gmail pipeline actually run end-to-end

| # | Task | Source Ref | Key Actions |
|---|---|---|---|
| 12 | **WF1 — remove hardcoded JWT** | SONNET Task 5 | After rotating key (Day 1): replace inline JWT in `n8n-workflows/WF1-email-ingestion.json` with n8n credential node reference (`Supabase REST - Service Role`, type: Header Auth). Re-import into n8n and verify. |
| 13 | **WF2 — thin HTTP orchestrator** | SONNET Task 5 | Rebuild `n8n-workflows/WF2-classification.json`: webhook trigger → HTTP call `POST /api/internal/classify` (with `x-internal-token` header) → decision node: if `tier===3` notify branch, else trigger WF5; if `new_inquiry` also trigger WF7. |
| 14 | **WF5 — thin HTTP orchestrator** | SONNET Task 5 | Rebuild `n8n-workflows/WF5-draft-generation.json`: webhook → HTTP call `POST /api/internal/generate-draft` → if `auto_send: true` trigger WF6, else end (draft awaits review). |
| 15 | **WF6 — Gmail send (CRITICAL)** | SONNET Task 5 | Rebuild `n8n-workflows/WF6-auto-send.json`: webhook → fetch draft+message via `/api/internal/messages/:id` → Gmail Send node (from: `draft.sender_email`, subject: `draft.subject_line`, body: `draft.draft_text`, In-Reply-To + thread, CC if present) → apply label `AI-Sent`, remove `AI-Processing` → 3 retries with exponential backoff → HTTP callback `POST /api/webhooks/n8n/send-result` with HMAC signature. WhatsApp/Instagram: stub `send_failed`. |
| 16 | **WF7 + WF8** | SONNET Task 5 | WF7: webhook → `POST /api/internal/extract-lead`. WF8: webhook → `POST /api/internal/dashboard-action`. |

---

### DAY 5 — Friday 2026-05-08

#### Goal: Dashboard UX wired + KB seeded + smoke test

| # | Task | Source Ref | Key Actions |
|---|---|---|---|
| 17 | **Dashboard auth fix** | IMPL-PLAN 2.5 | Update all `BACKEND_URL` fetch calls in `dashboard/app/inbox/page.tsx` to include `Authorization: Bearer ${session.access_token}`. |
| 18 | **Regenerate + Reject modals** | SONNET Task 6 | Create `dashboard/components/RegenerateModal.tsx` and `RejectModal.tsx`. Wire into `inbox/page.tsx`. |
| 19 | **KB import pipeline + seed** | SONNET Task 7 | Create `scripts/kb-import.ts`. Create 15+ KB markdown files. Run script → verify `embedding_status='embedded'` on all via OpenAI embeddings. |
| 20 | **End-to-end smoke test** | SONNET Task 10 | Send real test email → verify within 90s: ingested → classified by Claude → draft generated with correct persona → approve in dashboard → reply sent in Gmail thread with `AI-Sent` label. |

---

### DAY 6 — Saturday 2026-05-09

#### Goal: Buffer, fixes, UAT

| # | Task | Notes |
|---|---|---|
| 21 | **Fix bugs from smoke test** | Common points: OAuth token expiry, Pinecone empty results (check 1536 dim + string metadata), dashboard auth header, JWT not rotated. |
| 22 | **Security checklist** | No Supabase JWT in committed files; `service_role` not in dashboard code; HMAC on all webhooks; JWT on all backend routes. |
| 23 | **Gmail workflow UAT** | 3 scenarios: (a) new inquiry from unknown sender, (b) vendor communication, (c) general question. Verify tier, sender persona, draft quality. |

---

## Priority Order Summary

```
Day 1 ✅:  Task 1 (drift) → Task 2 (migrations+seed) → Task 3 (auth) → ⚠️ Rotate JWT (manual)
Day 2:     Task 5-libs(Anthropic+OpenAI) → Task 6-classifier(Claude) → Task 7-retrieval(OpenAI embed) → Task 8-sanitizers
Day 3:     Task 9-draftGenerator(Claude) → Task 10-leadExtractor+embedder → Task 11-internal routes
Day 4:     Task 12-WF1 fix → Task 13-WF2 → Task 14-WF5 → Task 15-WF6 Gmail → Task 16-WF7/8
Day 5:     Task 17-dashboard auth → Task 18-modals → Task 19-KB pipeline → Task 20-smoke test
Day 6:     Fix bugs → Security check → UAT
```

---

## Blocked / Deferred Items (do NOT work on these this week)

| Item | Blocked On | When |
|---|---|---|
| WhatsApp send | Meta App Review | After Meta approval |
| Instagram send | Meta App Review | After Meta approval |
| Voyage AI embeddings (replace OpenAI) | Optional migration | Future sprint if desired |
| Audit log viewer page (Task 8) | Not blocking Gmail workflow | Week 6 |
| Analytics page (Task 8) | Not blocking Gmail workflow | Week 6 |
| Bulk inbox actions (Task 9) | Not blocking Gmail workflow | Week 6 |
| 150+ KB entries | Sophie/Audrey content delivery | Ongoing |

---

## Critical Risks This Week

| Risk | Mitigation |
|---|---|
| Supabase service-role JWT in WF1 git history | Rotate key on Day 1 BEFORE touching n8n. Do not run WF6 until done. |
| Claude API rate limits | claude-sonnet-4-6 has generous limits. Use claude-haiku-4-5-20251001 for tone validation to reduce cost/latency. |
| Pinecone empty results | Confirm index dimension = 1536 (matches text-embedding-3-small), `category` metadata stored as string, filter uses `$in` operator. |
| Claude returns non-JSON for classification/extraction | Use a JSON-enforcing system prompt suffix: "Return ONLY valid JSON, no preamble, no markdown fences." Retry once if parse fails. |
| Dashboard 401 after auth middleware added | Update every `fetch(BACKEND_URL + ...)` in dashboard to send `Authorization: Bearer <session.access_token>`. |
| Gmail OAuth token expired | Test token with a simple list-emails call before running the full pipeline. Reauthorize in n8n if needed. |
