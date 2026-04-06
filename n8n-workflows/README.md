# n8n Workflows — DPCA

Structured JSON stubs for all 8 n8n workflows. Import into n8n and fill in credentials/parameters.

| File | Workflow | Trigger | Purpose |
|------|----------|---------|---------|
| `WF1-email-ingestion.json` | Email Ingestion | Schedule (2 min) | Poll Gmail, clean, store, label |
| `WF2-classification.json` | Classification | Webhook | GPT-4o classify + safety overrides |
| `WF3-kb-embedding.json` | KB Embedding | Webhook/manual | Generate embeddings, upsert Pinecone |
| `WF4-context-retrieval.json` | Context Retrieval | Webhook | Query Pinecone for relevant KB entries |
| `WF5-draft-generation.json` | Draft Generation | Webhook | GPT-4o generate reply using P1 brand voice |
| `WF6-auto-send.json` | Auto-Send | Webhook | Send via Gmail/WhatsApp/Instagram |
| `WF7-lead-extraction.json` | Lead Extraction | Webhook | GPT-4o extract structured lead data |
| `WF8-dashboard-actions.json` | Dashboard Actions | Webhook | Approve/reject/edit/regenerate/reassign |

## Import into n8n

1. Open n8n at http://localhost:5678
2. Go to **Workflows → Import from File**
3. Select each JSON file
4. Configure credentials (Gmail OAuth, OpenAI API key, Pinecone)
5. Update webhook URLs to point to your backend API (`http://host.docker.internal:3001/api/...`)
6. Activate workflows


## 🎯 The 8 n8n Workflows Explained

Here's how they work **end-to-end** to power DPCA:

---

### **WF1 — Email Ingestion** (The Entry Point)
```
Schedule (every 2 min) → Gmail API → Dedup Check → Store Message → Label Email → Trigger WF2
```
**What it does:**
- Every 2 minutes, polls your Gmail for unread emails
- Deduplicates based on `message_external_id` (skips if already in DB)
- Cleans the email, stores it in the `messages` table with status `"new"`
- Labels it `"AI-Processing"` and marks as read in Gmail
- **Triggers WF2** to start classification

**Why:** You need emails flowing into the system automatically.

---

### **WF2 — Classification** (Triage)
```
Webhook → Fetch Message → GPT-4o Classify → Apply Safety Rules → Store to DB → Route by Tier
```
**What it does:**
- GPT-4o reads the email body and **classifies it instantly**:
  - Category: `new_inquiry`, `existing_client`, `vendor`, `collaboration`, `general`
  - Priority: `high`, `medium`, `low`
  - **Tier 1** = auto-send (less risky)
  - **Tier 2** = draft for review
  - **Tier 3** = escalate to team (high-value, complex, risky)
- **Safety overrides** kick in:
  - Low confidence (<70%) → bump up a tier
  - High value (€5K+) or many guests → Tier 3
  - Keywords like "cancel", "complaint", "legal" → Tier 3
- **Routes** by tier:
  - **Tier 1** → auto-draft (WF5) + auto-send (WF6)
  - **Tier 2** → draft for review (awaits human approval in inbox)
  - **Tier 3** → flag for team, no auto-draft

**Why:** You need smart triage before you even write a response.

---

### **WF3 — KB Embedding** (Knowledge Base Indexing)
```
Webhook/Manual → Fetch KB Entry → Generate Embedding → Upsert to Pinecone → Mark Complete
```
**What it does:**
- Whenever you add/update an article in your **knowledge base** table
- Converts it to a **vector embedding** (think: numerical fingerprint of meaning)
- **Uploads the vector to Pinecone** (vector database) with metadata (title, category, ID)
- Marks the KB entry as "embedding_status: completed"

**Why:** So when you need to write a response, you can *find relevant knowledge instantly* via similarity search (next workflow).

---

### **WF4 — Context Retrieval** (Smart Knowledge Lookup)
```
Webhook → Embed Query → Search Pinecone → Assemble Context Block → Return
```
**What it does:**
- Called by WF5 (draft generation)
- **Converts the incoming email into a vector**
- **Searches Pinecone** for top-5 most similar KB entries
- Filters by category:
  - New inquiry → templates, email examples, FAQs, brand voice guides
  - Existing client → past email examples, processes
- **Assembles a 3000-token "context block"** of relevant info
- Returns: `{ context_text, source_ids[] }`

**Why:** The AI needs recent knowledge to write good responses. Instead of searching manually, this finds relevant info in milliseconds.

---

### **WF5 — Draft Generation** (AI Writer)
```
Webhook → Fetch Message → Call WF4 Context → GPT-4o Draft → Validate → Store → Route Tier 1
```
**What it does:**
- Called after WF2 classification
- **Fetches the full message** and its classification
- **Calls WF4** to get relevant KB context
- **GPT-4o writes a response** using:
  - System prompt: DPW brand voice rules (tone, language, style)
  - User prompt: classification + message + KB context + channel-specific rules
  - Temperature: 0.4 (creative but consistent)
