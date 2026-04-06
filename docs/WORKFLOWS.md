# WORKFLOWS.md — n8n Workflow Specifications

> All workflows run on a self-hosted n8n instance via Docker.
> Each workflow is exported as JSON and version-controlled in `/n8n-workflows/`.
> Workflows are built as reusable templates — duplicable per client.

---

## Workflow Index

| ID | Name | Trigger | Purpose | Phase |
|---|---|---|---|---|
| WF1 | Email Ingestion | Gmail trigger (polling) | Ingest, clean, store incoming emails | Week 4 |
| WF2 | Message Classification | Called by WF1 | Classify category, priority, tier | Week 4 |
| WF3 | Knowledge Base Embedding | Manual / Dashboard trigger | Embed KB entries into Pinecone | Week 5 |
| WF4 | Context Retrieval | Called by WF5 | Semantic search for relevant KB context | Week 5 |
| WF5 | Draft Response Generation | Called after WF2 + WF4 | Generate AI draft reply | Week 6 |
| WF6 | Auto-Send | Called by WF5 (Tier 1) | Send approved/auto responses via Gmail/Meta | Week 7 |
| WF7 | Lead Extraction | Called after WF2 | Extract lead details from messages | Week 7 |
| WF8 | Dashboard Actions | Webhook (from dashboard) | Handle approve/edit/reject/regenerate/reassign | Week 7 |

---

## WF1: Email Ingestion

### Purpose
Poll Gmail inboxes for new messages, filter out automated/spam emails, clean message body, enrich sender data, store in Supabase, and apply Gmail labels.

### Trigger
- **Type**: Gmail Trigger Node (polling every 2–5 minutes)
- **Scope**: Configured per inbox (duplicate workflow per inbox)

### Flow
```
Gmail Trigger (new email)
    │
    ▼
Filter Node — skip if:
  ├── From address in exclusion list
  ├── Subject matches auto-reply patterns (Out of Office, Delivery Status, etc.)
  ├── From address contains "noreply", "mailer-daemon", "no-reply"
  └── Already processed (check message_id in DB)
    │
    ▼
Clean Email Body
  ├── Strip HTML tags, preserve text structure
  ├── Remove email signatures (regex pattern matching)
  ├── Remove quoted reply chains
  ├── Truncate to max 3000 characters
  └── Extract: subject, from_email, from_name, date, message_id, thread_id
    │
    ▼
Sender Lookup (Supabase query)
  ├── Check leads table by email
  ├── Check messages table for previous correspondence
  └── Flag: is_known_sender, sender_type (lead/client/vendor/unknown)
    │
    ▼
Store in Supabase → messages table
  ├── inbox_id, channel: 'gmail'
  ├── sender_email, sender_name
  ├── subject, body_raw, body_clean
  ├── received_at, message_external_id, thread_id
  ├── is_known_sender, sender_type
  ├── status: 'received'
  └── classification_status: 'pending'
    │
    ▼
Apply Gmail Label → "AI-Processing"
    │
    ▼
Trigger WF2 (Message Classification) with message_id
```

### Error Handling
- Gmail API failure → retry 3x with exponential backoff (2s, 8s, 32s)
- Supabase write failure → log to `errors_log` table, skip message, continue polling
- Duplicate detection → check `message_external_id` uniqueness before insert

### Security
- OAuth 2.0 tokens refreshed automatically; refresh token stored encrypted in Supabase
- Email body sanitized before storage (strip scripts, event handlers)

---

## WF2: Message Classification

### Purpose
Use GPT-4o to classify each incoming message by category, priority, and routing tier.

### Trigger
- **Type**: Called by WF1 (sub-workflow) or webhook

### Input
```json
{
  "message_id": "uuid",
  "body_clean": "string",
  "subject": "string",
  "sender_name": "string",
  "sender_email": "string",
  "is_known_sender": "boolean",
  "sender_type": "string"
}
```

