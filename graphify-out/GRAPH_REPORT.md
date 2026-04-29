# Graph Report - .  (2026-04-27)

## Corpus Check
- 64 files · ~104,485 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 212 nodes · 274 edges · 32 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.82)
- Token cost: 14,200 input · 4,800 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Wedding Vendors & Couples|Wedding Vendors & Couples]]
- [[_COMMUNITY_Dashboard UI Pages|Dashboard UI Pages]]
- [[_COMMUNITY_AI Pipeline & Knowledge Base|AI Pipeline & Knowledge Base]]
- [[_COMMUNITY_Developer Workflow & Governance|Developer Workflow & Governance]]
- [[_COMMUNITY_Supabase Database Schema|Supabase Database Schema]]
- [[_COMMUNITY_System Architecture & Integrations|System Architecture & Integrations]]
- [[_COMMUNITY_Dream Paris Wedding Brand|Dream Paris Wedding Brand]]
- [[_COMMUNITY_API Routes & Message Channels|API Routes & Message Channels]]
- [[_COMMUNITY_Stephanie & Joshua Wedding|Stephanie & Joshua Wedding]]
- [[_COMMUNITY_Report Generation Scripts|Report Generation Scripts]]
- [[_COMMUNITY_Week 2 Report Generator|Week 2 Report Generator]]
- [[_COMMUNITY_Week 3 Report Generator|Week 3 Report Generator]]
- [[_COMMUNITY_Auth Middleware|Auth Middleware]]
- [[_COMMUNITY_Home Page|Home Page]]
- [[_COMMUNITY_TopBar Component|TopBar Component]]
- [[_COMMUNITY_Async Hook|Async Hook]]
- [[_COMMUNITY_API Entry Point|API Entry Point]]
- [[_COMMUNITY_Supabase Client|Supabase Client]]
- [[_COMMUNITY_Drafts Route|Drafts Route]]
- [[_COMMUNITY_Health Check Route|Health Check Route]]
- [[_COMMUNITY_Inboxes Route|Inboxes Route]]
- [[_COMMUNITY_Leads Route|Leads Route]]
- [[_COMMUNITY_Messages Route|Messages Route]]
- [[_COMMUNITY_Webhooks Route|Webhooks Route]]
- [[_COMMUNITY_Next.js Type Declarations|Next.js Type Declarations]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_Sidebar Layout|Sidebar Layout]]
- [[_COMMUNITY_React Framework|React Framework]]
- [[_COMMUNITY_Health API Endpoint|Health API Endpoint]]

## God Nodes (most connected - your core abstractions)
1. `DPCA Database Schema (Supabase PostgreSQL)` - 14 edges
2. `Dream Paris Wedding (Client Brand)` - 13 edges
3. `createClient()` - 9 edges
4. `WF5: Draft Response Generation Workflow` - 9 edges
5. `n8n Workflow Engine (Self-hosted Docker)` - 8 edges
6. `OpenAI GPT-4o` - 7 edges
7. `P1: Brand Voice System Prompt` - 7 edges
8. `DPCA — Dream Paris Communication Assistant` - 6 edges
9. `WF2: Message Classification Workflow` - 6 edges
10. `WF6: Auto-Send Workflow` - 6 edges

## Surprising Connections (you probably didn't know these)
- `P1: Brand Voice System Prompt` --conceptually_related_to--> `DPW Communication Tone (Luxury Authority)`  [INFERRED]
  docs/PROMPTS.md → graphify-out/converted/Ai Brain Date and Core Report - DREAM PARIS WEDDING_b9bf4da8.md
- `handleSave()` --calls--> `createClient()`  [INFERRED]
  dashboard\app\knowledge-base\page.tsx → dashboard\lib\supabase.ts
- `handleDelete()` --calls--> `createClient()`  [INFERRED]
  dashboard\app\knowledge-base\page.tsx → dashboard\lib\supabase.ts
- `handleSubmit()` --calls--> `createClient()`  [INFERRED]
  dashboard\app\login\page.tsx → dashboard\lib\supabase.ts
- `handleSaveConfig()` --calls--> `createClient()`  [INFERRED]
  dashboard\app\settings\page.tsx → dashboard\lib\supabase.ts

