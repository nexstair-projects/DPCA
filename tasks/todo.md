# IMPLEMENTATION PLAN — Week 1–2: Foundation

> **Phase**: 0 (Foundation)
> **Goal**: All accounts, database, n8n instance, and project scaffolding ready — zero application code yet
> **Source of truth**: claude.md, ARCHITECTURE.md, DATABASE_SCHEMA.md, WORKFLOWS.md, PROMPTS.md

---

## Dependency Graph

```
STEP 1: Accounts & Credentials
    │
    ├──→ STEP 2: Supabase Project Setup       ──→ STEP 3: Schema Deployment
    │                                                │
    │                                                ├──→ STEP 4: RLS + Triggers
    │                                                │
    │                                                └──→ STEP 5: Seed Data
    │
    ├──→ STEP 6: VPS + Docker Setup            ──→ STEP 7: n8n Deployment
    │                                                │
    │                                                └──→ STEP 8: n8n Credential Nodes
    │
    ├──→ STEP 9: Google Cloud + Gmail OAuth
    │
    ├──→ STEP 10: Meta Platform Application (WhatsApp + Instagram)
    │
    ├──→ STEP 11: OpenAI + Pinecone Setup
    │
    └──→ STEP 12: Project Scaffolding
              │
              └──→ STEP 13: Environment Config
                        │
                        └──→ STEP 14: Verification Checklist
```

---

## STEP 1 — External Account Registration

**Owner**: Abdur Rehman
**Depends on**: Nothing
**Blocked by**: Nothing

| Action | Service | URL | Notes |
|---|---|---|---|
| 1.1 | Create OpenAI Platform account | platform.openai.com | Generate API key, note org ID |
| 1.2 | Create Supabase account + new project | supabase.com | Region: EU (Frankfurt) for Paris-based client |
| 1.3 | Create Pinecone account | pinecone.io | Free tier sufficient for Phase 1 |
| 1.4 | Create Google Cloud Console project | console.cloud.google.com | For Gmail API OAuth |
| 1.5 | Create Meta Business Manager account | business.facebook.com | For WhatsApp + Instagram APIs |
| 1.6 | Provision VPS | DigitalOcean / Hetzner | Minimum 2GB RAM, Ubuntu 22.04 |

**Critical**: Submit Meta application (1.5) on Day 1 — approval takes 1–4 weeks.

**Output**: All account URLs, project IDs, and initial credentials stored in a **secure credentials vault** (not in plaintext, not in Git).

---

## STEP 2 — Supabase Project Configuration ✅ COMPLETE

**Owner**: Abdur Rehman
**Depends on**: Step 1.2 (Supabase account)
**Status**: Done — Project `hefkqlkiuiqhgssdmvad` configured, CLI linked.

| # | Action | Detail |
|---|---|---|
| 2.1 | Note Supabase project credentials | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| 2.2 | Enable Supabase Auth | Email/password provider enabled |
| 2.3 | Configure Auth settings | Disable signups (invite-only), set JWT expiry to 1 hour, enable refresh tokens |
| 2.4 | Enable Row Level Security globally | Confirm RLS is ON by default for all new tables |
| 2.5 | Verify SQL editor access | Confirm you can run raw SQL in the Supabase dashboard |

**Security checkpoint**: Confirm `service_role` key is separated from `anon` key and never exposed to the frontend.

---

## STEP 3 — Schema Deployment ✅ COMPLETE

**Owner**: Abdur Rehman
**Depends on**: Step 2
**Status**: Done — All 10 tables deployed via 8 migration files (`supabase/migrations/`). Verified in cloud.

Execute the following SQL scripts **in this exact order** per DATABASE_SCHEMA.md migration order. Each script must complete without errors before moving to the next.

