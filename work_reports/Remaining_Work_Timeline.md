# DPCA — Remaining Work Timeline
**Current Date**: 2026-05-05 (Tuesday)  
**Hard Deadline**: Saturday 2026-05-09  
**Goal**: Gmail full workflow live end-to-end (email → ingest → classify → draft → approve → send)

---

## Completion Status Summary

| Phase | Status | Days Left |
|---|---|---|
| **Day 1 (Mon 05-04)** — Schema/Auth | ✅ **DONE** | - |
| **Day 2 (Tue 05-05)** — AI Services | 🔄 IN PROGRESS | 1 day |
| **Day 3 (Wed 05-06)** — Lead Extraction + Routes | ⏳ TODO | 2 days |
| **Day 4 (Thu 05-07)** — n8n Wiring | ⏳ TODO | 3 days |
| **Day 5 (Fri 05-08)** — Dashboard + KB + Smoke Test | ⏳ TODO | 4 days |
| **Day 6 (Sat 05-09)** — Fixes + UAT | ⏳ BUFFER | 5 days |

---

## What's Done (Day 1 ✅)

**TASK 1 — Schema/Code Drift Reconciliation**
- ✅ Fixed `drafts.ts`: `review_notes` → `rejection_reason`
- ✅ Fixed `webhooks.ts`: `confidence_score` → `classification_confidence`
- ✅ Restructured lead schema: `client_name→client_names[]`, `client_email→email`, `client_phone→phone`, `source→source_channel`
- ✅ Fixed `errors_log.source` → `workflow_name`
- ✅ TypeScript compilation clean (`tsc --noEmit` passes)

**TASK 2 — Database Migrations**
- ✅ Created `20260429000001_planning_step_and_signature.sql`
  - Added `planning_step` (25-value CHECK), `signature_signed`, `signed_at` to leads
  - Added sender tracking columns to drafts
  - Created `planning_step_history` audit table with RLS
  - Created indexes on `planning_step`, `signature_signed`
- ✅ Created `20260429000002_seed_brand_config.sql` (corrected version)
  - All 9 system_config entries (P1-P6 prompts, sender_routing, planning_step_subjects, forbidden_tokens, pre_signature_constraint, auto_send_rules)
  - ✅ **Migrations pushed to Supabase** (no longer blockers)

**TASK 3 — Authentication Middleware**
- ✅ Created `backend/src/middleware/auth.ts` — JWT validation + role-based access
- ✅ Created `backend/src/middleware/hmac.ts` — webhook signature verification
- ✅ Applied `requireAuth` to `/api/messages`, `/api/drafts`, `/api/leads`, `/api/inboxes`
- ✅ Applied `requireHmac` to `/api/webhooks/*`
- ✅ Frontend updated with `Authorization: Bearer <token>` headers on all API calls

**TASK 3b — Manual Steps Still Required**
- ⚠️ **CRITICAL**: Rotate Supabase service-role JWT in dashboard (Settings → API)
  - Old key is still in `n8n-workflows/WF1-email-ingestion.json` (committed)
  - Update `.env` with rotated key
  - Update n8n credential node with new key
- ✅ Frontend auth headers now included

---

## Remaining Work (Day 2–6)

### DAY 2 — Tuesday 2026-05-05 (TODAY)
**Goal**: AI service libraries and classifier implemented in backend

| Task # | Description | Estimated | Status |
|---|---|---|---|
| **4.1** | Install npm packages: `@anthropic-ai/sdk`, `openai`, `@pinecone-database/pinecone` in backend | 5 min | ⏳ TODO |
| **4.2** | Create `backend/src/lib/anthropic.ts` — Anthropic client + model constants | 10 min | ⏳ TODO |
| **4.3** | Create `backend/src/lib/openai.ts` — OpenAI client (embeddings only) | 5 min | ⏳ TODO |
| **4.4** | Create `backend/src/lib/pinecone.ts` — Pinecone client + index reference | 5 min | ⏳ TODO |
| **4.5** | Create `backend/src/lib/systemConfig.ts` — Config getter with 60s cache | 20 min | ⏳ TODO |
| **4.6** | Create `backend/src/services/classifier.ts` — Claude Sonnet classification service | 45 min | ⏳ TODO |
| **4.7** | Create `backend/src/services/retrieval.ts` — Pinecone vector retrieval | 40 min | ⏳ TODO |
| **4.8** | Create `backend/src/services/sanitizers.ts` — Commission filter, call availability, subject line enforcement | 30 min | ⏳ TODO |

