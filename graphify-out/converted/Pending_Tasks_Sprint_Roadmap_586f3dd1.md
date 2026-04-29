<!-- converted from Pending_Tasks_Sprint_Roadmap.docx -->

DPCA - Dream Paris Communication Assistant
## Pending Tasks Sprint Roadmap (Weeks 2-4)
Generated: April 07, 2026

# 📋 Executive Summary
- Total Pending Work: ~103 hours across 3 weeks
- Team: 3 full-time members (Abdur, Usama, Sophie) + optional DevOps
- Critical Path: VPS Infrastructure → n8n Deployment → Workflow Implementation
- Critical Dependency: Brand Voice Content (blocks prompt finalization)
- Target Completion: End of Week 4 (April 25, 2026)
- Status: All Week 1 deliverables 100% complete, Week 2-4 ready to commence

# 📅 Timeline Overview
- Week 2 (Apr 14): Infrastructure + VPS setup begins (Abdur)
- Week 3 (Apr 21): n8n workflows implementation (Abdur) + UI enhancements (Usama) in parallel
- Week 4 (Apr 28): KB finalization + workflow testing + UI polish + production readiness

# 👥 Team Assignments & Hours

# ⚙️ ABDUR REHMAN - Infrastructure & Workflows (45 hours)
## Phase 1: VPS Infrastructure Setup (5 hours)
- ✓ Deliverable: n8n running on http://<VPS_IP>:5678 (accessible + verified)

## Phase 2: OAuth & API Credentials (6 hours)
- ✓ Deliverable: All 5 credential nodes active in n8n + Meta App Review submitted
- ⚠️ Blocker Note: Meta App Review takes 1-4 weeks. WF1-5 testable without Meta APIs.

## Phase 3: n8n Workflow Implementation (30 hours)
- ✓ Deliverable: All 8 workflows fully implemented + end-to-end pipeline tested
- ✓ Verification: Run Step 14 checklist from todo.md (all 14 validation points)

## Phase 4: Integration Testing (4 hours)
- Test WF1 end-to-end: Send test email → captured in Gmail → ingested to Supabase
- Test WF2-5 pipeline: Message classified → context retrieved → draft generated with confidence score
- Test WF6 (Gmail only initially): Draft auto-sent via Gmail SMTP
- Test WF7: Lead extraction from real message and inserted to Supabase leads table
- Test WF8: Dashboard approve/reject/regenerate webhooks trigger correct n8n actions
- Document any issues in tech-debt.md for Week 4 Polish phase
- ✓ Success Criteria: Full pipeline processed 5 real emails → 5 drafts generated → 0 errors

# 🎨 USAMA KHAN - Dashboard UI Enhancements (18 hours)
Priority: Can work independently of infrastructure. Use existing Supabase seed data.

- ✓ Deliverable: All 8 features merged to main branch + all E2E tests passing
- ✓ Figma Mockups: Share mockups with Sophie before implementation for visual consistency

# 📝 SOPHIE LAURENT - Brand Voice & Content (30 hours) - CRITICAL PATH
⚠️ CRITICAL: This work is blocking all prompt finalization. START IMMEDIATELY. All phases depend on this.

- ✓ Deliverable: P1 prompt finalized + 150+ KB entries populated + 20+ drafts validated
- ⚠️ Dependencies:
- - Blocks: P2-P6 prompts (classification, extraction, tone validation)
- - Blocks: WF5 draft generation quality
- ✓ Action: Email brand voice guide to Abdur by end of Week 2 so prompts lock in while infrastructure builds

# 🚀 OPTIONAL: DevOps & Monitoring (10 hours)
Optional for Week 3-4 (post-MVP). Recommend for production deployment.

- ✓ Deliverable: Production-ready monitoring + automated backups + 1-click deploy

# 🔴 Critical Dependencies & Status Blockers
## Critical Path Sequence:
- 1. VPS Infrastructure (Abdur, Week 2) → n8n running
- 2. Brand Voice Content (Sophie, Week 2) → P1 prompt finalized
- 3. OAuth Credentials (Abdur, Week 2) → Gmail API connected
- 4. Workflow Implementation (Abdur, Week 3-4) → all 8 WFs active
- 5. UI Enhancements (Usama, Weeks 2-4) → dashboard ready
- 6. Integration Testing (Abdur, Week 4) → production verification

