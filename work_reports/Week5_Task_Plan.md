# DPCA — Week 5 Task Plan
**Date**: 2026-05-04 (Monday)
**Hard Deadline**: Saturday 2026-05-09 — Gmail full workflow live end-to-end
**Source docs**: `docs/SONNET_EXECUTION.md`, `docs/IMPLEMENTATION_PLAN.md`

---

## Definition of "Gmail Full Workflow Done"

A real email arrives at the DPW Gmail inbox → ingested → classified by GPT-4o → context retrieved from Pinecone → draft generated with correct sender persona, sanitizers passed → team approves via dashboard → reply sent back into the original Gmail thread with the correct subject, sender, and signature.

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

### DAY 1 — Monday 2026-05-04 (Today)
**Goal: Clean foundation — schema correct, DB seeded, backend secured**

| # | Task | Source Ref | Key Actions |
|---|---|---|---|
| 1 | **Schema/code drift fixes** | SONNET Task 1 | `backend/src/routes/drafts.ts`: rename `review_notes` → `rejection_reason`. `backend/src/routes/webhooks.ts`: rename `confidence_score` → `classification_confidence`; fix leads fields (`client_name`→`client_names[]`, `client_email`→`email`, `client_phone`→`phone`, `source`→`source_channel`); rename `errors_log.source`→`workflow_name`. Run `npm run build` → must compile clean. |
| 2 | **DB migrations + system_config seed** | SONNET Task 2 | Create `supabase/migrations/20260429000001_planning_step_and_signature.sql` (adds `planning_step`, `signature_signed`, `signed_at` to `leads`; adds `sender_persona`, `sender_email`, `subject_line`, `planning_step` to `drafts`; creates `planning_step_history` table). Create `supabase/migrations/20260429000002_seed_brand_config.sql` (seeds P1–P6 prompts, `sender_routing`, `planning_step_subjects`, `forbidden_tokens`, `pre_signature_constraint`, `auto_send_rules`). Run `supabase db push`. Verify 15+ rows in `system_config`. |
| 3 | **Backend auth + HMAC middleware** | SONNET Task 3 | Create `backend/src/middleware/auth.ts` (`requireAuth`, `requireRole`). Create `backend/src/middleware/hmac.ts` (`requireHmac`, `requireInternalToken`). Modify `backend/src/index.ts`: apply `requireAuth` to `/api/messages`, `/api/drafts`, `/api/leads`, `/api/inboxes`; apply `requireHmac` to `/api/webhooks/*`; keep `/api/health` open. Test: `curl /api/messages` without token → 401. |
| 4 | **⚠️ Manual: Rotate Supabase service-role JWT** | IMPL-PLAN R7 | **YOU MUST DO THIS**: Go to Supabase dashboard → Settings → API → rotate the service-role key. The current key is committed in `n8n-workflows/WF1-email-ingestion.json`. Do NOT run Track C until rotated. |

---

### DAY 2 — Tuesday 2026-05-05
**Goal: AI services implemented in backend**

| # | Task | Source Ref | Key Actions |
|---|---|---|---|
| 5 | **AI service libs** | SONNET Task 4 (part 1) | Install `npm install openai @pinecone-database/pinecone` in `backend/`. Create `backend/src/lib/openai.ts` (client + model constants). Create `backend/src/lib/pinecone.ts` (client + index). Create `backend/src/lib/systemConfig.ts` (60s cached config getter). |
| 6 | **Classifier service** | SONNET Task 4 (part 2) | Create `backend/src/services/classifier.ts`: fetch message → render P2 prompt → call GPT-4o (`temp: 0.1, max_tokens: 300, response_format: json_object`) → parse + validate with Zod → apply safety overrides (confidence < 0.70 → tier+1, new_inquiry + value/guest → tier 3, cancel/legal keywords → tier 3, unknown sender + tier 1 → tier 2) → update `messages` row. |
| 7 | **Retrieval service** | SONNET Task 4 (part 3) | Create `backend/src/services/retrieval.ts`: embed query → Pinecone query with `filter: { category: { $in: filterMap[category] } }` → hydrate KB rows from Supabase → concatenate context block (max 6000 chars) → return `{ context_text, source_ids }`. |
| 8 | **Sanitizers** | SONNET Task 4 (part 4) | Create `backend/src/services/sanitizers.ts`: `commissionSanitize()` (loads `forbidden_tokens` from config, runs regex array), `callAvailabilitySanitize()` (day-name detection, replace non-Mon/Wed with "Monday or Wednesday at your preference (Paris time)"), `subjectLineEnforcer()` (exact-match check). |

