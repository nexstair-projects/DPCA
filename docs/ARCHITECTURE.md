# ARCHITECTURE.md — Dream Paris Wedding AI Communication Assistant

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL CHANNELS                                  │
│   ┌──────────┐    ┌──────────────────┐    ┌───────────────────┐            │
│   │  Gmail    │    │ WhatsApp Business │    │  Instagram DMs    │            │
│   │  API      │    │ Meta Cloud API    │    │  Meta Graph API   │            │
│   └────┬─────┘    └────────┬─────────┘    └─────────┬─────────┘            │
│        │                   │                        │                       │
└────────┼───────────────────┼────────────────────────┼───────────────────────┘
         │                   │                        │
         ▼                   ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        n8n WORKFLOW ENGINE                                   │
│                        (Self-hosted via Docker)                              │
│                                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  WF1:       │  │  WF2:        │  │  WF3:        │  │  WF4:          │  │
│  │  Email      │→ │  Classify    │→ │  KB Embed    │  │  Context       │  │
│  │  Ingestion  │  │  Message     │  │  (Pinecone)  │  │  Retrieval     │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  └────────────────┘  │
│                                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  WF5:       │  │  WF6:        │  │  WF7:        │  │  WF8:          │  │
│  │  Draft      │→ │  Auto-Send   │  │  Lead        │  │  Dashboard     │  │
│  │  Generation │  │              │  │  Extraction  │  │  Actions       │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  └────────────────┘  │
│                                                                             │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
┌──────────────────┐ ┌──────────┐ ┌──────────────┐
│   Supabase       │ │ Pinecone │ │  OpenAI      │
│   (PostgreSQL)   │ │ (Vector  │ │  GPT-4o API  │
│   + Auth + RLS   │ │  Store)  │ │              │
└──────────────────┘ └──────────┘ └──────────────┘
              ▲
              │
┌──────────────────────────────────────────────────┐
│           REACT DASHBOARD + NODE.js API           │
│                                                    │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐│
│  │  Inbox   │ │  Draft   │ │ Leads  │ │Settings││
│  │  Overview│ │  Review  │ │  Page  │ │  Page  ││
│  └──────────┘ └──────────┘ └────────┘ └────────┘│
└──────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Core Components

| Component | Technology | Responsibility |
|---|---|---|
| **Workflow Engine** | n8n (Docker) | Orchestrates all message flows, API calls, routing logic |
| **AI Intelligence** | OpenAI GPT-4o | Classification, draft generation, lead extraction, tone matching |
| **Primary Database** | Supabase (PostgreSQL) | Users, inboxes, messages, drafts, leads, config, audit logs |
| **Vector Store** | Pinecone | Knowledge base embeddings for semantic retrieval |
| **Auth Layer** | Supabase Auth | JWT-based authentication, role-based access control |
| **Frontend** | React.js | Approval dashboard, analytics, knowledge base management |
| **Backend API** | Node.js + Express | REST API bridging dashboard ↔ Supabase ↔ n8n webhooks |

### 2.2 External Integrations

| Service | API | Auth Method | Purpose |
|---|---|---|---|
| Gmail | Gmail REST API (v1) | OAuth 2.0 + Refresh Tokens | Read inbox, send replies, apply labels |
| WhatsApp | Meta Cloud API | Bearer Token (System User) | Receive/send WhatsApp Business messages |
| Instagram | Meta Graph API | Long-Lived Token | Read/reply to Instagram DMs |
| OpenAI | Chat Completions API | API Key | GPT-4o for classification, drafting, extraction |
| Pinecone | Pinecone REST API | API Key | Vector upsert, query for semantic search |

---

## 3. Message Flow Pipeline