**Subtasks**: 160 min total (2.7 hours)  
**Acceptance**: All services unit-tested; verify classifier returns valid JSON; retrieval returns context with metadata filters.

---

### DAY 3 — Wednesday 2026-05-06
**Goal**: Draft generation + lead extraction + internal API routes wired

| Task # | Description | Estimated | Status |
|---|---|---|---|
| **4.9** | Create `backend/src/services/draftGenerator.ts` — Claude Sonnet draft generation | 60 min | ⏳ TODO |
| **4.10** | Create `backend/src/services/leadExtractor.ts` — Claude Sonnet lead extraction | 30 min | ⏳ TODO |
| **4.11** | Create `backend/src/services/embedder.ts` — OpenAI embeddings → Pinecone | 30 min | ⏳ TODO |
| **4.12** | Create `backend/src/routes/internal.ts` — Webhook orchestrator routes | 25 min | ⏳ TODO |
| **4.13** | Mount `/api/internal` in `backend/src/index.ts` | 5 min | ⏳ TODO |
| **5.0** | Test suite: unit test each service with mock data | 60 min | ⏳ TODO |

**Subtasks**: 210 min total (3.5 hours)  
**Acceptance**: 
- `POST /api/internal/classify` with valid message_id → returns classification JSON
- `POST /api/internal/generate-draft` → returns draft with tone score + no commission language
- `POST /api/internal/extract-lead` → returns lead with email, client_names, etc.

---

### DAY 4 — Thursday 2026-05-07
**Goal**: n8n workflows wired; Gmail pipeline flow operational

| Task # | Description | Estimated | Status |
|---|---|---|---|
| **5.1** | WF1 JWT rotation + credential node update | 30 min | ⏳ TODO |
| **5.2** | Rebuild `WF2-classification.json` — webhook → `/api/internal/classify` → decision node | 45 min | ⏳ TODO |
| **5.3** | Rebuild `WF5-draft-generation.json` — webhook → `/api/internal/generate-draft` | 30 min | ⏳ TODO |
| **5.4** | Rebuild `WF6-auto-send.json` — **CRITICAL** — webhook → Gmail Send node with subject/from/body | 45 min | ⏳ TODO |
| **5.5** | Rebuild `WF7-lead-extraction.json` — webhook → `/api/internal/extract-lead` | 20 min | ⏳ TODO |
| **5.6** | Rebuild `WF8-dashboard-action.json` — webhook orchestrator | 20 min | ⏳ TODO |
| **5.7** | Test WF1→WF2 flow: trigger WF1, verify WF2 fires + classification updates `messages` | 30 min | ⏳ TODO |
| **5.8** | Test WF2→WF5 flow: verify draft generation triggers + drafts appear in DB | 30 min | ⏳ TODO |

**Subtasks**: 250 min total (4.2 hours)  
**Acceptance**: 
- Real email arrives at Gmail inbox
- WF1 ingests + deduplicates + labels `AI-Processing`
- WF2 classifies + updates `messages.category, tier, priority`
- WF5 generates draft + inserts `drafts` row
- Dashboard shows draft in inbox for approval

---

### DAY 5 — Friday 2026-05-08
**Goal**: Dashboard fully operational; KB seeded; end-to-end smoke test