### Flow
```
Receive message data
    │
    ▼
OpenAI Chat Completion (GPT-4o)
  ├── System prompt: Classification prompt (see PROMPTS.md)
  ├── User message: subject + body_clean + sender context
  └── Response format: structured JSON
    │
    ▼
Parse JSON Response
  ├── category: "new_inquiry" | "existing_client" | "vendor" | "collaboration" | "general"
  ├── priority: "high" | "medium" | "low"
  ├── confidence: 0.0 – 1.0
  ├── tier: 1 | 2 | 3
  ├── estimated_value: number | null
  ├── guest_count: number | null
  └── reasoning: "string" (short explanation)
    │
    ▼
Safety Rules Override
  ├── IF confidence < 0.70 → escalate tier by 1
  ├── IF category == "new_inquiry" AND (estimated_value > 5000 OR guest_count > 20) → tier = 3
  ├── IF body contains "cancel|complaint|legal|refund|dispute" → tier = 3
  └── IF sender_type == "unknown" AND tier == 1 → tier = 2
    │
    ▼
Update Supabase → messages table
  ├── category, priority, tier, confidence
  ├── estimated_value, guest_count
  ├── classification_status: 'classified'
  └── classified_at: now()
    │
    ▼
Route by Tier
  ├── Tier 1 → Trigger WF4 + WF5 (auto-draft pipeline)
  ├── Tier 2 → Trigger WF4 + WF5 (draft for approval)
  └── Tier 3 → Send notification email to team + Trigger WF7 (lead extraction only)
```

### Performance
- Target: classification in < 5 seconds
- Token usage: ~500–800 tokens per classification call

---

## WF3: Knowledge Base Embedding

### Purpose
Generate vector embeddings for knowledge base entries and upsert them into Pinecone for semantic retrieval.

### Trigger
- **Type**: Manual trigger from dashboard KB page, or on new KB entry insert

### Flow
```
Receive KB entry (or batch)
    │
    ▼
Prepare Embedding Text
  ├── Combine: title + category + content
  ├── Truncate to max 8000 characters
  └── Clean formatting artifacts
    │
    ▼
OpenAI Embeddings API
  ├── Model: text-embedding-3-small
  ├── Input: prepared text
  └── Output: 1536-dimension vector
    │
    ▼
Pinecone Upsert
  ├── id: kb_entry_id
  ├── values: embedding vector
  └── metadata:
      ├── category (brand_voice | template | email_example | faq | vendor | process)
      ├── subcategory
      ├── title
      └── updated_at
    │
    ▼
Update Supabase → knowledge_base table
  ├── embedding_status: 'embedded'
  ├── embedded_at: now()
  └── pinecone_id: id
```

### Batch Processing
- Process in batches of 20 entries
- Rate-limit aware: max 60 requests/min to OpenAI Embeddings API
- Retry failed embeddings after full batch completes

---

## WF4: Context Retrieval

### Purpose
Given a message, find the most relevant knowledge base entries from Pinecone to provide context for draft generation.

### Trigger
- **Type**: Called by WF5 as sub-workflow

### Input
```json
{
  "message_id": "uuid",
  "body_clean": "string",
  "subject": "string",
  "category": "string",
  "priority": "string"
}
```

### Flow
```
Build Query Text
  ├── Combine: subject + first 500 chars of body_clean
  └── Add category hint for better matching
    │
    ▼
OpenAI Embeddings API
  ├── Model: text-embedding-3-small
  └── Input: query text
    │
    ▼
Pinecone Query
  ├── vector: query embedding
  ├── topK: 5
  ├── filter:
  │   ├── category IN relevant categories based on message category
  │   └── (optional) subcategory filter
  └── includeMetadata: true
    │
    ▼
Format Retrieved Context
  ├── Extract text content for each match
  ├── Include similarity scores
  ├── Order by relevance
  └── Combine into context block (max 3000 tokens)
    │
    ▼
Return context to calling workflow
```

