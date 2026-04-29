# IMPLEMENTATION PLAN — DPCA (Lead Architect Review)

> **Date**: 2026-04-29
> **Status**: End of Week 4 / Start of Week 5 — original launch target was 2026-04-25, slipped by ~1 week.
> **Audience**: Project owner (you) for review and sign-off before Sonnet executes the work.
> **Companion**: `docs/SONNET_EXECUTION.md` is the self-contained handoff for Claude Sonnet.

---

## 1. Critical Evaluation of Current State

### 1.1 What is solid

| Layer | State | Notes |
|---|---|---|
| **Database schema** | 10 tables, 22 RLS policies, 7 `updated_at` triggers, `get_dashboard_stats()` function | Matches `DATABASE_SCHEMA.md`. Migration history is clean. |
| **Backend skeleton** | Express + TypeScript + Zod + Supabase client | Routes for messages, drafts, leads, inboxes, webhooks, health. |
| **Dashboard skeleton** | Next.js 14 App Router + Supabase Auth + SWR + Tailwind | Login, inbox 3-panel, leads, knowledge-base, settings, dashboard pages all render. |
| **Project scaffolding** | `.env.example`, `docker-compose.yml`, `.gitignore`, `tasks/` | Followed `CLAUDE.md` conventions exactly. |
| **WF1 (Email Ingestion)** | Real production logic | Polls Gmail every 2 min, decodes base64 MIME, dedupes, inserts to Supabase, applies `AI-Processing` label, triggers WF2. |
| **n8n workflow stubs** | All 8 workflow JSONs present with node skeletons + descriptive notes | WF2–WF8 have structure but no executable logic. |

### 1.2 What is broken or risky (severity-ordered)

#### P0 — Blockers / Security

1. **Backend has zero authentication.** `/api/messages`, `/api/drafts`, `/api/leads`, `/api/inboxes`, `/api/webhooks/*` are all unprotected. Anyone with the URL can read all messages, drafts, leads. The dashboard relies entirely on Supabase RLS via the browser SDK, but the backend uses the **service-role key** which bypasses RLS — so any unauthenticated HTTP call to the backend returns full table contents. Must add JWT middleware that verifies the Supabase access token before any route handler runs.

2. **WF1 contains a hardcoded Supabase service-role JWT** in `n8n-workflows/WF1-email-ingestion.json` (lines 62, 66). This token is committed to git. Even if rotated, the pattern of embedding tokens in workflow JSON is unsafe. Must move to n8n credential nodes referenced by name, never inline.

3. **Webhooks accept any payload without HMAC verification.** `/api/webhooks/n8n/*` handlers will write to the database for any caller. An attacker who knows the URL can inject fake "ingested" messages, forge classifications, or create fake drafts. Must validate `X-DPCA-Signature` HMAC against `N8N_WEBHOOK_SECRET`.

4. **Commission leak is unguarded.** The Brand Brain Report mandates: *"Commission must never be mentioned, explained, justified, or disclosed to clients. The official client-facing position is that Dream Paris Wedding does not receive commission and works on a flat-fee basis only."* Current draft generation (WF5 stub) has no output sanitizer that scans for commission/kickback language before storing or sending. A single poorly-prompted draft that mentions "vendor commission" sent to a client is a brand-credibility incident.

#### P1 — Pipeline doesn't actually work end-to-end

5. **WF2 (Classification) is a stub.** No GPT-4o call, no JSON parse, no safety overrides. The pipeline starts at WF1 and dies at WF2.

6. **WF3 (KB Embedding) and WF4 (Context Retrieval) have no Pinecone client.** No npm package installed. No code to upsert embeddings or query with metadata filters.

7. **WF5 (Draft Generation) is a stub.** No prompt assembly, no system_config retrieval, no signature insertion, no tone validation, no sender-routing.

8. **WF6 (Auto-Send) is a stub.** Even Gmail send (the only channel not blocked by Meta review) has no real node configuration.