## Blocked Items:
- WhatsApp/Instagram (WF6 partial) - Blocked by Meta App Review (1-4 weeks approval time)
- Production Deployment (Week 5+) - Blocked until all workflows tested + KB finalized
- Analytics Page (Usama) - Independent, no blockers
- Regenerate Modal (Usama) - Depends on WF5 ready (Abdur Week 3-4)

# 📊 Weekly Milestones & Go/No-Go Criteria
## Week 2 Milestones (End of April 14):
- ✓ VPS running + n8n accessible at http://<IP>:5678
- ✓ All credential nodes created in n8n
- ✓ Gmail OAuth flow tested + working
- ✓ P1 Brand Voice Prompt finalized + sent to Abdur
- ✓ 50+ KB entries staged for bulk upload
- ✓ UI mockups approved (Usama → Sophie)
- GO SIGNAL: All above ✓ → Proceed to Week 3 workflows

## Week 3 Milestones (End of April 21):
- ✓ WF1-WF5 fully implemented in n8n
- ✓ Email ingestion pipeline end-to-end tested (5 real emails)
- ✓ Draft generation + tone scoring validated
- ✓ 150+ KB entries embedded in Pinecone
- ✓ Regenerate + Rejection modals merged to main
- ✓ Version history view deployed
- GO SIGNAL: All above ✓ → Proceed to Week 4 finalization

## Week 4 Milestones (End of April 25 - LAUNCH):
- ✓ WF6-WF8 fully implemented + tested
- ✓ Full 8-workflow pipeline end-to-end verified
- ✓ Step 14 verification checklist all ✓
- ✓ All dashboard UI features live + tested
- ✓ 20+ auto-draft samples reviewed + calibrated
- ✓ Production runbook + monitoring dashboard live
- ✓ All 103 hours of pending work completed
GO SIGNAL: LAUNCH DPCA to production 🚀


# 📋 Handoff Instructions
## For Abdur Rehman:
- Week 2: Set up VPS + n8n + credentials
- Week 3-4: Implement all 8 n8n workflows from JSON stubs
- Setup checklist: docs/SETUP.md (VPS deployment guide)
- Workflow templates: n8n-workflows/ folder (8 JSON files)

## For Usama Khan:
- Start immediately: UI mockups from Figma
- Week 2: Regenerate modal + rejection modal + version history
- Week 3: Bulk actions + analytics + settings pages
- Component stubs: dashboard/app/components/ (placeholder files ready)

## For Sophie Laurent (CRITICAL):
- CRITICAL: Start Week 2, do NOT wait
- Email brand voice examples + 15+ templates by April 10
- Finalize P1 system prompt by April 12
- Export 100+ historic emails + create 50+ Q&A by April 17
- Content templates: docs/BRAND_VOICE.md + docs/TEMPLATES.md