| Task # | Description | Estimated | Status |
|---|---|---|---|
| **6.1** | Update all `fetch(BACKEND_URL)` calls in dashboard to include `Authorization` header | 15 min | ✅ DONE |
| **6.2** | Create `dashboard/components/RegenerateModal.tsx` — modal for draft regeneration | 30 min | ⏳ TODO |
| **6.3** | Create `dashboard/components/RejectModal.tsx` — modal for draft rejection with reason | 25 min | ⏳ TODO |
| **6.4** | Wire modals into `/app/inbox/page.tsx` — connect buttons to modal state | 20 min | ⏳ TODO |
| **6.5** | Create `scripts/kb-import.ts` — load markdown files from `knowledge-base/` + embed + upsert | 60 min | ⏳ TODO |
| **6.6** | Create 15+ KB markdown files (FAQs, templates, email examples) | 90 min | ⏳ TODO |
| **6.7** | Run KB import + verify `embedding_status='embedded'` on all rows | 15 min | ⏳ TODO |
| **6.8** | **SMOKE TEST**: Send real test email → verify workflow completes end-to-end | 45 min | ⏳ TODO |

**Subtasks**: 300 min total (5 hours)  
**Acceptance**:
- Send test email to Gmail inbox (from: external test account)
- Within 90 seconds:
  - ✅ Message ingested into `messages` table
  - ✅ Classified with tier, category, priority
  - ✅ Draft generated with correct persona (e.g., "Audrey" for new_inquiry)
  - ✅ Draft appears in dashboard inbox
  - ✅ Team approves via dashboard button
  - ✅ Reply sent to Gmail thread with `AI-Sent` label + correct subject/from/signature
  - ✅ Audit log records all actions

---

### DAY 6 — Saturday 2026-05-09
**Goal**: Buffer for bug fixes + security checklist + UAT

| Task # | Description | Estimated | Status |
|---|---|---|---|
| **7.1** | Fix any bugs discovered in smoke test | 60–120 min | ⏳ TODO |
| **7.2** | Security review checklist | 30 min | ⏳ TODO |
| **7.3** | Gmail workflow UAT — 3 scenarios (new inquiry, vendor, general) | 45 min | ⏳ TODO |
| **7.4** | Final integration test + performance check | 30 min | ⏳ TODO |

**Common Day 6 Issues to Watch**:
- OAuth token expiry (test with list-emails call before full pipeline)
- Pinecone empty results (verify 1536 dims + metadata filtering)
- Dashboard 401 errors (ensure auth headers in all fetch calls)
- Claude API rate limits (use Haiku for tone validation to reduce cost)
- Tone confidence threshold blocking auto-send (verify threshold setting in `.env`)

---

## Critical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Supabase JWT in git** | Security | ⚠️ Rotate key TODAY (Day 1 manual step) |
| **Claude API rate limits** | Delays | Use claude-haiku for tone; batch requests |
| **Pinecone empty results** | Draft quality | Verify 1536-dim index + category metadata string filtering |
| **Claude returns non-JSON** | Crashes | Add "Return ONLY valid JSON, no preamble" to P2/P4/P6 |
| **Dashboard 401 after auth** | UX blocked | Update EVERY fetch() to include Bearer token |
| **Gmail OAuth expired** | Send failures | Test token refresh logic in WF6; reauthorize if needed |
| **Commission filter false positives** | Auto-reject good drafts | Test with real vendor templates; adjust regex if needed |
| **Tone threshold too high** | All drafts require approval | Set TONE_CONFIDENCE_THRESHOLD=75 (default); adjust if needed |
| **n8n credentials stale** | Workflow failures | Rotate WF1 JWT ASAP; test WF6 Gmail send with sandbox account first |

---

## Daily Standup Checklist

**Each morning at 9am (Paris time)**:
- [ ] Review blocked items from previous day
- [ ] Verify backend/dashboard are running locally
- [ ] Check migrations applied (`SELECT config_key FROM system_config` in SQL Editor)
- [ ] Monitor n8n execution logs for workflow errors
- [ ] Run smoke test with fresh test email (if appropriate day)

---

## Deliverables by Date

| Date | Deliverable | Owner |
|---|---|---|
| **Tue 05-05** | AI services (classifier, retrieval, sanitizers) | Backend |
| **Wed 05-06** | Draft generator + lead extractor + internal routes | Backend |
| **Thu 05-07** | n8n workflows WF2–WF8 wired + tested | n8n |
| **Fri 05-08** | Dashboard modals + KB imported + smoke test passed | Frontend + Backend |
| **Sat 05-09** | All bugs fixed + UAT complete + LIVE | All |