- **Validates the draft**:
  - No placeholder text (e.g., "[INSERT DATE]")
  - Word count reasonable
  - Calculates tone confidence score
- **Stores to `drafts` table** with status `"pending_review"` or `"auto_approved"` (Tier 1)
- **If Tier 1 auto-approved** → immediately triggers WF6 to send

**Why:** You get AI-powered responses for every email, but they're validatable/editable before sending.

---

### **WF6 — Auto-Send** (Multi-Channel Sender)
```
Webhook → Fetch Draft → Route by Channel → Gmail/WhatsApp/Instagram → Report Result
```
**What it does:**
- Called by WF5 (Tier 1 auto) or WF8 (dashboard "approve & send")
- **Fetches the draft** (uses `edited_text` if human edited, else original)
- **Routes by channel**:
  - **Gmail**: replies in thread, labels with `"AI-Sent"`, 3 retries
  - **WhatsApp**: sends via Meta Cloud API
  - **Instagram**: sends via Meta Graph API
- **Reports back** to backend: `{ draft_id, success, sent_at }`
- Updates draft status to `"sent"` or `"send_failed"`

**Why:** One workflow handles all 3 channels, so you don't manage them separately.

---

### **WF7 — Lead Extraction** (CRM Integration)
```
Webhook → Fetch Message → GPT-4o Extract → Check Existing → Store Lead
```
**What it does:**
- Called by WF2 **only for `new_inquiry` category**
- **GPT-4o is a structured extractor**. It reads the email and outputs JSON:
  ```json
  {
    "client_names": ["Emma Holloway", "James"],
    "email": "emma@example.com",
    "phone": "+44...",
    "wedding_date": "2026-06-15",
    "guest_count": 85,
    "budget_range": "€15K-25K",
    "venue_preference": "chateau",
    "services_requested": ["planning", "coordination"],
    "ai_summary": "High-value inquiry..."
  }
  ```
- **Checks if the email already exists** in the `leads` table
  - If yes: updates the existing lead
  - If no: creates new lead
- **Stores to `leads` table** with status `"new"` and all extracted data

**Why:** You automatically build a CRM database without manual data entry.

---

### **WF8 — Dashboard Actions** (Human Feedback Loop)
```
Webhook (from backend) → Route by Action → Approve/Edit/Reject/Regenerate/Reassign → Audit Log
```
**What it does:**
- When you click a button in the **dashboard inbox**, the backend sends a webhook here
- **5 possible actions**:

  1. **Approve & Send**
     - Mark draft as `"approved"`
     - Trigger WF6 to send immediately
  
  2. **Edit & Send**
     - Save your edits to the draft
     - Trigger WF6 with the edited text
  
  3. **Reject**
     - Mark draft as `"rejected"`
     - Log rejection reason in `audit_log`
  
  4. **Regenerate**
     - GPT-4o rewrites the draft using:
       - Your feedback/instructions
       - Previous draft (for tone consistency)
       - Original message + KB context
     - Creates a *new draft row* (version 2, 3, etc.)
  
  5. **Reassign**
     - Assign draft to another team member
     - Optional: notify them

- **All actions are audited** → logs to `audit_log` table

**Why:** Your humans stay in control—they can quickly approve, edit, reject, or ask for rewrites, all tracked.

---

## 📊 The Full Loop

```
📧 Email arrives in Gmail
    ↓
WF1: Ingest → deduplicate → store message
    ↓
WF2: Classify → category/priority/tier + safety checks
    ├─→ Tier 1: Auto-draft + auto-send
    ├─→ Tier 2: Draft for review (inbox)
    └─→ Tier 3: Escalate to team, no auto
    ↓ (if new_inquiry)
WF7: Extract lead data → store in CRM
    ↓ (if Tier 1 or 2)
WF5: Generate draft
    ├─→ WF4: Fetch relevant KB
    └─→ GPT-4o writes response
    ↓ (if Tier 1)
WF6: Auto-send via Gmail/WhatsApp/Instagram
    ↓ (if Tier 2)
⏸️ Draft awaits human in dashboard
    ↓ (human clicks "Approve & Send")
WF8: Dashboard action → WF6 sends or WF5 regenerates
    ↓
✅ Message sent + audit logged
```

---

## 🔧 Key Configuration Points

When you import into n8n, you'll need to set:

1. **Gmail OAuth** (WF1, WF6) — connect your Gmail account
2. **OpenAI API key** (WF2, WF4, WF5, WF7, WF8) — for GPT-4o
3. **Pinecone API key** (WF3, WF4) — for vector search
4. **Meta Cloud API credentials** (WF6) — for WhatsApp/Instagram
5. **Webhook URLs** — point all `httpRequest` nodes to your backend at `http://host.docker.internal:3001/api/...`
6. **Supabase connection** — for database reads/writes (in the HTTP nodes that call your backend)

The **backend API** (Express.js on :3001) is your gateway—it handles all webhook callbacks and database operations.

Does this make sense now?