## Hyperedges (group relationships)
- **n8n AI Message Processing Pipeline (WF1→WF2→WF4→WF5→WF6)** — wf1_email_ingestion, wf2_classification, wf4_context_retrieval, wf5_draft_generation, wf6_auto_send [EXTRACTED 1.00]
- **DPCA Core Technology Stack** — n8n_engine, supabase_db, pinecone_vectorstore, openai_gpt4o, backend_api, dashboard_frontend [EXTRACTED 1.00]
- **External Message Channels** — gmail_api, meta_whatsapp_api, meta_instagram_api [EXTRACTED 1.00]
- **DPCA Development Team** — team_abdur, team_usama, team_sophie [EXTRACTED 1.00]
- **Supabase Database Tables (10 tables)** — db_table_users, db_table_messages, db_table_drafts, db_table_leads, db_table_knowledge_base, db_table_inboxes, db_table_audit_log, db_table_system_config, db_table_errors_log, db_table_ignored_messages [EXTRACTED 1.00]
- **DPCA AI Prompt Suite (P1-P6)** — p1_brand_voice_prompt, p2_classification_prompt, p3_draft_generation_prompt, p4_lead_extraction_prompt, p5_regeneration_prompt, p6_tone_validation_prompt [EXTRACTED 1.00]
- **Dream Paris Wedding Real Event Timelines** — wedding_helena_andy, wedding_sabine_arbi [EXTRACTED 1.00]
- **DPW Brand Intelligence & AI Behavior Rules** — dpw_planning_philosophy, dpw_communication_tone, dpw_vendor_management, dpw_masterfile, p1_brand_voice_prompt [INFERRED 0.85]
- **DPCA Core Technology Stack** —  [INFERRED 1.00]
- **Dream Paris Wedding Internal Team** —  [INFERRED 0.90]
- **DPCA Development Team** —  [INFERRED 1.00]
- **Week 2 Key Deliverables** —  [INFERRED 1.00]
- **Week 3 Key Deliverables** —  [INFERRED 1.00]
- **Colin & Veronica Wedding Vendor Team** —  [INFERRED 1.00]
- **Zach & Toni Wedding Vendor Team** —  [INFERRED 1.00]
- **Tomiko & Adam Wedding Vendor Team** —  [INFERRED 1.00]
- **Holly & James Wedding Vendor Team** —  [INFERRED 1.00]
- **DPCA Supported Message Channels** —  [INFERRED 1.00]
- **DPCA Code Review Governance** —  [INFERRED 1.00]

## Communities

### Community 0 - "Wedding Vendors & Couples"
Cohesion: 0.07
Nodes (41): Anthony, Aude Lucas, Blackstone, Catalin, Chris (Ohana), Christine & Anant, Colin & Veronica, Erika & Elliott (+33 more)

### Community 1 - "Dashboard UI Pages"
Cohesion: 0.09
Nodes (16): expand_message_status.sql, CategoryBadge(), catMeta(), channelIcon(), fmtDate(), handleApprove(), handleDelete(), handleDiscard() (+8 more)

### Community 2 - "AI Pipeline & Knowledge Base"
Cohesion: 0.13
Nodes (22): DB Table: audit_log, DB Table: knowledge_base, DB Table: system_config, n8n, OpenAI GPT-4o, P1: Brand Voice System Prompt, P2: Classification Prompt, P3: Draft Generation Prompt (+14 more)

### Community 3 - "Developer Workflow & Governance"
Cohesion: 0.12
Nodes (22): Abdur Rehman, Boris Cherny CLAUDE.md File, .github/CODEOWNERS, DPCA Developer Workflow Guide, Git Feature Branch Workflow Convention, DPCA Project, Meta Cloud API, Meta Graph API (+14 more)

### Community 4 - "Supabase Database Schema"
Cohesion: 0.13
Nodes (20): DB Table: drafts, DB Table: errors_log, DB Table: ignored_messages, DB Table: inboxes, DB Table: leads, DB Table: messages, DB Table: users, DPCA System Architecture (+12 more)

### Community 5 - "System Architecture & Integrations"
Cohesion: 0.21
Nodes (16): DPCA Backend Express API, DPCA Next.js Dashboard Frontend, Dashboard HTML Mockup (Design Reference), Gmail REST API (OAuth 2.0), Meta App Review Blocker (WhatsApp/Instagram), Meta Graph API (Instagram DMs), Meta Cloud API (WhatsApp Business), n8n Workflow Engine (Self-hosted Docker) (+8 more)