9. **WF7 (Lead Extraction) and WF8 (Dashboard Actions) are stubs.**

#### P1 — Brand requirements not implemented (will fail UAT)

10. **No fixed-subject-line dispatcher.** The Brand Brain mandates exact subject lines for planning steps:
    - `YOUR WEDDING WITH DREAM PARIS WEDDING` (Audrey, contract email)
    - `MASTERFILE + PAYMENT RECEIPT + WELCOME KIT` (Frederic, post-payment)
    - `Your Wedding Day-Of Details Form ✨` (Frederic, simultaneous)
    - Plus 19+ planning-step subjects from Vanessa.

    The AI must NEVER paraphrase these. Current system has no concept of "this draft is a planning-step email vs a freeform reply" and no enforcement that planning-step subjects are exact-match.

11. **No sender-identity routing.** Audrey, Vanessa, Frederic are three different senders with different email addresses (`audrey@`, `vanessa@`, `admin@`, `partners@`) and different scopes:
    - Audrey: lead qualification, calls, package, contract
    - Vanessa: post-contract operational planning steps
    - Frederic: masterfile, payment receipts, day-of forms, admin
    - `partners@`: vendor-side communication

    Current draft generation has no mechanism to pick the correct sender persona; every draft is a generic "Sophie Laurent" signature (which doesn't even match the brand — Sophie is fictional).

12. **No pre-signature / post-signature gating.** Brand rule: "The company generally avoids producing extensive tailored planning work before contract signature." Pre-signature replies must qualify and protect scope; post-signature replies move into structured planning. The lead state isn't tracked (`leads.status` exists but is never consulted by the prompt builder).

13. **No call-availability constraint.** Brand rule: "Audrey only takes calls Mondays and Wednesdays. Closed weekends." If GPT-4o offers a Friday or weekend call slot, the assistant violates a hard brand boundary. No post-processor enforces this.

#### P2 — Schema/code drift

14. **`drafts.rejection_reason` vs code's `review_notes`.** `backend/src/routes/drafts.ts:62` writes `review_notes` to the drafts table; `DATABASE_SCHEMA.md` defines `rejection_reason`. This is a silent bug — the column doesn't exist, the update will fail or be silently dropped depending on Supabase config.

15. **`messages.classification_confidence` vs code's `confidence_score`.** Same issue in `backend/src/routes/webhooks.ts:42`.

16. **`messages.status` enum drift.** Migration `20260411000001_expand_message_status.sql` added many statuses (`new`, `auto_sent`, `approved`, `discarded`, …) that aren't in `DATABASE_SCHEMA.md`. The doc is stale; either update the doc to match reality or normalize the enum back.

17. **`leads` schema mismatch.** Webhook payload uses `client_name` (singular) but DB has `client_names: text[]` (plural array). Same with `client_email`/`email`, `client_phone`/`phone`, `source`/`source_channel`.

#### P2 — UX gaps for the team

18. **No regenerate modal** — the API endpoint exists but the dashboard has no UI surface to provide regeneration instructions.
19. **No rejection-reason modal** — current `handleDiscard` sends the literal string "Discarded from inbox", losing the team's actual reasoning.
20. **No version history view** — drafts can be regenerated multiple times (`UNIQUE(message_id, version)`) but the inbox only shows v1.
21. **No context sources display** — `drafts.context_sources` stores which KB entries were used; the inbox doesn't surface this so the team can't audit retrieval quality.

#### P3 — Content readiness

22. **Knowledge base has 3 seed entries.** Sprint plan called for 150+ entries by end of Week 3. This is a content-track deliverable assigned to Sophie/Audrey, but it blocks AI quality.

23. **System prompts in `system_config` are placeholder.** Need actual P1–P6 prompt content from `PROMPTS.md` populated, with the brand-specific tone and the commission/sender/pre-post rules baked in.

---

## 2. Architecture Decisions

These are the non-obvious calls. Reasoning included.

### 2.1 Sender routing → use a planning-step state machine, not the LLM

**Decision**: Add a `planning_step` field on `leads` (and a `planning_step_history` audit). Backend exposes the current step; WF5 looks up the step and uses a deterministic `(step → sender, fixed_subject_line, prompt_template)` map. Free-form replies still go through GPT-4o, but planning-step emails use exact-match templates with a slot-filler (`{{wedding_date}}`, `{{venue}}`).

**Reasoning**: The Brand Brain explicitly states fixed subject lines must never be paraphrased. LLMs paraphrase by nature. Reaching for the LLM here is the wrong tool — a database lookup + template render is the correct one. The LLM is reserved for personalization within the template body.

**Tradeoff**: More code, more state to maintain. But the alternative (relying on a strongly-worded prompt) WILL fail in production — even GPT-4o at temp 0.4 occasionally rephrases. Brand-credibility cost of one wrong subject line is high.

### 2.2 Commission filter → output sanitizer, not just prompt instruction

**Decision**: Add a deterministic post-processor that scans every draft for forbidden tokens (`commission`, `kickback`, `markup`, `vendor pays us`, `we receive a fee from`, French/Portuguese variants) and either:
- (a) Auto-rejects the draft and triggers regeneration with stricter system prompt, or
- (b) Strips the offending sentences and lowers `tone_confidence` so the team must review.

**Reasoning**: "Tell GPT-4o not to mention commission" is necessary but not sufficient. The output sanitizer is a defense-in-depth layer. This is non-negotiable per Brand Brain.

### 2.3 Pinecone metadata pre-filter → enforce in code, not in prompt

**Decision**: WF4 uses Pinecone's `filter` parameter (not just topK). The mapping `category → KB-categories-allowed` is a hardcoded table in `backend/src/lib/retrieval.ts`. Vector similarity ranks within the filtered subset.

**Reasoning**: Without metadata pre-filter, a `new_inquiry` query can pull a `vendor` template, which is brand-tone-wrong. PROMPTS.md and WORKFLOWS.md already specify the mapping; we just need to implement it.

### 2.4 Tone rules in system prompt only — never retrieved

**Decision**: P1 (Brand Voice) is loaded from `system_config.brand_voice_prompt` and injected as the system message. It is NEVER stored in `knowledge_base` and never retrieved via vector search.

**Reasoning**: If brand voice rules are in the KB, they compete with email examples for retrieval slots, get truncated, and leak when retrieval misses. Keeping them in `system_config` makes them deterministic, version-able via `audit_log`, and free of retrieval ambiguity.

### 2.5 Authentication → JWT verification on every backend route, RLS on every Supabase query

**Decision**: All backend routes (except `/health` and `/webhooks/*` which use HMAC) require a `Authorization: Bearer <jwt>` header. A middleware verifies via `supabase.auth.getUser(jwt)` and attaches `req.user`. The backend then either:
- Uses the user's JWT directly with `createClient(url, anon, { global: { headers: { Authorization } } })` so RLS applies, or
- Uses the service-role key only after explicit `req.user.role` check.

**Reasoning**: Right now the backend is a "trust me" wrapper around the service-role key. That's fine for server-to-server (n8n → backend) but unacceptable for browser → backend.

**Tradeoff**: Slightly more boilerplate per route. Acceptable.

### 2.6 Webhook security → HMAC, not IP allowlist

**Decision**: n8n signs every webhook payload with `HMAC-SHA256(N8N_WEBHOOK_SECRET, body)`. Backend rejects requests where `X-DPCA-Signature` doesn't match.

**Reasoning**: VPS IPs change. HMAC works regardless of network topology. Standard practice for webhooks.

### 2.7 Knowledge base import → script + idempotent upsert, not manual paste

**Decision**: Build `scripts/kb-import.ts` that reads markdown files from `knowledge-base/` (categorized subdirs), parses frontmatter (category, subcategory, title), inserts/updates rows in Supabase, then triggers WF3 to embed.

**Reasoning**: Sophie/Audrey will need to revise content many times. Manual paste-into-dashboard scales to 5 entries, not 150. Idempotent script lets content authors edit markdown, run script, get embeddings refreshed.

---

## 3. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Meta App Review denial or delay | High | High | Launch Gmail-only. Add WhatsApp/Instagram in v1.1. Capacity already in `messages.channel` enum. |
| R2 | Knowledge base quality (only 3 entries seeded) | High | High | Sprint dependency on Sophie. Sonnet should not block on this — build the import pipeline so content can be added later without code changes. |
| R3 | Brand voice drift (AI sounds wrong) | Medium | High | P6 (Tone Validation) gates every draft. `tone_confidence < 75` auto-routes to human review even for Tier 1. Plus per-category word-count validators. |
| R4 | Commission leakage in client-facing output | Low (with sanitizer) | Critical | Output sanitizer (decision 2.2). Plus prompt instructions. Plus periodic audit-log spot-checks via dashboard. |
| R5 | Wrong sender persona on planning emails | Medium | High | Sender-routing is deterministic from `planning_step` (decision 2.1), not LLM-decided. |
| R6 | Pinecone retrieval returns irrelevant context | Medium | Medium | Metadata pre-filter (decision 2.3). Plus log `context_sources` on every draft so retrieval quality is auditable in dashboard. |
| R7 | Hardcoded credentials already in git history | Already-realized | Medium | Rotate the Supabase service-role JWT immediately (separate task — flag to user). Move to credential nodes. |
| R8 | OpenAI cost overrun | Low | Medium | Set monthly cap in OpenAI dashboard. Track tokens per workflow run in `drafts.prompt_tokens`/`completion_tokens`. Dashboard analytics page surfaces this. |
| R9 | n8n workflow corruption (single-tenant n8n on VPS) | Low | High | Daily snapshot of `n8n-data` volume. Workflow JSONs version-controlled (already done). |
| R10 | Schema/code drift (point 14–17 above) | Already-realized | Low | Sonnet's first task: reconcile schema vs code. Update `DATABASE_SCHEMA.md` to be source of truth. |

---

## 4. Implementation Sequence (with dependencies)

> Implementation grouped into **Tracks** that can run somewhat in parallel. Within a track, items must be done in order.

### Track A — Schema & Security Hardening (BLOCKER for everything)
1. **A1** Reconcile schema/code drift (rename `review_notes`→`rejection_reason`, `confidence_score`→`classification_confidence`, fix leads webhook field names). Update `DATABASE_SCHEMA.md` to reflect the migration-added statuses.
2. **A2** Add `planning_step` and `signature_signed` columns to `leads`. Add `signed_at` timestamp. Migration file.
3. **A3** Rotate Supabase service-role JWT (manual step — flag to user). Replace inline JWT in WF1 with credential reference.
4. **A4** Build `backend/src/middleware/auth.ts` JWT verification. Apply to all `/api/*` routes except `/health` and `/webhooks/*`.
5. **A5** Build `backend/src/middleware/hmac.ts` HMAC verification. Apply to all `/webhooks/*` routes.
6. **A6** Add `N8N_WEBHOOK_SECRET` and `OPENAI_API_KEY` to `.env.example`.

### Track B — AI Pipeline (depends on A)
7. **B1** Install `openai` and `@pinecone-database/pinecone` npm packages in backend. Create `backend/src/lib/openai.ts` and `backend/src/lib/pinecone.ts` clients.
8. **B2** Implement `backend/src/services/prompts.ts` — fetches active prompts from `system_config`, caches with TTL.
9. **B3** Implement `backend/src/services/classifier.ts` — calls GPT-4o with P2, parses JSON, applies safety overrides (confidence/value/keyword/sender rules).
10. **B4** Implement `backend/src/services/retrieval.ts` — embeds query, queries Pinecone with metadata filter map, returns top-5 KB entries.
11. **B5** Implement `backend/src/services/draftGenerator.ts` — assembles P1+P3 prompt, includes sender persona, fetches `email_signature` from system_config, calls GPT-4o, runs `commissionSanitizer()`, runs `toneValidator()`, returns `{draft_text, tone_confidence, context_sources}`.
12. **B6** Implement `backend/src/services/leadExtractor.ts` — calls GPT-4o with P4, parses, upserts to `leads`.
13. **B7** Implement `backend/src/services/embedder.ts` — embeds KB entries via OpenAI text-embedding-3-small, upserts to Pinecone, updates `knowledge_base.embedding_status`.

### Track C — n8n Workflows (depends on B)

The decision here is to **shift heavy AI logic out of n8n into the backend services** (Track B) and have n8n act as a thin orchestrator (HTTP triggers, scheduling, channel I/O). Reasons:
- Easier to test (Jest in TypeScript vs n8n's UI)
- Easier to keep prompts/sanitizers/sender-routing in one place
- n8n keeps doing what it's best at: cron, OAuth, webhooks, channel APIs

14. **C1** WF1 — already works, just swap inline JWT for credential reference.
15. **C2** WF2 — replace OpenAI node with HTTP call to `POST /api/internal/classify` (new backend route).
16. **C3** WF3 — POST to `/api/internal/embed-kb-batch`.
17. **C4** WF4 — replaced entirely; no longer a separate workflow. WF5 calls retrieval service directly.
18. **C5** WF5 — POST to `/api/internal/generate-draft`. n8n is just a router; backend does prompt assembly, call, sanitization, storage.
19. **C6** WF6 — Gmail send node (real config), retry logic, label management. WhatsApp/Instagram nodes deferred until Meta approval.
20. **C7** WF7 — POST to `/api/internal/extract-lead`.
21. **C8** WF8 — same approach: HTTP call to `/api/internal/dashboard-action` which dispatches by action.

### Track D — Dashboard UX (depends on B for new endpoints)
22. **D1** Regenerate modal — textarea for instructions + submit; calls `/api/drafts/:id/regenerate`.
23. **D2** Rejection modal — textarea for reason + reason category dropdown; calls `/api/drafts/:id/reject`.
24. **D3** Version history — collapsible panel on selected message showing all draft versions with timestamps and "Restore" buttons.
25. **D4** Context sources display — meta panel section listing the KB titles used, linking to KB page.
26. **D5** Audit log viewer — admin-only `/audit` page reading from `audit_log` with action-type filter.
27. **D6** Bulk actions — multi-select on inbox list, batch approve/reject/reassign.
28. **D7** Analytics page — `/analytics` with charts (response time, approval rate, channel breakdown) reading from `audit_log` and `drafts`.

### Track E — Knowledge Base Content Pipeline (parallel)
29. **E1** Build `scripts/kb-import.ts` — reads `knowledge-base/**/*.md` with YAML frontmatter, upserts to Supabase, triggers WF3 batch embed.
30. **E2** Define KB folder structure: `knowledge-base/brand-voice/`, `knowledge-base/email-examples/`, `knowledge-base/templates/`, `knowledge-base/faqs/`, `knowledge-base/vendors/`, `knowledge-base/process/`, `knowledge-base/qualification/`.
31. **E3** Seed initial 20 KB entries from existing `Ai Brain Date and Core Report` content (extract email templates, qualification questions, channel rules into individual files).

### Track F — Production Readiness (after C, D)
32. **F1** Smoke-test pipeline end-to-end with one real Gmail inbox + 5 test emails. Document any issues.
33. **F2** Monitoring: `errors_log` digest email cron, OpenAI cost alarm, n8n execution failure alert.
34. **F3** Backup strategy: daily n8n volume snapshot + Supabase backup verification.
35. **F4** Final security pass: confirm RLS enforced on all dashboard reads, no service-role key reaches browser, HMAC enforced on all webhooks, JWT enforced on all backend routes.

---

## 5. Recommended Sprint Allocation (Weeks 5–6)

Assumes Sonnet will execute Tracks A through E. Tracks B–C are most of the work.

| Day | Focus |
|---|---|
| **Day 1** | Track A (security + schema reconciliation) — must be 100% before any other track starts |
| **Day 2–3** | Track B (services in TypeScript with unit tests) |
| **Day 4** | Track C (rewire n8n workflows as thin orchestrators) |
| **Day 5** | Track D1–D4 (modals + version history + context sources — the high-value UX gaps) |
| **Day 6** | Track E (KB import pipeline + seed content extraction) |
| **Day 7** | Track F1 (end-to-end smoke test, fix bugs found) |
| **Day 8** | Track D5–D7 (audit log viewer, bulk actions, analytics) — non-blocking, can be deferred |
| **Day 9** | Track F2–F4 (monitoring + backups + final security pass) |
| **Day 10** | Buffer + UAT with Sophie/Audrey |

---

## 6. Out of Scope (explicit deferrals)

| Item | Reason | When to revisit |
|---|---|---|
| WhatsApp / Instagram channels | Blocked on Meta App Review | After Meta approval |
| Multi-tenant onboarding (additional clients beyond DPW) | Not requested for MVP | Post-launch |
| Mobile-native dashboard | Brief says responsive web is enough | If client requests |
| Voice/call transcription | Out of scope of communication assistant | Phase 2 product |
| RAG over wedding timelines/masterfiles | Different problem (per-client docs); KB is brand-voice + templates only | When per-client doc retrieval becomes a need |

---

## 7. Open Questions for the Project Owner

Before Sonnet starts, please confirm:

1. **Q1**: Confirm we ship Gmail-only for v1 (no WhatsApp/Instagram until Meta approves)? **Recommended: yes.**
2. **Q2**: Confirm the heavy AI logic moves into the backend (Track C decision), making n8n a thin orchestrator? **Recommended: yes** — easier to test and maintain.
3. **Q3**: Who is the canonical signer of "general inquiry" replies that aren't tied to a planning step? Brand Brain says Audrey for sales, Vanessa for ops, Frederic for admin. For ambiguous/general → **propose Audrey by default**, override per-thread.
4. **Q4**: Should `tone_confidence < 75` block Tier 1 auto-send (route to human even if Tier 1 rule says auto)? **Recommended: yes.**
5. **Q5**: Should the commission output sanitizer (a) auto-regenerate on detection, or (b) strip + flag for review? **Recommended: (a) auto-regenerate up to 2 retries, then (b).**
6. **Q6**: Has the Supabase service-role JWT exposed in `WF1-email-ingestion.json` been rotated? **If no, rotate before Sonnet runs Track C.**

---

## 8. Definition of Done (launch criteria)

The system is launch-ready when:

- [ ] All P0 + P1 risks resolved (sections 1.2 and 3)
- [ ] End-to-end pipeline: real test email arrives at Gmail → ingested → classified → context retrieved → draft generated → human approves → sent reply lands in original thread within 90 seconds
- [ ] Output sanitizer demonstrably blocks a draft that mentions "vendor commission"
- [ ] Fixed-subject-line dispatcher demonstrably uses exact match for `YOUR WEDDING WITH DREAM PARIS WEDDING` and `MASTERFILE + PAYMENT RECEIPT + WELCOME KIT`
- [ ] Sender-identity is correct: post-payment masterfile email comes from `admin@dreampariswedding.com` as Frederic, contract email comes from Audrey, planning steps from Vanessa
- [ ] No backend route accepts unauthenticated traffic (except `/health`)
- [ ] No webhook accepts unsigned payloads
- [ ] At least 50 KB entries embedded and demonstrably retrieved by 5 different sample inquiries
- [ ] Dashboard regenerate, reject-with-reason, version history, context-sources are all functional
- [ ] `audit_log` shows entries for every approve/reject/regenerate/reassign action
- [ ] Sophie + Audrey have reviewed 20 sample drafts and signed off on tone