──────────────────────────────────────────
End of Sprint Roadmap Document
For questions or changes, update this document and redistribute to all team members.
|  |  |  |  |
| --- | --- | --- | --- |
| Team Member | Role | Hours | Status |
| Abdur Rehman | Infrastructure Lead | 45 hrs | Ready to start |
| Usama Khan | Frontend Lead | 18 hrs | Ready to start (parallel) |
| Sophie Laurent | Content Lead | 30 hrs | CRITICAL - start immediately |
| VPS/DevOps (Optional) | Infrastructure Support | 10 hrs | Optional - post-MVP |
| TOTAL |  | 103 hours | Weeks 2-4 |
|  |  |  |  |
| --- | --- | --- | --- |
| Task | Description | Hours | Week |
| 1.1 VPS Provisioning | Rent 2GB RAM server on DigitalOcean/Hetzner (Ubuntu 22.04) | 1 hr | Week 2 |
| 1.2 Docker Setup | Install Docker + Docker Compose, configure UFW firewall | 1.5 hrs | Week 2 |
| 1.3 n8n Deployment | Deploy n8n via docker-compose.yml (basic auth, persistent volume) | 1.5 hrs | Week 2 |
| 1.4 n8n Config | Configure n8n timezone (Europe/Paris), webhook URL, basic auth credentials | 1 hr | Week 2 |
|  |  |  |  |
| --- | --- | --- | --- |
| Task | Description | Hours | Week |
| 2.1 Gmail OAuth | Complete Google Cloud OAuth app setup + get credentials (Client ID, Secret) | 2 hrs | Week 2 |
| 2.2 n8n Credentials | Create n8n credential nodes: Supabase, OpenAI API, Pinecone, Gmail | 2 hrs | Week 2 |
| 2.3 Meta Setup | Apply for Meta App Review (WhatsApp + Instagram APIs) - starts clock for approval | 1 hr | Week 2 |
| 2.4 Backup Creds | Store all credentials securely in 1Password or similar vault | 1 hr | Week 2 |
|  |  |  |  |
| --- | --- | --- | --- |
| Workflow | Description | Hours | Week |
| WF1: Email Ingestion | Gmail polling (2 min interval) → deduplication → Supabase insert | 3 hrs | Week 3 |
| WF2: Classification | GPT-4o message classification (category/priority/tier) + safety override | 3.5 hrs | Week 3 |
| WF3: KB Embedding | text-embedding-3-small (1536-dim) + Pinecone upsert | 2.5 hrs | Week 3 |
| WF4: Context Retrieval | Semantic search from Pinecone (top-5 results) + metadata filtering | 2.5 hrs | Week 3 |
| WF5: Draft Generation | GPT-4o with P1 brand voice system prompt + tone confidence calculation | 4 hrs | Week 3-4 |
| WF6: Auto-Send | Multi-channel routing (Gmail/WhatsApp/Instagram) + retry logic | 4 hrs | Week 4 |
| WF7: Lead Extraction | Structured data extraction via GPT-4o + CRM insert/update to Supabase | 3.5 hrs | Week 4 |
| WF8: Dashboard Actions | Webhook receiver for approve/reject/regenerate/reassign + audit logging | 2 hrs | Week 4 |
|  |  |  |  |
| --- | --- | --- | --- |
| Feature | Description | Hours | Week |
| Regenerate Modal | Modal with feedback textarea + submit button + calls /api/drafts/:id/regenerate | 1.5 hrs | Week 2 |
| Rejection Modal | Modal to capture rejection reason → calls /api/drafts/:id/reject with reason | 1 hr | Week 2 |
| Version History | Expandable section showing draft version history with timestamps + who edited | 2 hrs | Week 2 |
| Context Sources | KB source display - show which KB entries influenced draft generation | 1.5 hrs | Week 2-3 |
| Bulk Actions | Multi-select inbox → bulk approve/reject/reassign from context menu | 3 hrs | Week 3 |
| Analytics Page | New /analytics route: approval rate chart, response time stats, category breakdown | 4 hrs | Week 3 |
| Settings Page | New /settings route: tone preferences, auto-send toggles, team member management | 3 hrs | Week 3 |
| Polish & Testing | CSS refinements, accessibility audit (a11y), cross-browser testing | 1.5 hrs | Week 4 |
|  |  |  |  |
| --- | --- | --- | --- |
| Phase | Task | Hours | Week |
| Phase 1: Brand Voice | 1.1 Email 5-10 brand voice example emails to team | 4 hrs | Week 2 |
|  | 1.2 Finalize P1 brand voice system prompt (incorporates feedback) | 2 hrs | Week 2 |
| Phase 2: Templates | 2.1 Provide 15+ response templates by category (complaint, inquiry, order, support) | 4 hrs | Week 2 |
|  | 2.2 Create tone guidelines (professional, empathetic, urgent, promotional) | 2 hrs | Week 2 |
| Phase 3: KB Collection | 3.1 Export 100+ historic emails from Paris Dream brand email account | 8 hrs | Week 2-3 |
|  | 3.2 Create 50+ Q&A database (customer FAQs, common issues) | 6 hrs | Week 3 |
| Phase 4: KB Refinement | 4.1 Bulk upload KB entries to Supabase + trigger WF3 embeddings | 1 hr | Week 3 |
|  | 4.2 Review 20+ auto-generated drafts + calibrate classification model | 3 hrs | Week 3-4 |
| Phase 5: Final QA | 5.1 Final content audit + sign-off | 2 hrs | Week 4 |
|  |  |  |  |
| --- | --- | --- | --- |
| Task | Description | Hours | Week |
| Monitoring Setup | Prometheus + Grafana or Datadog dashboard (CPU, memory, API latency) | 3.5 hrs | Week 3-4 |
| Backup Strategy | Automated daily snapshots: n8n data + Supabase backups to S3 | 2 hrs | Week 3-4 |
| CI/CD Pipeline | GitHub Actions: auto-deploy on main branch → restart backend + rebuild dashboard | 3 hrs | Week 4 |
| Runbook | Troubleshooting guide for common issues (n8n crashes, API 500s, stuck workflows) | 1.5 hrs | Week 4 |