---

### DAY 3 — Wednesday 2026-05-06
**Goal: Draft generator + lead extractor + internal routes**

| # | Task | Source Ref | Key Actions |
|---|---|---|---|
| 9 | **Draft generator service** | SONNET Task 4 (part 5) | Create `backend/src/services/draftGenerator.ts`: fetch message + lead → determine `planning_step` + `signature_signed` → look up sender persona + fixed subject from `system_config` → retrieve context → build system message from P1 (fill all slots) + user message from P3/P5 → call GPT-4o (`temp: 0.4, max_tokens: 800`) → run `commissionSanitize` (2 retries then flag) → run `callAvailabilitySanitize` → run P6 tone validator → insert draft with `sender_persona`, `sender_email`, `subject_line`, `tone_confidence`, `context_sources`, `status`. |
| 10 | **Lead extractor + embedder** | SONNET Task 4 (part 6) | Create `backend/src/services/leadExtractor.ts` (GPT-4o with P4, upsert leads by email, append activity_timeline). Create `backend/src/services/embedder.ts` (`embedKbEntry`, `embedKbBatch` — embed title+content, upsert to Pinecone with metadata, update `embedding_status='embedded'`). |
| 11 | **Internal API routes** | SONNET Task 4 (part 7) | Create `backend/src/routes/internal.ts` with `requireInternalToken`: `POST /classify`, `POST /generate-draft`, `POST /extract-lead`, `POST /embed-kb`, `POST /retrieve`, `POST /dashboard-action`. Mount at `/api/internal` in `index.ts`. Test each endpoint manually. |

---

### DAY 4 — Thursday 2026-05-07
**Goal: Wire n8n workflows — make the Gmail pipeline actually run end-to-end**

| # | Task | Source Ref | Key Actions |
|---|---|---|---|
| 12 | **WF1 — remove hardcoded JWT** | SONNET Task 5 | After rotating key (Day 1): replace inline JWT in `n8n-workflows/WF1-email-ingestion.json` with n8n credential node reference (`Supabase REST - Service Role`, type: Header Auth). Re-import into n8n and verify. |
| 13 | **WF2 — thin HTTP orchestrator** | SONNET Task 5 | Rebuild `n8n-workflows/WF2-classification.json`: webhook trigger `POST /webhook/wf2-trigger` → HTTP call `POST /api/internal/classify` (with `x-internal-token` header) → decision node: if `tier===3` notify branch, else trigger WF5; if `new_inquiry` also trigger WF7. |
| 14 | **WF5 — thin HTTP orchestrator** | SONNET Task 5 | Rebuild `n8n-workflows/WF5-draft-generation.json`: webhook `POST /webhook/wf5-trigger` → HTTP call `POST /api/internal/generate-draft` → if `auto_send: true` trigger WF6, else end (draft awaits review). |
| 15 | **WF6 — Gmail send (CRITICAL)** | SONNET Task 5 | Rebuild `n8n-workflows/WF6-auto-send.json`: webhook `POST /webhook/send-message` → fetch draft + message via `/api/internal/messages/:id` → Gmail Send node (from: `draft.sender_email`, subject: `draft.subject_line`, body: `draft.draft_text`, In-Reply-To + thread, CC if present) → apply label `AI-Sent`, remove `AI-Processing` → 3 retries with exponential backoff → HTTP callback `POST /api/webhooks/n8n/send-result` with HMAC signature. WhatsApp/Instagram branches: stub with `send_failed` error (Meta pending). |
| 16 | **WF7 + WF8** | SONNET Task 5 | WF7: webhook → `POST /api/internal/extract-lead`. WF8: webhook `POST /webhook/draft-action` → `POST /api/internal/dashboard-action` (dispatches by action). |

---

### DAY 5 — Friday 2026-05-08
**Goal: Dashboard UX wired + KB seeded + smoke test**