---

## Success Criteria (Definition of "Gmail Full Workflow Done")

A **real email arrives** at the DPW Gmail inbox →
1. ✅ **Ingested** within 2 minutes (WF1 polling interval)
2. ✅ **Classified** by Claude Sonnet (tier, category, priority) within 10 seconds
3. ✅ **Context retrieved** from Pinecone KB (relevant examples/templates)
4. ✅ **Draft generated** with correct persona, no commission language, within 15 seconds
5. ✅ **Dashboard approval** — team sees draft in 3-panel inbox, edits if needed
6. ✅ **Approval triggered** — team clicks "Approve & Send"
7. ✅ **Email sent** back into Gmail thread with:
   - Correct sender persona (`from:` email + signature)
   - Correct subject (fixed subject line, never paraphrased)
   - Original `In-Reply-To` headers (maintains threading)
   - `AI-Sent` label applied
   - All metadata logged in `audit_log`

**Time to reply**: < 3 minutes from email arrival to approval, < 5 seconds from approval to send.

---

## Next Steps (Immediate)

1. **TODAY (Tue 05-05)**: 
   - Install npm packages in backend
   - Start Task 4.2–4.8 (AI services)
   - Manual JWT rotation (CRITICAL — blocks WF1)

2. **ASAP (before Wed)**:
   - Unit test each service
   - Prepare test email account for smoke test

3. **By Wed evening**:
   - Draft generator + lead extractor ready
   - Internal routes mounted and tested

4. **By Thu evening**:
   - All n8n workflows updated and tested
   - WF1→WF6 chain working end-to-end

5. **By Fri evening**:
   - Dashboard fully operational
   - Smoke test PASSED
   - KB indexed + searchable

6. **Sat morning**:
   - Final bug fixes
   - UAT with 3 real scenarios
   - Go live

---

---

## FULL PROJECT ROADMAP (Beyond Week 5)

---

### PHASE 1: MVP Launch (Week 5 — May 5–9)

**Goal**: Gmail full workflow live with human approval  
**Status**: 🔄 IN PROGRESS (40% complete)

**Deliverables**:
- ✅ Backend authentication + HMAC verification
- ✅ Database schema with planning_step state machine
- 🔄 AI services (classifier, retrieval, draft generator, lead extractor, sanitizers)
- 🔄 n8n workflows wired as HTTP orchestrators
- 🔄 Dashboard fully operational with modals
- ⏳ End-to-end smoke test passed
- ⏳ Team UAT sign-off

**Success Criteria**:
- Real email → 90s to approval → sent reply with correct persona/subject/signature
- Zero commission language in client-facing output
- All audit logs recorded
- Dashboard shows all UI surfaces (approve, regenerate, reject, version history)

---

## PHASE 2: Post-MVP Content + Polish (Week 6 — May 12–16)
**Goal**: Scale KB, finalize UX, production readiness  
**Owner**: Abdur (backend) + Usama (frontend) + Sophie/Audrey (content)

### Track D — Dashboard UX (continued)
**Deferred from Week 5** — now become priority tasks for Week 6

| Task | Description | Estimated | Owner |
|---|---|---|---|
| **D1** | Regenerate modal (instructions textarea + submit) | 2h | Frontend |
| **D2** | Rejection modal (reason + category dropdown) | 1.5h | Frontend |
| **D3** | Version history viewer (draft versions + restore) | 3h | Frontend |
| **D4** | Context sources display (KB titles used) | 2h | Frontend |
| **D5** | Audit log viewer (`/audit` page, admin-only, action filter) | 4h | Frontend |
| **D6** | Bulk actions (multi-select, batch approve/reject) | 3h | Frontend |
| **D7** | Analytics page (`/analytics`, response time, approval rate, channel breakdown) | 4h | Frontend |

**Subtotal**: 19.5 hours  
**Acceptance**: All pages render, data flows from `audit_log`/`drafts` tables

### Track E — Knowledge Base Content Pipeline