```
  INCOMING MESSAGE
        │
        ▼
  ┌─────────────────┐
  │ WF1: INGESTION   │  Gmail trigger / Meta webhook
  │                   │  → Filter automated/spam
  │                   │  → Clean email body (strip HTML/signatures)
  │                   │  → Sender lookup (existing lead?)
  │                   │  → Store in messages table
  │                   │  → Apply Gmail label "AI-Processing"
  └────────┬──────────┘
           ▼
  ┌─────────────────┐
  │ WF2: CLASSIFY    │  GPT-4o classifies message
  │                   │  → Category: inquiry | client | vendor | collab | general
  │                   │  → Priority: high | medium | low
  │                   │  → Tier: 1 (auto) | 2 (approval) | 3 (human-only)
  │                   │  → Update message record
  │                   │  → Tier 3 → notify team via email
  └────────┬──────────┘
           ▼
  ┌─────────────────┐
  │ WF4: RETRIEVE    │  Build query from message context
  │                   │  → Generate query embedding via OpenAI
  │                   │  → Query Pinecone with metadata filters
  │                   │  → Return top-k relevant knowledge entries
  └────────┬──────────┘
           ▼
  ┌─────────────────┐
  │ WF5: DRAFT       │  Assemble prompt:
  │                   │    brand voice guide + retrieved context
  │                   │    + original message + instructions
  │                   │  → GPT-4o generates reply draft
  │                   │  → Store draft in drafts table
  │                   │  → Tier 1 → WF6 (auto-send)
  │                   │  → Tier 2 → dashboard queue + email notify
  │                   │  → Tier 3 → human-only (no draft)
  └────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌──────────┐ ┌──────────────────┐
│ WF6:     │ │ DASHBOARD        │
│ AUTO-SEND│ │ APPROVAL QUEUE   │
│          │ │                  │
│ Send via │ │ Team reviews     │
│ Gmail/   │ │ original + draft │
│ Meta API │ │ side-by-side     │
└──────────┘ └────────┬─────────┘
                      │
                      ▼
              ┌──────────────┐
              │ WF8: ACTIONS  │  Webhook receiver
              │               │  → Approve & Send
              │               │  → Edit & Send
              │               │  → Reject (with reason)
              │               │  → Regenerate draft
              │               │  → Reassign to team member
              └──────────────┘
```

---

## 4. Tiered Routing Logic

| Tier | Behavior | Categories | Approval |
|---|---|---|---|
| **Tier 1** | Auto-draft + Auto-send | General questions, simple FAQs | None required |
| **Tier 2** | Auto-draft + Require approval | Existing clients, vendors, collaborations | Dashboard review |
| **Tier 3** | Flag only — no draft generated | High-value inquiries, sensitive topics | Full human handling + email notification |

### Safety Rules
- **New inquiries with guest count > 20 or estimated value > €5,000** → always Tier 3
- **Messages mentioning cancellation, complaint, or legal** → always Tier 3
- **Messages from unknown senders with no classification match** → Tier 2 minimum
- **Confidence score below 70%** → escalate one tier up

---

## 5. Authentication & Authorization

### 5.1 Auth Flow
```
User → Login Page → Supabase Auth (email/password)
                          │
                          ▼
                    JWT issued → stored in httpOnly cookie
                          │
                          ▼
                    Every API request → JWT validated by middleware
                          │
                          ▼
                    Role extracted → RLS policies enforce data scope
```

### 5.2 Roles & Permissions

| Role | Pages | Actions |
|---|---|---|
| **admin** | All pages + Settings | Full CRUD, manage users, manage KB, configure rules, view all inboxes |
| **manager** | Inbox, Drafts, Leads, Analytics | Approve/reject/reassign, view all assigned inboxes, manage leads |
| **team_member** | Inbox, Drafts (assigned only) | Approve/reject own queue, view assigned inbox only |

### 5.3 Security Controls

| Control | Implementation |
|---|---|
| Authentication | Supabase Auth with JWT (httpOnly, Secure, SameSite=Strict) |
| Authorization | Role-based access control (RBAC) via Supabase RLS |
| API Security | Rate limiting (express-rate-limit), request validation (Joi/Zod) |
| Credential Storage | Environment variables via `.env` — never committed to VCS |
| Token Management | OAuth refresh tokens stored encrypted in Supabase |
| Transport Security | HTTPS enforced via reverse proxy (Nginx/Caddy) |
| Input Sanitization | DOMPurify for HTML content, parameterized queries via Supabase SDK |
| CORS | Strict origin whitelist — dashboard domain only |
| Audit Trail | All actions logged with user_id, timestamp, action_type in audit table |
| Webhook Security | n8n webhooks validated via HMAC signatures or shared secrets |

---

## 6. Infrastructure & Deployment

### 6.1 Server Architecture

```
┌─────────────────────────────────────────────┐
│              VPS (Ubuntu 22.04)              │
│              Minimum 2GB RAM                 │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │           Docker Compose               │  │
│  │                                        │  │
│  │  ┌──────────┐  ┌───────────────────┐  │  │
│  │  │  n8n     │  │  Node.js API      │  │  │
│  │  │  :5678   │  │  :3001            │  │  │
│  │  └──────────┘  └───────────────────┘  │  │
│  │                                        │  │
│  │  ┌──────────┐  ┌───────────────────┐  │  │
│  │  │  React   │  │  Nginx (reverse   │  │  │
│  │  │  (build) │  │  proxy + SSL)     │  │  │
│  │  │          │  │  :443             │  │  │
│  │  └──────────┘  └───────────────────┘  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Monitoring: UptimeRobot + auto-restart      │
└─────────────────────────────────────────────┘

External Services:
  ├── Supabase Cloud (PostgreSQL + Auth)
  ├── Pinecone Cloud (Vector Store)
  └── OpenAI API
```

