# DPCA Deployment Runbook

End-to-end checklist for getting the AI pipeline live: backend on Railway, n8n on the existing Ubuntu Docker host, Supabase already provisioned.

---

## 1. Environment variables

Source of truth: `.env.example`. Set the same keys in Railway (backend) and where applicable in n8n (`docker-compose.yml`).

### Railway (backend)

| Var | Source |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| `ANTHROPIC_MODEL_DRAFT` | `claude-sonnet-4-6` |
| `ANTHROPIC_MODEL_CLASSIFY` | `claude-sonnet-4-6` |
| `ANTHROPIC_MODEL_TONE` | `claude-haiku-4-5-20251001` |
| `GEMINI_API_KEY` | Google AI Studio (used for embeddings only) |
| `SUPABASE_URL` | Supabase dashboard → Project Settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API keys (service role) |
| `SUPABASE_ANON_KEY` | Supabase → API keys (anon) |
| `PINECONE_API_KEY` | pinecone.io → API keys |
| `PINECONE_INDEX_NAME` | `dpca-knowledge-base` |
| `PINECONE_INDEX_HOST` | from Pinecone index page |
| `INTERNAL_API_TOKEN` | generate: `openssl rand -base64 32` |
| `N8N_WEBHOOK_SECRET` | generate: `openssl rand -base64 32` (must match n8n's value) |
| `JWT_SECRET` | generate: `openssl rand -base64 32` |
| `CORS_ORIGIN` | dashboard origin (e.g. `https://dpca.vercel.app`) |
| `TONE_CONFIDENCE_THRESHOLD` | `75` |
| `NODE_ENV` | `production` |

### n8n (only if `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`)

| Var | Notes |
|---|---|
| `N8N_WEBHOOK_SECRET` | same value as backend, used to HMAC-sign callbacks |

If `N8N_BLOCK_ENV_ACCESS_IN_NODE=true` (current setup), placeholders inside workflow JSON must be replaced manually after import.

---

## 2. Deploy backend to Railway

1. From Railway dashboard → New Project → Deploy from GitHub repo → select `backend/` as root.
2. Set all variables from §1.
3. Build command: `npm install && npm run build`. Start: `npm start`.
4. After first deploy, copy the public URL. This is `BACKEND_URL` for n8n + smoke-test.
5. Sanity check: `curl https://<your-railway-url>/api/health` → expect `{"status":"ok"}`.

---

## 3. Configure n8n

1. n8n UI → Workflows → Import from File → `my-n8n-workflows/Dream Paris AI Pipeline.json`.
2. Replace placeholders in these nodes:
   - **Insert into Supabase** → both `apikey` and `Authorization` headers: `YOUR_SUPABASE_SERVICE_ROLE_KEY`
   - **Classify (Backend)**, **Extract Lead (Backend)**, **Generate Draft (Backend)** → `YOUR_BACKEND_URL` and `YOUR_INTERNAL_API_TOKEN`
3. Verify the Gmail credential is linked.
4. Activate the workflow.

If using `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` (cleaner): edit `docker-compose.yml`, set the flag to `false`, `docker compose up -d`, then use `={{$env.BACKEND_URL}}` etc. instead of placeholders.

---

## 4. Populate the knowledge base

Backend must be live first.

```
cd D:/workspace/DPCA
npx ts-node --project backend/tsconfig.json scripts/kb-import.ts
```

Reads `knowledge-base/kb-data/*.md`, upserts to Supabase, embeds to Pinecone via `/api/internal/embed-kb`. Re-runnable; safe on existing entries.

Spot-check retrieval:
```
curl -X POST https://<railway-url>/api/internal/retrieve \
  -H "x-internal-token: <INTERNAL_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query": "couple wants Paris château 60 guests", "category": "new_inquiry"}'
```

---

## 5. Smoke test the pipeline

```
npx ts-node --project backend/tsconfig.json scripts/smoke-test.ts
```

Inserts a synthetic message, runs classify → extract-lead → generate-draft, prints the draft, cleans up. Must show `ALL CHECKS PASSED`.

---

## 6. Gmail UAT

1. Use a separate test inbox or a Gmail filter so test traffic does not pollute the real client inbox.
2. Send 3–5 test messages covering each category (new inquiry, existing client, vendor, collaboration, general).
3. Watch n8n executions and the dashboard inbox. Each message should arrive within ~2 minutes (cron interval).
4. Verify in dashboard:
   - Draft appears under the message
   - Tone score visible
   - Context Sources panel lists the KB entries used
   - Versions panel shows v1 (and v2+ after a regenerate)

---

## 7. Key rotation (do this before public traffic)

1. **Supabase service-role**: Supabase dashboard → API → Reset service role key. Update Railway `SUPABASE_SERVICE_ROLE_KEY` and the n8n "Insert into Supabase" node placeholders.
2. **Gemini**: Google AI Studio → revoke old key, create new. Update Railway.
3. **Pinecone**: Pinecone console → API keys → rotate. Update Railway.
4. **Internal API token + webhook secret**: regenerate via `openssl rand -base64 32`. Update Railway and n8n simultaneously (mismatched values break HMAC).

After rotation, re-run §5 smoke test to confirm nothing broke.

---

## 8. Deferred (Track F items)

Add to next sprint, do not block launch:

- Daily n8n volume snapshot (`/var/lib/docker/volumes/n8n_data`)
- Supabase backup verification (point-in-time recovery enabled by default on Pro)
- Error digest cron reading `errors_log` daily
- Anthropic + Gemini cost alerts (set monthly cap in each provider's dashboard)
- End-to-end RLS verification: confirm the anon key cannot read other users' data