| Task | Description | Estimated | Owner |
|---|---|---|---|
| **E1** | Finalize `scripts/kb-import.ts` — reads Markdown with YAML frontmatter | 2h | Backend |
| **E2** | Define KB folder structure (brand-voice, email-examples, templates, FAQs, vendors, process, qualification) | 1h | Content/Owner |
| **E3** | Extract 20 initial KB entries from Ai Brain Date + Core Report | 8h | Sophie/Audrey |
| **E4** | Run kb-import.ts batch 1 → verify `embedding_status='embedded'` | 1h | Backend |
| **E5** | Extract 50+ additional KB entries (templates, FAQs, email examples) | 16h | Sophie/Audrey (ongoing) |
| **E6** | Periodic KB refresh runs (weekly import job via n8n) | 1h | n8n |

**Subtotal**: 29 hours  
**Acceptance**: 75+ KB entries embedded, retrieval quality verified on 10 sample inquiries

### Track F — Production Readiness

| Task | Description | Estimated | Owner |
|---|---|---|---|
| **F1** | End-to-end smoke test with 5 real Gmail accounts | 2h | QA |
| **F2** | Monitoring setup: errors_log digest, OpenAI cost alarm, n8n failure alert | 3h | Backend |
| **F3** | Backup strategy: n8n volume snapshot automation + Supabase backup verification | 2h | DevOps |
| **F4** | Security pass: confirm RLS on all dashboard reads, no service-role in browser, HMAC on webhooks, JWT on routes | 2h | Backend |
| **F5** | Performance tuning: database query optimization, Pinecone query latency < 500ms | 3h | Backend |
| **F6** | Documentation: runbook for ops team, KB curation guide, emergency procedures | 4h | Tech Lead |

**Subtotal**: 16 hours  
**Acceptance**: All P0 + P1 risks mitigated, system resilient to 10k daily messages

---

## PHASE 3: Channel Expansion (Post-Launch — Weeks 7–8)
**Goal**: Add WhatsApp + Instagram; scale to 50 KB entries per channel  
**Blockers**: Meta App Review approval (timeline unknown, could be immediate or 2–4 weeks)

### WhatsApp Integration

| Task | Description | Estimated | Owner |
|---|---|---|---|
| **W1** | Await Meta App Review decision on WhatsApp Business API scope | — | Legal/Meta |
| **W2** | Update n8n WF1 to poll WhatsApp webhook + decode message format | 3h | n8n |
| **W3** | Extend backend classifier to handle WhatsApp context (shorter, casual tone) | 2h | Backend |
| **W4** | Update P1 brand voice to include WhatsApp-specific channel rules | 1h | Content |
| **W5** | Update WF5 draft generator to produce WhatsApp-formatted replies (< 300 words, 1–2 emojis) | 2h | Backend |
| **W6** | Update WF6 to route WhatsApp messages to Meta API (instead of Gmail) | 2h | n8n |
| **W7** | QA: 10 test messages via WhatsApp Business account | 1h | QA |

**Subtotal**: 11 hours (after Meta approval)  
**Acceptance**: Real WhatsApp inquiry → classified → drafted → sent within 90s

### Instagram Integration

| Task | Description | Estimated | Owner |
|---|---|---|---|
| **I1** | Await Meta App Review decision on Instagram DM API scope | — | Legal/Meta |
| **I2** | Update WF1 to poll Instagram webhook + decode DM format | 3h | n8n |
| **I3** | Extend backend classifier to handle Instagram context (casual, short) | 1h | Backend |
| **I4** | Update P1 brand voice for Instagram channel (casual but elegant) | 1h | Content |
| **I5** | Update WF5 to produce Instagram-formatted replies (< 200 words, emojis ok) | 2h | Backend |
| **I6** | Update WF6 to route Instagram to Meta Graph API | 2h | n8n |
| **I7** | QA: 10 test messages via Instagram Business account | 1h | QA |

**Subtotal**: 10 hours (after Meta approval)  
**Acceptance**: Real Instagram DM → classified → drafted → sent within 90s

---

## PHASE 4: Scaling & Analytics (Weeks 9–10)
**Goal**: Handle 10k+ daily messages; insight dashboards for leadership

### High-Volume Readiness