### 6.2 Environment Variables

```env
# OpenAI
OPENAI_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Pinecone
PINECONE_API_KEY=
PINECONE_INDEX_NAME=
PINECONE_ENVIRONMENT=

# Gmail OAuth (per inbox)
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=

# Meta APIs
META_WHATSAPP_ACCESS_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=
META_INSTAGRAM_ACCESS_TOKEN=
META_APP_SECRET=

# n8n
N8N_BASIC_AUTH_USER=
N8N_BASIC_AUTH_PASSWORD=
N8N_WEBHOOK_URL=

# App
NODE_ENV=production
JWT_SECRET=
CORS_ORIGIN=
```

---

## 7. Dashboard Page Architecture

### 7.1 Page Map

| Page | Route | Role Access | Description |
|---|---|---|---|
| Login | `/login` | All | Supabase Auth email/password |
| Inbox Overview | `/inbox` | All | Summary stats, message list, filters, sorting |
| Draft Review | `/inbox/:messageId` | All | Split view: original + AI draft, action buttons |
| Leads | `/leads` | admin, manager | Lead table, detail view, status tracking, notes |
| Lead Detail | `/leads/:leadId` | admin, manager | Full lead info, AI summary, activity timeline |
| Knowledge Base | `/knowledge-base` | admin | Entries list, add/edit, bulk actions, embed stats |
| Settings | `/settings` | admin | Inbox mgmt, user mgmt, config editor, metrics |
| Analytics | `/analytics` | admin, manager | Performance charts, date ranges, export |

### 7.2 Dashboard Component Tree

```
App
├── AuthProvider (Supabase session)
├── ProtectedRoute (role guard)
├── Layout
│   ├── Sidebar
│   │   ├── Logo + AI Status Badge
│   │   ├── Navigation (role-filtered)
│   │   └── UserFooter (avatar + role)
│   ├── TopBar
│   │   ├── PageTitle
│   │   ├── PendingCount
│   │   └── ActionButtons (Refresh, Approve All Safe)
│   └── ContentArea
│       ├── InboxOverview
│       │   ├── StatsBar
│       │   ├── FilterTabs (All, Inquiry, Client, Vendor)
│       │   └── MessageList
│       │       └── MessageItem (sender, subject, preview, tags, status)
│       ├── DraftReview
│       │   ├── ReviewHeader (sender info + action buttons)
│       │   ├── SplitView
│       │   │   ├── OriginalMessage (read-only bubble)
│       │   │   └── AIDraft (editable textarea + confidence score)
│       │   └── MetaPanel
│       │       ├── Classification (category, priority, source, value)
│       │       ├── SendingModeSelector (auto / approve / draft-only)
│       │       └── TodayStats (pending, auto-sent, approved, tone score)
│       ├── LeadsPage
│       ├── KnowledgeBasePage
│       ├── SettingsPage
│       └── AnalyticsPage
```

---

## 8. Scalability Design

### 8.1 Scaling Strategy

| Concern | Strategy |
|---|---|
| **Multiple clients** | n8n workflows built as reusable templates; duplicate per client |
| **Message volume** | Queue system in n8n with retry logic; rate-limit-aware API calls |
| **Database growth** | Supabase PostgreSQL auto-scaling; indexed queries; archival strategy |
| **Vector store** | Pinecone serverless; partitioned by client namespace |
| **Dashboard users** | Supabase RLS scopes data per user/role; stateless JWT auth |
| **New channels** | Modular workflow design; add new trigger + channel adapter |

### 8.2 Performance Targets

| Metric | Target |
|---|---|
| Message ingestion latency | < 60 seconds from receipt |
| Classification + draft generation | < 30 seconds |
| Dashboard page load | < 2 seconds |
| API response time | < 500ms (p95) |
| System uptime | > 99.5% |

---

## 9. Error Handling & Monitoring

| Layer | Strategy |
|---|---|
| **n8n Workflows** | Try/catch on every node; errors logged to `errors_log` table; retry logic (3 attempts) with exponential backoff |
| **API Server** | Global error handler middleware; structured error responses; request ID tracking |
| **Dashboard** | Error boundaries per page; toast notifications for action failures |
| **External APIs** | Circuit breaker pattern; fallback to queue when API is down |
| **Monitoring** | UptimeRobot for uptime checks; auto-restart scripts; daily error digest emails |
| **Alerting** | Email notifications for Tier 3 messages, workflow failures, and auth anomalies |