| # | Table | FK Dependencies | Notes |
|---|---|---|---|
| 3.1 | `users` | `auth.users` (Supabase Auth) | Create after auth accounts exist (Step 5 seeds these) |
| 3.2 | `inboxes` | None | Channel CHECK: gmail, whatsapp, instagram |
| 3.3 | `system_config` | `users` (optional FK on `updated_by`) | Unique constraint on `config_key` |
| 3.4 | `knowledge_base` | `users` (optional FKs) | 7 category CHECK values |
| 3.5 | `leads` | `messages` (FK on `first_message_id`) | **Create before `messages`** — `messages.lead_id` references `leads.id`. Deploy `leads` first with `first_message_id` FK deferred or nullable |
| 3.6 | `messages` | `inboxes`, `leads`, `users` | Largest table — 16 indexes |
| 3.7 | `drafts` | `messages`, `users` | UNIQUE(message_id, version) |
| 3.8 | `ignored_messages` | `inboxes` | Lightweight audit table |
| 3.9 | `errors_log` | `messages` (nullable FK), `users` (nullable FK) | Partial index on unresolved |
| 3.10 | `audit_log` | `users`, `drafts`, `messages`, `leads` (all nullable FKs) | Last table — references everything |

**Circular dependency note**: `messages` has `lead_id → leads(id)` and `leads` has `first_message_id → messages(id)`. Both FKs are nullable with `ON DELETE SET NULL`, so create `leads` first (without `first_message_id` FK), then `messages`, then `ALTER TABLE leads ADD CONSTRAINT` for the `first_message_id` FK.

### Execution approach:
```
-- Phase A: Tables without cross-dependencies
CREATE TABLE users ...
CREATE TABLE inboxes ...
CREATE TABLE system_config ...
CREATE TABLE knowledge_base ...

-- Phase B: Leads (without first_message_id FK initially)
CREATE TABLE leads (
    ... all columns ...
    first_message_id UUID,  -- FK added AFTER messages table exists
    ...
);

-- Phase C: Tables that reference leads
CREATE TABLE messages ...

-- Phase D: Add deferred FK
ALTER TABLE leads
    ADD CONSTRAINT fk_leads_first_message
    FOREIGN KEY (first_message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- Phase E: Remaining tables
CREATE TABLE drafts ...
CREATE TABLE ignored_messages ...
CREATE TABLE errors_log ...
CREATE TABLE audit_log ...
```