| Task | Description | Estimated | Owner |
|---|---|---|---|
| **S1** | Load testing: simulate 1000 messages/day through pipeline | 3h | QA |
| **S2** | Database query optimization (add indexes for `messages.status`, `drafts.tone_confidence`) | 2h | Backend |
| **S3** | Pinecone query batching (vectorize 100 queries in parallel) | 2h | Backend |
| **S4** | OpenAI token budgeting (set monthly cap, alert at 80%) | 1h | Backend |
| **S5** | n8n concurrency tuning (WF2–WF6 run in parallel, not sequential) | 2h | n8n |
| **S6** | Cache layer for system_config (60s TTL) and frequent KB queries | 1h | Backend |

**Subtotal**: 11 hours  
**Acceptance**: Pipeline sustains 1000 msg/day with < 2s avg latency

### Leadership Dashboards

| Task | Description | Estimated | Owner |
|---|---|---|---|
| **L1** | Executive summary: daily message volume, auto-send rate, team approval time | 2h | Frontend |
| **L2** | Channel breakdown: Gmail vs WhatsApp vs Instagram (% by volume, category) | 2h | Frontend |
| **L3** | Team performance: approval rate per team member, avg review time, rejection reasons | 2h | Frontend |
| **L4** | AI quality metrics: tone_confidence distribution, sanitizer triggers, regeneration rate | 2h | Frontend |
| **L5** | Cost tracking: OpenAI spend per day/week, cost per message | 1h | Frontend |
| **L6** | Lead funnel: inquiries → qualified leads → contracts signed | 2h | Frontend |

**Subtotal**: 11 hours  
**Acceptance**: Executive dashboard renders all 6 panels, data refreshes hourly

---

## PHASE 5: Advanced Features (Weeks 11–12+)
**Goal**: Personalization, automation, deeper insights

### Smart Routing & Triage

| Task | Description | Estimated | Owner |
|---|---|---|---|
| **A1** | Implement lead scoring (inquiry quality → auto-assign to Audrey vs sales queue) | 4h | Backend |
| **A2** | Smart assignment (route new_inquiry to team member based on availability + expertise) | 3h | Backend |
| **A3** | Bulk template operations (apply a template to 50 pending messages) | 2h | Frontend |

**Subtotal**: 9 hours

### Continuous Improvement Loop

| Task | Description | Estimated | Owner |
|---|---|---|---|
| **C1** | Capture user feedback on drafts (rate tone, flag issues in UI) | 2h | Frontend |
| **C2** | A/B test prompt variants (P1 v2 vs v1, measure approval rate) | 3h | Backend |
| **C3** | Automated prompt tuning (adjust temperature/max_tokens based on tone feedback) | 4h | Backend |

**Subtotal**: 9 hours

### Multi-Client Onboarding