### Metadata Filter Mapping

| Message Category | KB Categories to Search |
|---|---|
| new_inquiry | template, email_example, faq, brand_voice |
| existing_client | email_example, template, process |
| vendor | vendor, template |
| collaboration | email_example, template |
| general | faq, template, brand_voice |

---

## WF5: Draft Response Generation

### Purpose
Assemble a full prompt with brand voice, retrieved context, and the original message, then generate an AI draft reply via GPT-4o.

### Trigger
- **Type**: Called after WF2 classification + WF4 context retrieval

### Flow
```
Receive: message data + retrieved KB context + classification
    │
    ▼
Assemble Prompt
  ├── System: Brand voice system prompt (see PROMPTS.md)
  ├── Context: Retrieved KB entries (from WF4)
  ├── Message: Original message with metadata
  └── Instructions: Category-specific generation rules
    │
    ▼
OpenAI Chat Completion (GPT-4o)
  ├── model: "gpt-4o"
  ├── temperature: 0.4 (consistent but not robotic)
  ├── max_tokens: 800
  └── response: draft reply text
    │
    ▼
Post-Process Draft
  ├── Add signature block (from system_config)
  ├── Validate: no placeholder text like [INSERT_NAME]
  ├── Validate: no hallucinated details not in source
  └── Calculate tone_confidence score (0–100)
    │
    ▼
Store in Supabase → drafts table
  ├── message_id (FK)
  ├── draft_text
  ├── model_used: "gpt-4o"
  ├── prompt_tokens, completion_tokens
  ├── tone_confidence
  ├── context_sources (array of KB entry IDs used)
  ├── status: 'pending_review' | 'auto_approved'
  └── created_at
    │
    ▼
Route by Tier
  ├── Tier 1 → set status 'auto_approved' → Trigger WF6 (auto-send)
  ├── Tier 2 → set status 'pending_review' → Send notification email
  └── Tier 3 → no draft generated (message flagged for human handling)
```

### Token Budget
- System prompt: ~800 tokens
- Context block: ~1500 tokens max
- Message: ~500 tokens
- Total input: ~2800 tokens
- Output: ~400 tokens
- **Cost estimate**: ~$0.02–0.04 per draft (GPT-4o pricing)

---

## WF6: Auto-Send

### Purpose
Send approved or auto-approved draft responses through the correct channel API.

### Trigger
- **Type**: Called by WF5 (Tier 1) or WF8 (after dashboard approval)

### Flow
```
Receive: draft_id + message_id + channel
    │
    ▼
Fetch Draft + Original Message from Supabase
    │
    ▼
Route by Channel
  ├── Gmail → Gmail API: create reply in thread
  │   ├── To: original sender_email
  │   ├── Subject: Re: original_subject
  │   ├── Body: draft_text (HTML formatted)
  │   ├── Thread-Id: original thread_id
  │   └── Apply label: "AI-Sent"
  │
  ├── WhatsApp → Meta Cloud API: send message
  │   ├── To: sender phone number
  │   ├── Type: text
  │   └── Body: draft_text (plain text)
  │
  └── Instagram → Meta Graph API: send reply
      ├── To: sender IGSID
      └── Message: draft_text (plain text)
    │
    ▼
Update Supabase
  ├── drafts: status → 'sent', sent_at, sent_by
  ├── messages: status → 'replied', replied_at
  └── Apply Gmail label: "AI-Sent" (remove "AI-Processing")
```

### Error Handling
- API send failure → retry 3x → if still fails, set draft status to 'send_failed', alert team
- Token expired → trigger OAuth refresh, retry once
- Rate limit hit → queue message, retry after backoff period

---

## WF7: Lead Extraction

### Purpose
Extract structured lead information from incoming messages using GPT-4o and store/update in the leads table.

### Trigger
- **Type**: Called by WF2 after classification (for new_inquiry and collaboration categories)