### Per-table verification:
After each CREATE TABLE, run:
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = '<table_name>'
ORDER BY ordinal_position;
```
Confirm column count, types, and constraints match DATABASE_SCHEMA.md exactly.

---

## STEP 4 — RLS Policies, Triggers & Functions ✅ COMPLETE

**Owner**: Abdur Rehman
**Depends on**: Step 3 (all tables exist)
**Status**: Done — 22 RLS policies, 7 `updated_at` triggers, `get_dashboard_stats()` function all deployed.

### 4.1 — Deploy `updated_at` trigger function
```sql
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ ...
```
Apply trigger to: `users`, `inboxes`, `messages`, `drafts`, `leads`, `knowledge_base`, `system_config`

### 4.2 — Deploy `get_dashboard_stats` function
From DATABASE_SCHEMA.md — `SECURITY DEFINER` function for aggregated stats.

### 4.3 — Enable RLS + Deploy policies (per table)

| Table | Policies to create | Count |
|---|---|---|
| `users` | `users_select_own`, `users_select_admin`, `users_manage_admin` | 3 |
| `inboxes` | `inboxes_admin`, `inboxes_assigned`, `inboxes_manager_read` | 3 |
| `messages` | `messages_admin_manager`, `messages_team` | 2 |
| `drafts` | `drafts_admin_manager`, `drafts_team`, `drafts_update` | 3 |
| `leads` | `leads_admin_manager`, `leads_team_read` | 2 |
| `knowledge_base` | `kb_admin`, `kb_read` | 2 |
| `system_config` | `config_admin`, `config_read` | 2 |
| `ignored_messages` | `ignored_admin` | 1 |
| `errors_log` | `errors_admin`, `errors_manager_read` | 2 |
| `audit_log` | `audit_admin`, `audit_insert` | 2 |
| **Total** | | **22 policies** |

### 4.4 — Verification
For each table:
```sql
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = '<table_name>';
```
Confirm policy count matches the table above.

---

## STEP 5 — Seed Data ✅ COMPLETE

**Owner**: Abdur Rehman
**Depends on**: Step 4 (RLS policies must be in place)
**Status**: All sub-steps complete
- 5.1 ✅ 3 auth accounts created (Abdur, Usama, Client)
- 5.2 ✅ 1 inbox record inserted (Dream Paris Main)
- 5.3 ✅ 8 system_config default entries seeded
- 5.4 ✅ Sample test data: 2 leads, 5 messages, 3 drafts, 3 knowledge_base entries

### 5.1 — Create Supabase Auth accounts (using Supabase dashboard or Admin API)
| User | Email | Role | Purpose |
|---|---|---|---|
| Abdur Rehman | (team email) | admin | Tech lead + full access |
| Usama | (team email) | admin | Frontend dev + full access |
| Sophie Laurent | (client email) | manager | Lead planner — primary user |

After creating Auth accounts, insert corresponding rows into `users` table with matching `auth_id`.

### 5.2 — Insert inbox records
```sql
INSERT INTO inboxes (name, channel, email_address, assigned_users) VALUES
('Dream Paris Main', 'gmail', 'contact@dreampariswedding.com', ARRAY['<sophie_user_id>']);
```
Additional inboxes added when client provides full inbox list.

### 5.3 — Insert default system_config entries
All 8 entries from DATABASE_SCHEMA.md:
- `brand_voice_prompt` — insert P1 from PROMPTS.md
- `classification_prompt` — insert P2 from PROMPTS.md
- `lead_extraction_prompt` — insert P4 from PROMPTS.md
- `email_signature` — `{"default": "Sophie Laurent\nDream Paris Wedding"}`
- `auto_send_rules` — `{"tier_1_enabled": true, "min_confidence": 85}`
- `business_hours` — `{"timezone": "Europe/Paris", "start": "09:00", "end": "18:00"}`
- `exclusion_list` — `{"emails": [], "domains": []}`
- `notification_emails` — `{"tier_3_alerts": [], "error_alerts": []}`

### 5.4 — Insert sample test data (for dashboard development)
- 5 sample `messages` (one per category: new_inquiry, existing_client, vendor, collaboration, general)
- 3 sample `drafts` (pending_review, auto_approved, sent)
- 2 sample `leads` (new, contacted)
- 3 sample `knowledge_base` entries (brand_voice, template, faq)

**Use realistic content** from the project brief (e.g., the Emma & James Holloway inquiry from the dashboard HTML).

### Verification
```sql
SELECT 'users' as tbl, count(*) FROM users
UNION ALL SELECT 'inboxes', count(*) FROM inboxes
UNION ALL SELECT 'system_config', count(*) FROM system_config
UNION ALL SELECT 'knowledge_base', count(*) FROM knowledge_base
UNION ALL SELECT 'messages', count(*) FROM messages
UNION ALL SELECT 'drafts', count(*) FROM drafts
UNION ALL SELECT 'leads', count(*) FROM leads;
```
Expected: users ≥ 3, inboxes ≥ 1, system_config = 8, knowledge_base ≥ 3, messages ≥ 5, drafts ≥ 3, leads ≥ 2.

---

## STEP 6 — VPS + Docker Setup

**Owner**: Abdur Rehman
**Depends on**: Step 1.6 (VPS provisioned)

| # | Action | Detail |
|---|---|---|
| 6.1 | SSH into VPS | Confirm Ubuntu 22.04, min 2GB RAM |
| 6.2 | System updates | `apt update && apt upgrade -y` |
| 6.3 | Install Docker Engine | Official Docker CE install |
| 6.4 | Install Docker Compose v2 | `docker compose version` → confirm ≥ 2.x |
| 6.5 | Configure firewall (UFW) | Allow: 22 (SSH), 80 (HTTP), 443 (HTTPS), 5678 (n8n — temporary, lock down later) |
| 6.6 | Create project directory | `/opt/dpca/` |
| 6.7 | Create `.env` file | `/opt/dpca/.env` — see Step 13 for contents |
| 6.8 | Set file permissions | `.env` readable only by root/docker group |

**Security checkpoint**: No password-based SSH. Key-only auth. Fail2ban installed.

---

## STEP 7 — n8n Deployment (Docker)

**Owner**: Abdur Rehman
**Depends on**: Step 6

### 7.1 — docker-compose.yml structure

```
/opt/dpca/
├── docker-compose.yml
├── .env
└── n8n-data/          # Persistent volume for n8n
```

Services to define in `docker-compose.yml`:

| Service | Image | Port | Purpose |
|---|---|---|---|
| `n8n` | `n8nio/n8n:latest` | 5678 | Workflow engine |
| `nginx` | `nginx:alpine` | 80, 443 | Reverse proxy + SSL (added later) |

n8n environment variables to pass:
- `N8N_BASIC_AUTH_ACTIVE=true`
- `N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD` (from `.env`)
- `WEBHOOK_URL` (public URL for n8n webhooks)
- `N8N_ENCRYPTION_KEY` (for credential encryption at rest)
- `GENERIC_TIMEZONE=Europe/Paris`
- Volume mount: `./n8n-data:/home/node/.n8n`

### 7.2 — Start and verify
```bash
docker compose up -d
docker compose logs n8n --tail 50
```
Confirm n8n UI accessible at `http://<VPS_IP>:5678` with basic auth.

