# API Keys & Environment Setup Guide

## Keys to rotate immediately

These keys appeared in chat conversations or were visible in `.env` files.
**Rotate all three before going to production.**

---

### 1. Gemini API Key

**Portal:** https://aistudio.google.com/apikey

1. Find the key starting with `AIzaSy...` → click the trash icon to delete it
2. Click **Create API Key** → copy the new key
3. Update Railway variable `GEMINI_API_KEY` and your local `backend/.env`

---

### 2. Pinecone API Key

**Portal:** https://app.pinecone.io → left sidebar → **API Keys**

1. Delete the key starting with `pcsk_...`
2. Click **Create API Key** → name it `dpca-backend` → copy the new key
3. Update Railway variable `PINECONE_API_KEY` and your local `backend/.env`

---

### 3. Supabase Service Role Key

**Portal:** https://supabase.com → your project → **Project Settings** → **API**

1. Scroll to the **Service Role** section → click **Rotate**
2. Confirm — the old key is invalidated immediately
3. Copy the new key (starts with `eyJ...`)
4. Update Railway variable `SUPABASE_SERVICE_ROLE_KEY` and your local `backend/.env`

> The `anon` public key on the same page is safe to expose — no need to rotate it.

---

## Full Railway environment variables

**Path:** Railway dashboard → backend service → **Variables** tab → **Raw Editor**

```
SUPABASE_URL=https://hefkqlkiuiqhgssdmvad.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<new rotated key>

GEMINI_API_KEY=<new rotated key>
PINECONE_API_KEY=<new rotated key>
PINECONE_INDEX_NAME=dpca-knowledge-base

OPENAI_API_KEY=<get from platform.openai.com>
ANTHROPIC_API_KEY=<add when you get a real key — takes priority over Gemini>

CORS_ORIGIN=<your dashboard URL, e.g. https://dpca-dashboard.vercel.app>
INTERNAL_API_TOKEN=<generate — see section below>
JWT_SECRET=<generate — see section below>

WF8_WEBHOOK_URL=<your n8n WF8 webhook full URL>
N8N_WEBHOOK_URL=<your n8n base URL>
```

---

## Generating INTERNAL_API_TOKEN and JWT_SECRET

These are secrets you create yourself. Run in PowerShell:

```powershell
# For INTERNAL_API_TOKEN
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# For JWT_SECRET (run again)
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

- First output → `INTERNAL_API_TOKEN`
- Second output → `JWT_SECRET`

Store both values. `INTERNAL_API_TOKEN` also needs to be added to your n8n environment so n8n can authenticate calls to `/api/internal/*` routes.

---

## OpenAI API key (embeddings only)

**Portal:** https://platform.openai.com/api-keys

1. Click **Create new secret key** → name it `dpca-embeddings`
2. Copy it immediately (shown once only)
3. Add to Railway as `OPENAI_API_KEY`

This key is used **only** for generating Pinecone embeddings when running `scripts/kb-import.ts`.
The backend starts and runs without it — KB retrieval will simply return no results until embeddings exist.

---

## LLM provider priority

The backend selects whichever LLM key is present at runtime:

| Priority | Key | Provider | Models used |
|----------|-----|----------|-------------|
| 1st | `ANTHROPIC_API_KEY` | Anthropic Claude | Sonnet 4.6 (draft/classify), Haiku 4.5 (tone) |
| 2nd | `GEMINI_API_KEY` | Google Gemini | Gemini 2.0 Flash (all roles) |

If both keys are present, Anthropic is used. If neither is present, the first LLM call throws an error at runtime (server still starts).

---

## Priority checklist

| Priority | Variable | Blocks what |
|----------|----------|-------------|
| Immediate | Rotate Gemini, Pinecone, Supabase keys | Security |
| High | `INTERNAL_API_TOKEN` | n8n → backend internal API calls |
| High | `JWT_SECRET` | Dashboard login (JWT signing) |
| High | `CORS_ORIGIN` | Dashboard cannot reach backend |
| High | `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` | All AI features (classify, draft, extract) |
| High | `PINECONE_API_KEY` + `PINECONE_INDEX_NAME` | KB retrieval in drafts |
| Medium | `OPENAI_API_KEY` | KB import / embedding only |
| Later | `WF8_WEBHOOK_URL` | Draft regeneration from dashboard |

---

## Local development (.env)

Your local `backend/.env` should mirror Railway but use local n8n URLs:

```
SUPABASE_URL=https://hefkqlkiuiqhgssdmvad.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<rotated key>
PORT=3001
CORS_ORIGIN=http://localhost:3000
N8N_WEBHOOK_URL=http://localhost:5678

GEMINI_API_KEY=<rotated key>
PINECONE_API_KEY=<rotated key>
PINECONE_INDEX_NAME=dpca-knowledge-base
OPENAI_API_KEY=<your key>
INTERNAL_API_TOKEN=<same value as Railway>
JWT_SECRET=<same value as Railway>
WF8_WEBHOOK_URL=http://localhost:5678/webhook/<wf8-path>
```