### Community 6 - "Dream Paris Wedding Brand"
Cohesion: 0.18
Nodes (14): Audrey (Founder, Dream Paris Wedding), DPW Communication Tone (Luxury Authority), DPW Masterfile (Internal Planning Control Document), DPW Planning Philosophy (Venue-First, Step-by-Step), DPW Vendor Management Philosophy (Centralized), Dream Paris Wedding (Client Brand), Frederic (Dream Paris Wedding Team Member), Rationale: Flat-Fee Planning Fee Model (+6 more)

### Community 7 - "API Routes & Message Channels"
Cohesion: 0.22
Nodes (9): GET /api/inboxes, GET /api/leads, GET /api/messages, Gmail Channel, Instagram Channel, WhatsApp Channel, Express.js, Railway (+1 more)

### Community 8 - "Stephanie & Joshua Wedding"
Cohesion: 0.4
Nodes (5): Claire Morris, Stephanie & Joshua, Melissa, Château de Villette, Hôtel de Crillon

### Community 9 - "Report Generation Scripts"
Cohesion: 0.83
Nodes (3): add_styled_heading(), add_table_row(), create_document()

### Community 10 - "Week 2 Report Generator"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Week 3 Report Generator"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Auth Middleware"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Home Page"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "TopBar Component"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Async Hook"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "API Entry Point"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Supabase Client"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Drafts Route"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Health Check Route"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Inboxes Route"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Leads Route"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Messages Route"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Webhooks Route"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Next.js Type Declarations"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Next.js Config"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "PostCSS Config"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Tailwind Config"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Root Layout"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Sidebar Layout"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "React Framework"
Cohesion: 1.0
Nodes (1): ReactJS

### Community 31 - "Health API Endpoint"
Cohesion: 1.0
Nodes (1): GET /api/health

## Knowledge Gaps
- **19 isolated node(s):** `DPCA System Architecture`, `DPCA AI Prompt Templates`, `P6: Tone Validation Prompt`, `DB Table: users`, `DB Table: errors_log` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Week 2 Report Generator`** (2 nodes): `create_report()`, `generate_week2_report.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Week 3 Report Generator`** (2 nodes): `create_report()`, `generate_week3_report.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Middleware`** (2 nodes): `middleware.ts`, `middleware()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Home Page`** (2 nodes): `page.tsx`, `Home()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `TopBar Component`** (2 nodes): `TopBar.tsx`, `TopBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Async Hook`** (2 nodes): `hooks.ts`, `useAsync()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `API Entry Point`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supabase Client`** (1 nodes): `supabase.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Drafts Route`** (1 nodes): `drafts.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Health Check Route`** (1 nodes): `health.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Inboxes Route`** (1 nodes): `inboxes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Leads Route`** (1 nodes): `leads.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Messages Route`** (1 nodes): `messages.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Webhooks Route`** (1 nodes): `webhooks.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Type Declarations`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Config`** (1 nodes): `next.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PostCSS Config`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind Config`** (1 nodes): `tailwind.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Root Layout`** (1 nodes): `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sidebar Layout`** (1 nodes): `Layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `React Framework`** (1 nodes): `ReactJS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Health API Endpoint`** (1 nodes): `GET /api/health`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `OpenAI GPT-4o` connect `AI Pipeline & Knowledge Base` to `Developer Workflow & Governance`, `System Architecture & Integrations`?**
  _High betweenness centrality (0.243) - this node is a cross-community bridge._
- **Why does `WF5: Draft Response Generation Workflow` connect `AI Pipeline & Knowledge Base` to `Supabase Database Schema`, `System Architecture & Integrations`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Why does `Dream Paris Wedding (Client Brand)` connect `Dream Paris Wedding Brand` to `AI Pipeline & Knowledge Base`, `Supabase Database Schema`, `System Architecture & Integrations`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Dream Paris Wedding (Client Brand)` (e.g. with `Wedding Timeline: Helena & Andy (April 19, 2025, Peninsula Paris + Yacht de Paris)` and `Wedding Timeline: Sabine & Arbi (September 20, 2025, Bastide du Roy, Antibes)`) actually correct?**
  _`Dream Paris Wedding (Client Brand)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `createClient()` (e.g. with `handleApprove()` and `handleDiscard()`) actually correct?**
  _`createClient()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DPCA System Architecture`, `DPCA AI Prompt Templates`, `P6: Tone Validation Prompt` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Wedding Vendors & Couples` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._