### 7.3 — Lock down access
Once confirmed working, restrict port 5678 to VPS localhost only. Access via Nginx reverse proxy with HTTPS (SSL via Certbot/Let's Encrypt — configure when domain is pointed).

---

## STEP 8 — n8n Credential Nodes

**Owner**: Abdur Rehman
**Depends on**: Steps 7, 9, 10, 11

Create the following credential entries inside n8n (via n8n UI → Settings → Credentials). These are **not workflow code** — just credential registration so workflows can reference them later.

| # | Credential Name | Type | Status |
|---|---|---|---|
| 8.1 | `Supabase - Service Role` | Header Auth or HTTP Request | Ready (keys from Step 2.1) |
| 8.2 | `OpenAI - GPT4o` | OpenAI API | Ready (key from Step 1.1) |
| 8.3 | `Pinecone - Production` | HTTP Request (API Key) | Ready (key from Step 11) |
| 8.4 | `Gmail - DPW Main Inbox` | Google OAuth2 | Ready after Step 9 |
| 8.5 | `Meta - WhatsApp` | HTTP Request (Bearer) | **Blocked** until Meta approves (Step 10) |
| 8.6 | `Meta - Instagram` | HTTP Request (Bearer) | **Blocked** until Meta approves (Step 10) |

**Do not build workflows yet.** Only register credentials so they are available when workflow development starts in Week 4.

---

## STEP 9 — Google Cloud + Gmail OAuth

**Owner**: Abdur Rehman
**Depends on**: Step 1.4 (Google Cloud project)

| # | Action | Detail |
|---|---|---|
| 9.1 | Enable Gmail API | Google Cloud Console → APIs & Services → Enable Gmail API |
| 9.2 | Configure OAuth consent screen | App name: "DPCA Assistant", User type: Internal (or External with limited users) |
| 9.3 | Add scopes | `gmail.readonly`, `gmail.send`, `gmail.modify`, `gmail.labels` |
| 9.4 | Create OAuth 2.0 Client ID | Type: Web application. Redirect URI: n8n's OAuth callback URL (`https://<n8n-domain>/rest/oauth2-credential/callback`) |
| 9.5 | Store Client ID + Secret | In `.env` as `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` |
| 9.6 | Complete OAuth flow in n8n | Connect credential node (Step 8.4), authorize with client Gmail account, obtain refresh token |
| 9.7 | Verify read access | Use n8n Gmail node to list last 5 emails from inbox — confirm data returned |

**Security**: Store refresh token in n8n's encrypted credential storage. Separately back up in Supabase `inboxes.oauth_refresh_token` (encrypted at rest).

---

## STEP 10 — Meta Platform Application (WhatsApp + Instagram)

**Owner**: Abdur Rehman
**Depends on**: Step 1.5 (Meta Business Manager)

| # | Action | Detail |
|---|---|---|
| 10.1 | Create Meta Developer App | developers.facebook.com → Create App → Business type |
| 10.2 | Add WhatsApp product | Configure WhatsApp Business API, register phone number |
| 10.3 | Add Instagram Messaging product | Link Instagram Professional Account |
| 10.4 | Submit for App Review | WhatsApp: `whatsapp_business_messaging` permission. Instagram: `instagram_manage_messages` permission |
| 10.5 | Generate system user token | For WhatsApp API access |
| 10.6 | Generate long-lived Instagram token | Via token exchange flow |

**Status**: This is a **SUBMIT AND WAIT** step. Meta review takes 1–4 weeks. All other steps proceed in parallel. Workflows for WhatsApp (WF1 duplicate) and Instagram are scheduled for Weeks 7–10.

---

## STEP 11 — OpenAI + Pinecone Setup

**Owner**: Abdur Rehman
**Depends on**: Steps 1.1, 1.3

### OpenAI
| # | Action |
|---|---|
| 11.1 | Generate API key on platform.openai.com |
| 11.2 | Set usage limits (monthly budget cap) |
| 11.3 | Verify key works: `curl` test to Chat Completions endpoint with `gpt-4o` model |

### Pinecone
| # | Action |
|---|---|
| 11.4 | Create Pinecone index: `dpca-knowledge-base` |
| 11.5 | Dimension: 1536 (matches `text-embedding-3-small`) |
| 11.6 | Metric: cosine |
| 11.7 | Environment: serverless (AWS us-east-1 or eu-west-1) |
| 11.8 | Note API key and index host URL |

---

## STEP 12 — Project Scaffolding (Local) ✅ COMPLETE

**Owner**: Abdur Rehman + Usama
**Depends on**: Nothing (can start Day 1)
**Status**: Done — All directories and files created.

Create the folder structure defined in claude.md:

```
DPCA/
├── docs/                       # ✅ Already exists
│   ├── claude.md
│   ├── ARCHITECTURE.md
│   ├── WORKFLOWS.md
│   ├── DATABASE_SCHEMA.md
│   └── PROMPTS.md
├── info-docs/                  # ✅ Already exists
├── tasks/                      # NEW — task tracking per claude.md
│   ├── todo.md
│   └── lessons.md
├── dashboard/                  # NEW — React app (Usama scaffolds)
├── backend/                    # NEW — Node.js API
├── n8n-workflows/              # NEW — exported workflow JSONs
├── knowledge-base/             # NEW — KB source content
│   ├── email-examples/
│   ├── templates/
│   ├── brand-voice/
│   └── faqs/
├── scripts/                    # NEW — deployment/utility scripts
│   ├── deploy.sh
│   └── seed-db.sql
├── .env.example                # NEW — template (no real values)
├── .gitignore                  # NEW — exclude .env, node_modules, n8n-data
└── docker-compose.yml          # NEW — for local dev (mirrors VPS)
```

### .gitignore must include:
```
.env
.env.*
!.env.example
node_modules/
n8n-data/
dist/
build/
*.log
```

---

## STEP 13 — Environment Configuration ✅ COMPLETE

**Owner**: Abdur Rehman
**Depends on**: Steps 2, 9, 10, 11
**Status**: Done — `.env.example` committed, `docker-compose.yml` created, `.gitignore` configured.

Create `.env.example` in project root with all keys from ARCHITECTURE.md §6.2:

```env
# OpenAI
OPENAI_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Pinecone
PINECONE_API_KEY=
PINECONE_INDEX_NAME=dpca-knowledge-base
PINECONE_ENVIRONMENT=

# Gmail OAuth (per inbox)
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=

# Meta APIs (populated after approval)
META_WHATSAPP_ACCESS_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=
META_INSTAGRAM_ACCESS_TOKEN=
META_APP_SECRET=

# n8n
N8N_BASIC_AUTH_USER=
N8N_BASIC_AUTH_PASSWORD=
N8N_WEBHOOK_URL=
N8N_ENCRYPTION_KEY=

# App
NODE_ENV=development
JWT_SECRET=
CORS_ORIGIN=http://localhost:3000
```

Create actual `.env` (never committed) from `.env.example` and populate with real values from Steps 1–11.

---

## STEP 14 — Verification Checklist

**Owner**: Abdur Rehman
**Depends on**: All previous steps

Run through this checklist before declaring Week 1–2 complete:

### Database (Supabase)
- [ ] All 10 tables created with correct columns/types (match DATABASE_SCHEMA.md exactly)
- [ ] All 22 RLS policies deployed and enabled
- [ ] All 7 `updated_at` triggers active
- [ ] `get_dashboard_stats` function deployed
- [ ] 3 auth accounts created (admin, admin, manager)
- [ ] 3 `users` rows linked to auth accounts
- [ ] ≥ 1 inbox record populated
- [ ] 8 `system_config` default entries inserted (with prompt content from PROMPTS.md)
- [ ] Sample test data in messages, drafts, leads, knowledge_base
- [ ] `service_role` key confirmed separate from `anon` key

### VPS + n8n
- [ ] Docker + Docker Compose installed on VPS
- [ ] n8n container running and accessible (basic auth protected)
- [ ] n8n data persisted to volume (`./n8n-data`)
- [ ] Timezone set to `Europe/Paris`
- [ ] Port 5678 restricted to localhost (Nginx planned)

### Credentials in n8n
- [ ] Supabase credential node created (service role key)
- [ ] OpenAI credential node created (API key tested)
- [ ] Pinecone credential node created (API key + index host)
- [ ] Gmail OAuth credential node created (refresh token obtained)
- [ ] Gmail read access verified (list 5 recent emails)

### External Services
- [ ] OpenAI API key works (`gpt-4o` model accessible)
- [ ] Pinecone index created (`dpca-knowledge-base`, 1536 dims, cosine)
- [ ] Google Cloud project has Gmail API enabled with OAuth configured
- [ ] Meta application submitted (WhatsApp + Instagram) — track approval status

### Project Structure
- [ ] Folder structure matches claude.md conventions
- [ ] `.env.example` committed with all keys (no values)
- [ ] `.gitignore` excludes `.env`, `node_modules`, `n8n-data`
- [ ] `tasks/todo.md` initialized
- [ ] All documentation files in `docs/`

### Security
- [ ] No credentials in Git history
- [ ] VPS SSH key-only (password auth disabled)
- [ ] Supabase RLS confirmed active on all 10 tables
- [ ] n8n protected with basic auth
- [ ] `.env` file permissions: owner-readable only

---

## Week 1–2 Timeline

| Day | Focus | Steps | Blocker? |
|---|---|---|---|
| **Day 1** | Accounts + Meta submission | 1 (all), 10.1–10.4 | Meta review starts (background) |
| **Day 2** | Supabase setup + schema | 2, 3 | — |
| **Day 3** | RLS + triggers + seed data | 4, 5 | — |
| **Day 4** | VPS + Docker + n8n | 6, 7 | — |
| **Day 5** | Google Cloud + Gmail OAuth | 9 | — |
| **Day 6** | OpenAI + Pinecone + n8n creds | 11, 8 | — |
| **Day 7** | Project scaffolding + env config | 12, 13 | — |
| **Day 8** | Verification + fix gaps | 14 | — |
| **Day 9–10** | Process brand voice guide → system prompt format | Content work | Needs client email examples |
| | Process lead qualification questions → prompt rules | Content work | Needs client input |
| | Follow up with client on first batch of emails | Client dependency | — |

---

## Blocked Items (tracked, not actionable yet)

| Item | Blocked On | Expected Resolution |
|---|---|---|
| WhatsApp API credential | Meta App Review (Step 10) | 1–4 weeks |
| Instagram API credential | Meta App Review (Step 10) | 1–4 weeks |
| Knowledge base content (50+ real emails) | Client delivery | Follow up by end of Week 2 |
| Top 15 scenario templates | Client delivery | Follow up by end of Week 2 |

---

## What Comes Next (Week 3–4 preview)

After this foundation is verified, the next phases are:
- **Week 2 (Usama)**: Dashboard login page, auth flow, sidebar, Inbox Overview page, Draft Review page — all connected to Supabase test data
- **Week 3 (Usama)**: Leads page, Knowledge Base page, Settings page
- **Week 4 (Abdur Rehman)**: WF1 (Email Ingestion) + WF2 (Classification) — the core automation pipeline

No workflow or application code should be written until **every item in Step 14 is checked off**.
