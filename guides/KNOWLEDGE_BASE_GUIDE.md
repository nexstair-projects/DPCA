# Knowledge Base Guide
# How the DPCA Knowledge Base is Prepared, Stored, and Used

---

## Table of Contents

1. [What is the Knowledge Base and Why Does It Exist?](#1-what-is-the-knowledge-base-and-why-does-it-exist)
2. [The Big Picture — Where KB Fits in the Pipeline](#2-the-big-picture--where-kb-fits-in-the-pipeline)
3. [The Two Places KB Lives](#3-the-two-places-kb-lives)
4. [Knowledge Base Categories](#4-knowledge-base-categories)
5. [How to Write a Good KB Entry](#5-how-to-write-a-good-kb-entry)
6. [The Import Pipeline — Step by Step](#6-the-import-pipeline--step-by-step)
7. [How Retrieval Works When Drafting](#7-how-retrieval-works-when-drafting)
8. [The Category Filter Rule (Rule 4)](#8-the-category-filter-rule-rule-4)
9. [How the AI Uses the Retrieved Context](#9-how-the-ai-uses-the-retrieved-context)
10. [Adding New KB Entries](#10-adding-new-kb-entries)
11. [Improving Existing KB Entries](#11-improving-existing-kb-entries)
12. [What Makes a Bad KB Entry](#12-what-makes-a-bad-kb-entry)
13. [Full Flow Diagram](#13-full-flow-diagram)

---

## 1. What is the Knowledge Base and Why Does It Exist?

The DPCA AI drafts replies to emails on behalf of Dream Paris Wedding. To do that well, it needs more than just a writing style — it needs to know the **actual content**: what services are offered, what things cost, what the booking process looks like, how to handle different types of couples.

This is where the Knowledge Base (KB) comes in. It is a collection of documents that act as the AI's long-term memory about the business. Every time the AI writes a draft, it first searches the KB for the most relevant pieces of information and injects them into the prompt as context.

Think of it this way:
- **System prompts** (P1–P6 in `system_config`) tell the AI *how* to write and *what rules* to follow.
- **The Knowledge Base** tells the AI *what to say* — the actual business content.

Without the KB, the AI would produce well-written responses that might contain invented facts about pricing, made-up venue names, or generic advice. With the KB, it grounds its responses in real, curated information about Dream Paris Wedding.

---

## 2. The Big Picture — Where KB Fits in the Pipeline

When a new email arrives and the AI is asked to draft a reply, this is the sequence:

```
1. New email arrives
2. AI classifies the email (category: new_inquiry, existing_client, vendor, etc.)
3. Draft generator starts
4. It looks up the category and decides which KB categories are allowed
5. It calls the retrieval service with a query + allowed category filter
6. Retrieval embeds the query → searches Pinecone → fetches top 5 matching KB entries
7. The KB content is formatted and injected into the Claude prompt as context
8. Claude drafts the reply using the KB content as its knowledge source
9. The draft is sanitised, tone-checked, and saved
```

Step 4–6 is the knowledge base in action. The rest of the pipeline handles writing quality, safety, and routing.

---

## 3. The Two Places KB Lives

Every KB entry exists in **two places simultaneously**:

### Supabase (PostgreSQL) — the source of truth
Table: `knowledge_base`

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Unique identifier |
| `title` | text | Human-readable name of the entry |
| `content` | text | The actual text content |
| `category` | text | One of 6 allowed categories |
| `subcategory` | text | Optional further classification |
| `embedding_status` | text | `pending`, `embedded`, or `failed` |
| `created_by` | UUID | User who created it |
| `updated_at` | timestamp | Last modified |

This is where you manage KB entries — edit, delete, add, search.

### Pinecone (Vector Database) — the search index
Pinecone stores a **mathematical representation** (vector) of each KB entry's meaning. When the AI searches for "pricing information for a château wedding", Pinecone finds the entries whose meaning is most similar, even if the exact words don't match.

The Pinecone record for each entry contains:
- **id** — same UUID as Supabase
- **values** — 1536 floating point numbers (the embedding vector)
- **metadata** — `{ kb_id, title, category }` — used for filtering

Both databases must stay in sync. If you add an entry to Supabase but don't embed it, Pinecone won't find it. If you delete an entry from Supabase, you should also delete it from Pinecone.

---

## 4. Knowledge Base Categories

The KB is divided into 6 categories. Each category serves a specific purpose in the drafting process:

### `template`
**What it is:** Skeleton email structures showing the shape and structure of different reply types.

**What it does:** Gives the AI a proven structure to follow. Rather than inventing the structure of a new inquiry response from scratch, the AI sees "this is roughly how these replies look and flow."

**Examples:**
- Response to new inquiry
- Existing client check-in
- Vendor collaboration response
- Fully booked / waitlist response

### `email_example`
**What it is:** Real or realistic complete email examples — full tone, full content, representative of Dream Paris Wedding's voice.

**What it does:** Shows the AI exactly how polished, on-brand emails look in practice. Templates show structure; examples show voice and texture. The AI uses these to calibrate warmth, length, and vocabulary.

**Examples:**
- Warm response to a new inquiry
- Graceful decline when not a fit
- Qualification follow-up questions
- Planning update to existing client

### `faq`
**What it is:** Question-and-answer documents covering what clients and vendors typically ask.

**What it does:** Provides factual answers the AI can draw on when a question in the email matches a known FAQ. Without this, the AI would either invent facts or give vague non-answers.

**Examples:**
- What services do you offer?
- What does a Paris wedding cost?
- What are the best seasons?
- Are you available for destination travel?

### `qualification`
**What it is:** Internal guidance on how to assess whether an inquiry is a good fit, what signals to look for, and what questions to ask.

**What it does:** Helps the AI understand when to encourage vs. gently redirect. When a new inquiry comes in, qualification content helps the draft ask the right questions or set appropriate expectations.

**Examples:**
- Lead scoring criteria (budget, guest count, date)
- Qualification questions to ask in a reply
- How to handle a borderline inquiry

### `process`
**What it is:** Step-by-step documentation of internal workflows — how booking works, the legal requirements for marrying in France, the planning phases.

**What it does:** Lets the AI give accurate, specific information about how things actually work rather than generic "we'll be in touch" language. An existing client asking what happens next gets a real answer based on process documentation.

**Examples:**
- The 7-phase booking workflow (Discovery → Wedding Day → After)
- French legal requirements for foreign nationals
- What to expect at each planning stage

### `vendor`
**What it is:** Templates and examples specific to vendor/supplier communication.

**What it does:** Vendor emails have a distinct tone — more B2B, less emotionally intimate than client emails. This category keeps those communications appropriate and on-brand.

**Examples:**
- Partnership inquiry response
- Polite decline of a vendor approach
- Collaboration proposal

---

## 5. How to Write a Good KB Entry

Every KB file in `kb-data/` uses a frontmatter header followed by the content:

```markdown
---
title: "FAQ: What Does a Paris Wedding Cost?"
category: "faq"
---

Your content here...
```

### The title
The title is embedded alongside the content. It matters for search quality. A good title:
- Clearly states what the entry covers
- Uses the format `Category: Specific Topic` (e.g. `Template: Response to New Inquiry`)
- Is specific enough to distinguish from other entries

Bad: `"Pricing"` — too vague, doesn't tell the AI what kind of pricing information this is

Good: `"FAQ: Pricing and Budget for Paris Weddings"` — the AI knows to pull this when a client asks about cost

### The content
- Write in the brand voice (warm, elegant, first-person plural for templates/examples)
- Be specific — actual figures, actual steps, actual language
- Keep entries focused on one topic — the AI retrieves the top 5 most relevant entries; one densely packed entry covering 10 topics will perform worse than 10 focused entries
- Length: 200–600 words is ideal per entry. Long enough to be useful, short enough to stay focused

### What to include vs. leave out
- Include facts that might change rarely (venue types, service descriptions, legal requirements)
- Do not hardcode things that change frequently (staff names, specific prices, specific supplier names) — or if you do, set a reminder to review quarterly
- Do not include anything that violates the commission/pricing rules (Rule 3) — the commission sanitiser will catch it in the draft, but it is better not to put problematic content in the KB at all

---

## 6. The Import Pipeline — Step by Step

This is the journey from a markdown file in `kb-data/` to a searchable entry in Pinecone.

### Step 1 — Write the markdown file
Create a `.md` file in `kb-data/` with the correct frontmatter (title + category). Write the content.

```
kb-data/faq-pricing-and-budget.md
```

### Step 2 — Run the import script
```bash
cd d:\workspace\DPCA
npx ts-node --project backend/tsconfig.json scripts/kb-import.ts
```

The script does the following for each file:

**2a. Parse the frontmatter**
It reads the `---` block and extracts `title` and `category`. If either is missing, the file is skipped with a warning.

**2b. Upsert into Supabase**
It calls Supabase to insert the entry into the `knowledge_base` table. The upsert uses `title` as the conflict key — re-running the script will update the content of existing entries rather than creating duplicates.

```sql
INSERT INTO knowledge_base (title, category, content, embedding_status)
VALUES (...)
ON CONFLICT (title) DO UPDATE SET content = ..., embedding_status = 'pending'
```

After this step, the entry exists in Supabase but Pinecone does not know about it yet (`embedding_status = 'pending'`).

**2c. Call the embed endpoint**
The script calls `POST /api/internal/embed-kb` with the `kb_id`:

```json
{ "kb_id": "uuid-from-supabase" }
```

This triggers the `embedKbEntry()` service in the backend.

### Step 3 — The embed service runs

`backend/src/services/embedder.ts` does three things:

**3a. Fetch the entry from Supabase**
Reads `title` and `content` for the given `kb_id`.

**3b. Create the embedding via OpenAI**
Concatenates `title + '\n\n' + content` and sends it to `text-embedding-3-small`:

```
"FAQ: Pricing and Budget for Paris Weddings

A Paris or Île-de-France destination wedding typically ranges..."
```

OpenAI returns a vector of 1536 numbers that mathematically represents the meaning of this text.

**3c. Upsert the vector into Pinecone**
The vector plus metadata is stored in Pinecone:

```json
{
  "id": "uuid",
  "values": [0.023, -0.14, 0.77, ...],
  "metadata": {
    "kb_id": "uuid",
    "title": "FAQ: Pricing and Budget",
    "category": "faq"
  }
}
```

**3d. Mark as embedded in Supabase**
Updates `embedding_status = 'embedded'` so the import script can track which entries are done.

### Step 4 — The entry is now searchable
From this point, any time the AI drafts a reply that might involve pricing, Pinecone will be able to find and return this entry.

---

## 7. How Retrieval Works When Drafting

When `generateDraft()` runs, it calls `retrieveContext()` from `retrieval.ts`. Here is exactly what happens:

### 7a. Build the search query
The query is constructed from the incoming message — typically the subject line and body text. This is the "what are we looking for?" input.

### 7b. Embed the query
The query text is sent to OpenAI `text-embedding-3-small` and converted into a 1536-dimensional vector. This is now a point in the same mathematical space as all the KB entry vectors.

### 7c. Filter by allowed categories (Rule 4 — see Section 8)
Based on the message category, only certain KB categories are searched. This prevents, for example, vendor templates from appearing in a new client inquiry response.

### 7d. Query Pinecone
Pinecone receives:
- The query vector (what we're looking for)
- A category filter (which entries to search)
- `topK: 5` (return the 5 closest matches)

Pinecone computes the cosine similarity between the query vector and every stored vector in the allowed categories. The 5 entries with the highest similarity scores are returned.

### 7e. Hydrate from Supabase
The Pinecone results contain metadata but not the full content. The retrieval service takes the returned `kb_id` values and fetches the full content from Supabase:

```sql
SELECT id, title, content, category
FROM knowledge_base
WHERE id IN ('uuid1', 'uuid2', 'uuid3', 'uuid4', 'uuid5')
```

### 7f. Format as context text
The entries are joined into a single context string:

```
[1] FAQ: Pricing and Budget for Paris Weddings
A Paris or Île-de-France destination wedding typically ranges...

[2] Template: Response to New Inquiry
Thank you so much for reaching out to Dream Paris Wedding...
```

This `context_text` is injected into the Claude prompt.

---

## 8. The Category Filter Rule (Rule 4)

This is one of the critical brand-safety rules. The AI must only retrieve KB entries that are relevant to the type of message it is responding to. The mapping is hardcoded in `backend/src/services/retrieval.ts`:

| Message Category | Allowed KB Categories |
|---|---|
| `new_inquiry` | `template`, `email_example`, `faq`, `qualification` |
| `existing_client` | `email_example`, `template`, `process` |
| `vendor` | `vendor`, `template` |
| `collaboration` | `email_example`, `template` |
| `general` | `faq`, `template` |

**Why this matters:**

Imagine a vendor sends an inquiry. Without filtering, the AI might retrieve a `qualification` entry about budget thresholds for clients and accidentally include that context in a vendor reply — giving a vendor inappropriate information about how Dream Paris Wedding evaluates client budgets.

Or if an existing client asks about their timeline, without filtering the AI might retrieve a `vendor` template and start writing in a B2B tone.

The filter ensures the AI always retrieves contextually appropriate knowledge.

---

## 9. How the AI Uses the Retrieved Context

Inside the Claude prompt (P3 — new inquiry, or P5 — regeneration), the context is injected like this:

```
--- RETRIEVED KNOWLEDGE BASE CONTEXT ---
[1] Template: Response to New Inquiry
Thank you so much for reaching out to Dream Paris Wedding...

[2] FAQ: Pricing and Budget
A Paris wedding typically ranges from €25,000...
---

Using the above context, draft a reply to the following email:
[EMAIL CONTENT]
```

The AI reads the KB context as reference material. It does not copy it verbatim — it uses it to:
- Know what to say about pricing without inventing figures
- Follow the right structural pattern for this type of email
- Match the tone and language of the email examples
- Answer specific questions accurately using FAQ content

The AI is instructed in the system prompt (P1 — brand voice) to use the context as a guide, not a script, and to always personalise the reply to the specific email it is responding to.

---

## 10. Adding New KB Entries

When the business evolves — new services, new venues, new pricing, new processes — add a new KB file:

1. Create a new `.md` file in `kb-data/` with the correct frontmatter
2. Run the import script:
   ```bash
   npx ts-node --project backend/tsconfig.json scripts/kb-import.ts
   ```
3. The script inserts the entry into Supabase and calls the embed endpoint
4. The new entry is immediately available for retrieval

You do not need to re-embed existing entries when you add new ones.

---

## 11. Improving Existing KB Entries

If you notice the AI is giving wrong or outdated information, the fix is to update the KB entry:

1. Edit the relevant `.md` file in `kb-data/`
2. Re-run the import script
3. Because the script uses `ON CONFLICT (title)`, it will update the content in Supabase and re-embed the entry with a fresh vector

The old vector in Pinecone is overwritten by the new upsert (same `id`).

If you change a file's **title** in the frontmatter, the script will insert it as a new entry rather than updating the old one. In that case, manually delete the old entry from both Supabase and Pinecone.

---

## 12. What Makes a Bad KB Entry

Avoid these patterns:

**Too broad** — An entry titled "Everything About Dream Paris Wedding" that covers services, pricing, seasons, legal requirements, and vendor policy in one document. Pinecone will retrieve it for almost every query, and the AI will get confused signal from the mixing of unrelated information.

**Too vague** — An entry that says "we offer customised weddings tailored to each couple's vision" without any concrete details. The AI already writes warmly; what it needs from the KB is facts.

**Contradictory entries** — Two FAQ entries that give different pricing figures. The AI may retrieve both and produce a confused or inconsistent draft.

**Outdated information** — An entry that says "minimum budget €20,000" when the actual threshold has been raised. Set a quarterly reminder to review all KB entries for accuracy.

**Content that violates brand rules** — Specifically: mentioning commission rates or referral fees (Rule 3), or mentioning call availability on days other than Monday and Wednesday (Rule 6). The sanitisers will catch this in the draft, but the KB should not be a source of problematic content in the first place.

---

## 13. Full Flow Diagram

```
PREPARATION (done once, or whenever KB content changes)
─────────────────────────────────────────────────────
  kb-data/*.md files
       │
       ▼
  scripts/kb-import.ts
       │
       ├─► INSERT into Supabase knowledge_base table
       │         (embedding_status = 'pending')
       │
       └─► POST /api/internal/embed-kb
                 │
                 ├─► Fetch title + content from Supabase
                 ├─► OpenAI text-embedding-3-small → 1536-dim vector
                 ├─► Upsert vector + metadata into Pinecone
                 └─► UPDATE embedding_status = 'embedded' in Supabase


RUNTIME (happens automatically for every draft)
────────────────────────────────────────────────
  New email arrives
       │
       ▼
  Classifier → determines message.category (e.g. 'new_inquiry')
       │
       ▼
  Draft Generator starts
       │
       ▼
  retrieveContext(query, messageCategory)
       │
       ├─► Lookup allowed KB categories for this messageCategory  (Rule 4)
       ├─► OpenAI: embed the query text → query vector
       ├─► Pinecone: vector search with category filter → top 5 matches
       └─► Supabase: fetch full content for the 5 kb_ids
       │
       ▼
  context_text (5 KB entries formatted as numbered list)
       │
       ▼
  Claude Sonnet prompt (P3 or P5)
  = system_prompt + brand_voice + kb_context + email_content
       │
       ▼
  AI Draft → sanitised → tone-checked → saved
```

---

*Last updated: 2026-05-08*
*Related files: `kb-data/`, `scripts/kb-import.ts`, `backend/src/services/retrieval.ts`, `backend/src/services/embedder.ts`, `backend/src/routes/internal.ts`*