### Flow
```
Receive: message data + classification
    │
    ▼
OpenAI Chat Completion (GPT-4o)
  ├── System prompt: Lead extraction prompt (see PROMPTS.md)
  └── Extract:
      ├── client_names (array)
      ├── email
      ├── phone (if mentioned)
      ├── location (city/country)
      ├── wedding_date (estimated)
      ├── guest_count (estimated)
      ├── budget_range (if mentioned)
      ├── venue_preference
      ├── services_requested (array)
      ├── how_found_us
      └── ai_summary (2-3 sentence summary)
    │
    ▼
Check Existing Leads (Supabase query by email)
  ├── If new → INSERT into leads table
  └── If existing → UPDATE with new details, append to activity timeline
    │
    ▼
Send Notification Email (for new high-value leads)
  ├── To: assigned team member or all admins
  └── Content: lead summary + link to dashboard
```

---

## WF8: Dashboard Actions

### Purpose
Receive webhook calls from the React dashboard and execute the requested action on a draft.

### Trigger
- **Type**: n8n Webhook node
- **Security**: Validated via JWT token in Authorization header + HMAC signature

### Endpoints

| Action | Method | Path | Payload |
|---|---|---|---|
| Approve & Send | POST | `/webhook/action/approve` | `{ draft_id, user_id }` |
| Edit & Send | POST | `/webhook/action/edit-send` | `{ draft_id, user_id, edited_text }` |
| Reject | POST | `/webhook/action/reject` | `{ draft_id, user_id, reason }` |
| Regenerate | POST | `/webhook/action/regenerate` | `{ draft_id, user_id, instructions }` |
| Reassign | POST | `/webhook/action/reassign` | `{ draft_id, user_id, assign_to }` |

### Flow per Action

**Approve & Send:**
```
Validate JWT → Fetch draft → Update status 'approved' → Trigger WF6 → Log action
```

**Edit & Send:**
```
Validate JWT → Fetch draft → Store edit (preserve original) → Update draft_text
→ Update status 'edited_approved' → Trigger WF6 → Log action
```

**Reject:**
```
Validate JWT → Fetch draft → Update status 'rejected' → Store rejection reason
→ Update message status 'needs_human_reply' → Log action
```

**Regenerate:**
```
Validate JWT → Fetch original message → Re-trigger WF4 + WF5 with optional instructions
→ Store new draft (version incremented) → Log action
```

**Reassign:**
```
Validate JWT → Fetch draft → Update assigned_to → Send notification email to new assignee
→ Log action
```

### Audit Logging
Every action is logged to the `audit_log` table:
```json
{
  "action_type": "approve | edit_send | reject | regenerate | reassign",
  "user_id": "uuid",
  "draft_id": "uuid",
  "message_id": "uuid",
  "metadata": {},
  "created_at": "timestamp"
}
```

---

## Workflow Duplication Guide

When onboarding a new client or adding a new inbox:

1. **Duplicate WF1** → Update Gmail trigger credentials for new inbox
2. **Update inbox_id** reference in the duplicated workflow
3. **WF2–WF8** are shared (multi-tenant by inbox_id) — no duplication needed
4. **Add inbox record** in Supabase `inboxes` table
5. **Store OAuth tokens** for the new inbox
6. **Test end-to-end**: send test email → verify appears in dashboard → approve → verify sent

---

## Workflow Monitoring Checklist

| Check | Frequency | Tool |
|---|---|---|
| All workflows running (no stuck executions) | Every 4 hours | n8n execution log |
| Gmail polling active for all inboxes | Daily | n8n trigger status |
| Classification accuracy > 90% | Weekly | Dashboard analytics |
| Draft approval rate > 85% | Weekly | Dashboard analytics |
| Error log entries < 2/week | Weekly | `errors_log` table |
| OAuth tokens valid | Weekly | Automated test ping |
| Pinecone index healthy | Weekly | Pinecone dashboard |
| API rate limits not being hit | Daily | n8n execution log |