| Task | Description | Estimated | Owner |
|---|---|---|---|
| **M1** | Support multiple Gmail accounts (per client inbox config) | 2h | Backend |
| **M2** | Per-client system_config overrides (custom brand voice, sender personas) | 3h | Backend |
| **M3** | Tenant isolation + RBAC (admin scopes, team member scopes) | 4h | Backend |
| **M4** | Multi-tenant dashboard (show only client's data via RLS) | 3h | Frontend |

**Subtotal**: 12 hours

---

## DEFERRED / OUT OF SCOPE

| Feature | Reason | Revisit When |
|---|---|---|
| Voice/call transcription | Different problem (requires speech-to-text) | If Dream Paris adds call coaching |
| RAG over per-client documents (masterfiles, contracts) | Complex retrieval + privacy per client | When multi-tenant + per-client KB needed |
| Mobile-native dashboard | Responsive web sufficient for MVP | Post-launch if client requests |
| Real-time collaboration (multi-user inbox) | Architectural complexity | v1.2+ |
| Message edit history (audit trail for drafts) | Low priority | v1.2+ |
| Scheduled send (send at optimal time) | Complexity + time zone handling | v1.1+ |
| Sentiment analysis (flag emotional messages for Audrey) | Out of scope | If tone validation proves insufficient |

---

## QUARTERLY ROADMAP (6 months post-launch)

| Quarter | Focus | Likely Owner |
|---|---|---|
| **Q2 2026** (Weeks 1–13 from now) | Phase 1–3: MVP launch + channels + content scale | Abdur + Usama |
| **Q3 2026** | Phase 4–5: High volume + analytics + advanced features | Abdur + Usama + data analyst |
| **Q4 2026** | Multi-client onboarding + enterprise features | Abdur + solutions engineer |
| **Q1 2027** | Voice/call transcription (if requested) + deeper RAG per client | Abdur + ML engineer |

---

## Project Health Dashboard (Self-Assessment)

### Technical Debt (by priority)

| Item | Effort | Impact | Status |
|---|---|---|---|
| Schema/code drift | 2h | High | ✅ DONE (Day 1) |
| Authentication middleware | 3h | Critical | ✅ DONE (Day 1) |
| Service abstraction (classifier, draft gen, etc.) | 12h | High | 🔄 IN PROGRESS (Week 5) |
| KB import pipeline | 3h | Medium | ⏳ TODO (Week 6) |
| n8n credential security | 1h | Medium | ⏳ TODO (Week 5) |
| Database query optimization | 2h | Low | ⏳ TODO (Week 6) |

### Content Gaps

| Gap | Current | Target | Effort |
|---|---|---|---|
| KB entries | 3 (seed) | 75+ (launch) | 16h |
| Email templates | Partial | Complete by category | 12h |
| System prompts | Placeholder | Full with brand rules | 4h |

### Risk Runway (how long until critical?)

| Risk | Status | Days to Critical |
|---|---|---|
| Service-role JWT in git | ⚠️ Not rotated | ~2 days (compliance risk) |
| KB too small | ⏳ 3 entries | ~5 days (quality risk) |
| Authentication gaps | ✅ Fixed | N/A |
| Commission filter untested | ⏳ Not deployed | ~3 days (brand risk) |

---

## Resource Allocation (8-Week Sprint)

| Role | Week 5 | Week 6 | Week 7 | Week 8 | Total |
|---|---|---|---|---|---|
| Backend (Abdur) | 35h | 12h | 10h | 8h | 65h |
| Frontend (Usama) | 8h | 12h | 8h | 8h | 36h |
| Content (Sophie) | 0h | 24h | 40h | 20h | 84h |
| QA (TBD) | 4h | 3h | 4h | 4h | 15h |

**Assumptions**:
- 40h/week capacity per engineer
- Content authorship parallelizable (Sophie can work while engineers build)
- Meta App Review takes 2–4 weeks (assume approval by Week 7)

---

## Definition of "Project Complete"

**MVP Success** (Week 5, Sat May 9):
- [ ] Real email → 90s to approval → sent reply
- [ ] Output sanitizer blocks commission language
- [ ] Sender persona correct (Audrey/Vanessa/Frederic)
- [ ] Fixed subject lines exact-match
- [ ] Team UAT sign-off (Sophie + Audrey)

**Post-MVP Success** (Week 6+):
- [ ] 75+ KB entries embedded + tested
- [ ] WhatsApp + Instagram channels live (post-Meta approval)
- [ ] 1000+ messages/day sustained
- [ ] Executive dashboard functional
- [ ] Zero P0 security issues
- [ ] Runbook documented for ops

**Product-Market Fit** (Q3 2026):
- [ ] Multi-client onboarding complete
- [ ] 50+ messages/day from Dream Paris clients
- [ ] Net Promoter Score > 50 from team feedback
- [ ] < 5% draft rejection rate (tone quality high)

---

## Related Documents

- **SONNET_EXECUTION.md** — Full task specs + code examples (Week 5 focus)
- **IMPLEMENTATION_PLAN.md** — Architecture decisions + Track A–F (full scope)
- **Week5_Task_Plan.md** — Original 6-day plan (AI provider decision)
- **DEPLOYMENT_GUIDE.md** — Production deployment to Vercel/Railway/Supabase
- **DATABASE_SCHEMA.md** — Full schema reference
- **.env.example** — All required environment variables
- **CLAUDE.md** — AI behavior layer + project conventions