| # | Task | Source Ref | Key Actions |
|---|---|---|---|
| 17 | **Dashboard auth fix** | IMPL-PLAN 2.5 | Update all `BACKEND_URL` fetch calls in `dashboard/app/inbox/page.tsx` to include `Authorization: Bearer ${session.access_token}` (Supabase session JWT). |
| 18 | **Regenerate + Reject modals** | SONNET Task 6 | Create `dashboard/components/RegenerateModal.tsx` (textarea + submit → `POST /api/drafts/:id/regenerate`). Create `dashboard/components/RejectModal.tsx` (reason dropdown + textarea → `POST /api/drafts/:id/reject`). Wire both into `inbox/page.tsx`. |
| 19 | **KB import pipeline + seed** | SONNET Task 7 | Create `scripts/kb-import.ts` (reads `knowledge-base/**/*.md`, parses YAML frontmatter, upserts to Supabase, calls `/api/internal/embed-kb`). Create minimum 15 KB files across `brand-voice/`, `email-examples/`, `templates/`, `faqs/`, `qualification/` folders — extract from `graphify-out/converted/Ai Brain Date and Core Report*.md`. Run script → verify `embedding_status='embedded'` on all. |
| 20 | **End-to-end smoke test** | SONNET Task 10 | Send a real test email to the DPW Gmail inbox. Verify within 90 seconds: message appears in `messages` table → classified → draft generated with correct sender persona, no commission language → dashboard shows draft → approve → reply lands in original Gmail thread with correct subject + signature + `AI-Sent` label. |

---

### DAY 6 — Saturday 2026-05-09
**Goal: Buffer, fixes, UAT**

| # | Task | Notes |
|---|---|---|
| 21 | **Fix bugs from smoke test** | Investigate any failures in the Day 5 smoke test. Common failure points: OAuth token expiry on Gmail, Pinecone empty results (check dimension = 1536 and metadata stored as string), dashboard auth header missing, WF1 JWT not rotated. |
| 22 | **Security checklist** | Confirm: no Supabase JWT in any committed file, `service_role` key not in `dashboard/` code, HMAC enforced on all webhooks, JWT enforced on all backend routes. |
| 23 | **Gmail workflow UAT** | Run 3 different email scenarios through the full pipeline: (a) new inquiry from unknown sender, (b) vendor communication, (c) general question. Verify correct tier, sender persona, and draft quality each time. |

---

## Priority Order Summary

```
Day 1:  Task 1 (drift) → Task 2 (migrations+seed) → Task 3 (auth) → ⚠️ Rotate JWT (manual)
Day 2:  Task 5-libs → Task 6-classifier → Task 7-retrieval → Task 8-sanitizers
Day 3:  Task 9-draftGenerator → Task 10-leadExtractor+embedder → Task 11-internal routes
Day 4:  Task 12-WF1 fix → Task 13-WF2 → Task 14-WF5 → Task 15-WF6 Gmail → Task 16-WF7/8
Day 5:  Task 17-dashboard auth → Task 18-modals → Task 19-KB pipeline → Task 20-smoke test
Day 6:  Fix bugs → Security check → UAT
```

---

## Blocked / Deferred Items (do NOT work on these this week)

| Item | Blocked On | When |
|---|---|---|
| WhatsApp send | Meta App Review | After Meta approval |
| Instagram send | Meta App Review | After Meta approval |
| Audit log viewer page (Task 8) | Not blocking Gmail workflow | Week 6 |
| Analytics page (Task 8) | Not blocking Gmail workflow | Week 6 |
| Bulk inbox actions (Task 9) | Not blocking Gmail workflow | Week 6 |
| 150+ KB entries | Sophie/Audrey content delivery | Ongoing |

---

## Critical Risks This Week

| Risk | Mitigation |
|---|---|
| Supabase service-role JWT in WF1 git history | Rotate key on Day 1 BEFORE touching n8n. Do not run WF6 until done. |
| Pinecone empty results | Confirm index dimension = 1536, `category` metadata stored as string (not array), filter uses `$in` operator. |
| GPT-4o returns malformed JSON | Use `response_format: { type: 'json_object' }`. Retry once with "Return ONLY valid JSON, no preamble" if still fails. |
| Dashboard 401 after auth middleware added | Update every `fetch(BACKEND_URL + ...)` call in dashboard to send `Authorization: Bearer <session.access_token>`. |
| Gmail OAuth token expired | Test token with a simple list-emails call before running the full pipeline. Reauthorize in n8n if needed. |
