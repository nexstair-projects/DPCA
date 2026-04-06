# Dream Paris Wedding — AI Communication Assistant

> **Project**: DPCA (Dream Paris Communication Assistant)
> **Client**: Dream Paris Wedding
> **Tech Lead**: Abdur Rehman (n8n / Backend / Integrations)
> **Frontend**: Usama (React Dashboard)
> **Stack**: n8n · Supabase · Pinecone · OpenAI GPT-4o · React · Node.js

---

## AI Behavior Layer

### Workflow Orchestration

#### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

#### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

#### 3. Self-Improvement Loop
- After ANY correction from the user: update tasks/lessons.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

#### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

#### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

#### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First**: Write plan to tasks/todo.md with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to tasks/todo.md
6. **Capture Lessons**: Update tasks/lessons.md after corrections

---

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Only touch what's necessary. No side effects with new bugs.

---

## Project Context

### What This System Does
An AI-powered communication assistant for Dream Paris Wedding that:
- Reads incoming messages from **Gmail**, **WhatsApp Business**, and **Instagram DMs**
- Classifies messages into 5 categories with priority levels
- Generates brand-voice-matched draft replies using **OpenAI GPT-4o**
- Routes drafts through an approval workflow (auto-send / approve-first / draft-only)
- Provides a React dashboard for reviewing, editing, and approving AI drafts
- Extracts and tracks leads from incoming inquiries
- Logs all activity for audit and continuous improvement

### What This System Does NOT Do
- Replace human judgment for complex or emotionally sensitive conversations
- Send responses autonomously for high-value inquiries without team review
- Operate as a public-facing chatbot or self-service widget

### Message Categories
| Category | Tier | Handling |
|---|---|---|
| New High-Value Inquiry | Tier 3 | ALWAYS human approval |
| Existing Client | Tier 2 | Draft shown to team; auto for simple follow-ups |
| Vendor Communication | Tier 2 | Semi-automated with templates |
| Collaboration Request | Tier 2 | Draft for human review |
| General Question | Tier 1 | Can be auto-replied with FAQ responses |

### Technology Stack
| Layer | Technology | Purpose |
|---|---|---|
| Workflow Automation | n8n (self-hosted) | Core engine — triggers, API calls, routing |
| AI Intelligence | OpenAI GPT-4o | Classification, drafting, tone matching |
| Email | Gmail API via n8n | Read inbox, create drafts, send replies |
| WhatsApp | Meta Cloud API via n8n | Receive/send WhatsApp Business messages |
| Instagram | Meta Graph API via n8n | Read/reply to Instagram DMs |
| Dashboard | React + Node.js | Approval interface for team |
| Database | Supabase (PostgreSQL) | Messages, drafts, leads, config, auth |
| Vector Store | Pinecone | Knowledge base embeddings for retrieval |
| Authentication | Supabase Auth | JWT-based team member auth |
| Hosting | VPS (Docker) | Self-hosted n8n + services |

### Security Rules (Non-Negotiable)
- ALL API credentials stored as environment variables — **never hardcoded**
- JWT authentication on dashboard — **never deploy without login protection**
- Row-level security (RLS) policies on all Supabase tables
- OAuth token refresh logic for Gmail — test regularly
- Rate limiting and retry logic on all external API calls
- Input sanitization on all user-facing endpoints
- HTTPS enforced on all connections
- Role-based access control: admin, manager, team_member

### File Structure Conventions
```
DPCA/
├── claude.md                  # This file — AI behavior + project context
├── ARCHITECTURE.md            # System architecture and component design
├── WORKFLOWS.md               # n8n workflow specifications
├── DATABASE_SCHEMA.md         # Supabase schema with RLS policies
├── PROMPTS.md                 # All AI prompt templates
├── info-docs/                 # Source reference documents
├── dashboard/                 # React frontend app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   └── contexts/
│   └── public/
├── backend/                   # Node.js API server
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── utils/
│   └── tests/
├── n8n-workflows/             # Exported n8n workflow JSONs
├── knowledge-base/            # Knowledge base source content
│   ├── email-examples/
│   ├── templates/
│   ├── brand-voice/
│   └── faqs/
├── scripts/                   # Deployment and utility scripts
└── docs/                      # Additional documentation
```

### Development Rules
- Build n8n workflows as **reusable templates** — easily duplicated for new clients
- Export all n8n workflows as JSON and **version-control** after each major update
- Dashboard must work on **desktop and mobile** browsers
- Each phase must be tested **end-to-end** before moving to the next
- Maintain a shared changelog — log every workflow change, update, and fix
- Use Cursor/Claude AI to accelerate code generation for API integration modules
