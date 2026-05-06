# DPCA Deployment Guide — Vercel + Railway

**Last Updated**: 2026-05-05  
**Target**: Production deployment of Dream Paris Communication Assistant  
**Stack**: Next.js Dashboard (Vercel) + Node.js Backend (Railway) + Supabase (Cloud) + n8n (VPS)

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Part 1: Dashboard Deployment (Vercel)](#part-1-dashboard-deployment-vercel)
3. [Part 2: Backend Deployment (Railway)](#part-2-backend-deployment-railway)
4. [Part 3: Database Migration (Supabase)](#part-3-database-migration-supabase)
5. [Part 4: n8n Configuration](#part-4-n8n-configuration)
6. [Part 5: Post-Deployment Verification](#part-5-post-deployment-verification)
7. [Part 6: Full Pipeline Test](#part-6-full-pipeline-test)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before starting, ensure you have:

- [ ] GitHub account with DPCA repo pushed
- [ ] Vercel account (free tier OK)
- [ ] Railway account (free tier OK)
- [ ] Supabase project created and accessible
- [ ] Anthropic API key (`ANTHROPIC_API_KEY`)
- [ ] OpenAI API key for embeddings (`OPENAI_API_KEY`)
- [ ] Pinecone API key and index created
- [ ] Gmail OAuth credentials (from Step 9 of Week 1 plan)
- [ ] All Day 1 migrations applied locally
- [ ] Supabase service-role JWT rotated (not the old one from git)
- [ ] Backend builds locally: `npm run build` in `backend/` passes with no errors
- [ ] Dashboard builds locally: `npm run build` in `dashboard/` passes with no errors

---

## PART 1: DASHBOARD DEPLOYMENT (VERCEL)

### Step 1 — Prepare dashboard for Vercel

**Ensure `.env.local` is correct** (this file is NOT committed; Vercel sets env vars via UI):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_BACKEND_URL=https://your-backend-api.railway.app
```

**Verify build works locally:**

```powershell
cd d:\workspace\DPCA\dashboard
npm install
npm run build
npm run start
# Should start on port 3000 without errors
# Visit http://localhost:3000 — you should see login page
```

If the build fails, fix the errors before proceeding to Vercel.

### Step 2 — Push code to GitHub

From project root:

```powershell
cd d:\workspace\DPCA
git status
# Should show only untracked/modified files you want to commit
git add .
git commit -m "Deploy: dashboard and backend ready for Vercel + Railway"
git push origin main
```

Verify the push succeeded by checking GitHub.

### Step 3 — Create Vercel account and import project

1. Go to [vercel.com](https://vercel.com)
2. Sign up or log in with GitHub
3. Click **Add New** → **Project**
4. Find your DPCA repository and click **Import**
5. **Configure Project**:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `dashboard` (important!)
   - **Build Command**: `npm run build` (default is OK)
   - **Output Directory**: `.next` (default is OK)
   - **Install Command**: `npm install` (default is OK)

6. **Environment Variables** section (next page):
   - **DO NOT fill these in yet** — do it after deployment
   - Click **Deploy**

Vercel will build and deploy. This takes 2–5 minutes. Wait for the green checkmark.

### Step 4 — Add environment variables in Vercel

1. In Vercel dashboard, click on your deployed project
2. Go to **Settings** → **Environment Variables**
3. Add three variables (for all environments: Production, Preview, Development):

| Variable Name | Value | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` (from Supabase dashboard) | Production, Preview, Development |
| `NEXT_PUBLIC_BACKEND_URL` | Leave empty for now — update after backend is deployed | Production, Preview, Development |

4. Click **Save** after adding each variable

### Step 5 — Trigger redeploy with new environment variables

1. Go to **Deployments** tab
2. Click the three dots next to the latest deployment
3. Click **Redeploy**
4. Wait for the build to complete

### Step 6 — Get your Vercel URL

In Vercel dashboard, you'll see your deployment URL (e.g., `https://dpca-dashboard.vercel.app`).

**Keep this URL handy** — you'll need it for the backend's `CORS_ORIGIN` variable.

### Step 7 — Test dashboard (so far)

Visit your Vercel URL. You should see:
- Login page loads without errors
- No 500 errors in browser console
- (Login won't work yet because backend isn't deployed)

---

## PART 2: BACKEND DEPLOYMENT (RAILWAY)

### Step 1 — Prepare backend for Railway

**Verify build works locally first:**

```powershell
cd d:\workspace\DPCA\backend
npm install
npm run build
# Should create dist/ folder with no errors
# Should output multiple .js files in dist/
```

**Do NOT commit `.env`** — Railway will use the UI to set secrets.

### Step 2 — Create Railway account and connect GitHub

1. Go to [railway.app](https://railway.app)
2. Sign up or log in with GitHub
3. Click **New Project**
4. Select **Deploy from GitHub repo**
5. Authorize Railway to access your GitHub
6. Select your DPCA repo
7. Railway will auto-detect Node.js and create a service

### Step 3 — Configure the backend service in Railway

After the service is created:

1. Click on the **backend** service (or the service card that appears)
2. Go to **Settings** tab
3. Configure:
   - **Root Directory**: `backend`
   - **Start Command**: `npm run start`
   - **Build Command**: `npm run build` (if not auto-filled)
   - **Watch Paths**: Leave blank (Railway auto-rebuilds on git push)
   - **Port**: `3001` (or leave blank — Railway infers from code)

4. Click **Save**

### Step 4 — Set environment variables in Railway

1. In the backend service, go to **Variables** tab
2. Add these environment variables (copy from your local `.env`):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (ROTATED KEY, not the old one)
ANTHROPIC_API_KEY=sk-ant-v...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_HOST=...
PINECONE_INDEX_NAME=dpca-knowledge-base
PINECONE_ENVIRONMENT=...
N8N_WEBHOOK_SECRET=<generate a random hex string: openssl rand -hex 32>
INTERNAL_API_TOKEN=<generate a random hex string: openssl rand -hex 32>
N8N_WEBHOOK_URL=https://n8n.your-domain.com (leave empty if not deployed yet)
JWT_SECRET=<generate a random hex string: openssl rand -hex 32>
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://dpca-dashboard.vercel.app
```

**Generate random secrets** (in PowerShell or online):

```powershell
# Generate N8N_WEBHOOK_SECRET
$bytes = New-Object Byte[] 32
$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
$rng.GetBytes($bytes)
[System.BitConverter]::ToString($bytes) -replace "-", ""

# Repeat for INTERNAL_API_TOKEN and JWT_SECRET
```

3. Add all variables one by one
4. Click **Save** after each

### Step 5 — Deploy backend on Railway

**Option A: Auto-deploy via GitHub push**

```powershell
cd d:\workspace\DPCA
git push origin main
# Railway will auto-detect changes and rebuild
```

**Option B: Manual trigger in Railway UI**

1. In Railway → backend service → **Deployments** tab
2. Click **Trigger Deploy**
3. Wait for build to complete (green checkmark)

Building takes 2–5 minutes.

### Step 6 — Get your Railway backend URL

1. In Railway → backend service → **Settings**
2. Look for **Public Networking** or **Domain** section
3. You'll see a URL like `dpca-api-production.up.railway.app` (auto-generated)
4. Copy this full domain

### Step 7 — Update Vercel with backend URL

Go back to Vercel dashboard:

1. Your dashboard project → **Settings** → **Environment Variables**
2. Edit `NEXT_PUBLIC_BACKEND_URL`
3. Set value to: `https://dpca-api-production.up.railway.app` (use the Railway URL from Step 6)
4. Save
5. Go to **Deployments** → click latest → **Redeploy**

Wait for Vercel to rebuild.

### Step 8 — Test backend is alive

```powershell
# Health check
curl https://dpca-api-production.up.railway.app/api/health
# Expected response: { "status": "DPCA API running", "endpoints": [...] }

# Test auth protection (should return 401)
curl https://dpca-api-production.up.railway.app/api/messages
# Expected response: { "error": "Missing bearer token" }
```

Both should work without errors.

---

## PART 3: DATABASE MIGRATION (SUPABASE)

Your Supabase project is already in the cloud. Just apply the Day 1 migrations:

### Step 1 — Get Supabase access token

1. Go to [supabase.com](https://supabase.com/dashboard)
2. Click your avatar → **Account settings**
3. Go to **Access Tokens**
4. Create a new token or copy an existing one (starts with `sbp_`)

### Step 2 — Push migrations

From project root:

```powershell
cd d:\workspace\DPCA
$env:SUPABASE_ACCESS_TOKEN = "sbp_xxxxxxxxxxxxxxxxxxxx"  # paste your token
& node_modules\.bin\supabase.cmd db push
```

It will show:
```
Detected 2 new migrations:
  - 20260429000001_planning_step_and_signature.sql
  - 20260429000002_seed_brand_config.sql
Continue? (y/n)
```

Type `y` and press Enter.

### Step 3 — Verify migrations applied

**In Supabase dashboard** → SQL Editor, run:

```sql
-- Check system_config was seeded
SELECT COUNT(*) as config_count FROM system_config;
-- Expected: 15 or more rows

-- Check planning_step column exists
SELECT planning_step, signature_signed FROM leads LIMIT 1;
-- Expected: no error (columns exist, even if empty)

-- Check planning_step_history table exists
SELECT COUNT(*) FROM planning_step_history;
-- Expected: 0 (table exists, is empty)
```

All three queries should succeed.

---

## PART 4: N8N CONFIGURATION

### Prerequisite: Supabase JWT rotation

If you haven't already rotated the Supabase service-role JWT, do it **before** continuing:

1. Supabase dashboard → **Settings** → **API**
2. Click **Rotate** next to `service_role` key
3. Copy the new key
4. Update your Railway backend's `SUPABASE_SERVICE_ROLE_KEY` env var
5. Redeploy on Railway

### Step 1 — Update n8n credentials

1. Open your n8n UI (on your VPS at `https://n8n.your-domain.com`)
2. Go to **Settings** → **Credentials**
3. Find or create `Supabase - Service Role` credential:
   - **Type**: Header Auth (or HTTP with basic auth)
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer <new-rotated-key>` (or set `apikey: <new-key>` depending on n8n Supabase node type)
   - Save

### Step 2 — Update WF1 (Email Ingestion)

1. Open **WF1 - Email Ingestion** workflow
2. Find the HTTP node that calls Supabase
3. **Remove** any hardcoded JWT from the node's header parameters
4. Instead, reference the credential node you just created:
   - Click the HTTP node → **Credential** dropdown → select `Supabase - Service Role`
5. Save and re-export WF1 JSON

### Step 3 — Update WF2–WF8 to use Railway backend URL

For each workflow (WF2, WF5, WF6, WF7, WF8):

1. Find all HTTP nodes that make requests to the backend
2. Replace `http://localhost:3001/api/...` with `https://dpca-api-production.up.railway.app/api/...`
3. Ensure all HTTP nodes include the `x-internal-token` header:
   - Header name: `x-internal-token`
   - Value: `<your-INTERNAL_API_TOKEN-from-railway>`
4. For webhook calls **back to n8n** (WF6 → `/api/webhooks/n8n/send-result`):
   - Add header: `x-dpca-signature: <calculated-HMAC>`
   - (n8n will calculate this if you use n8n's built-in webhook signing)
5. Save each workflow

### Step 4 — Export updated workflows to git

After all updates:

```powershell
# In n8n UI, export each workflow
# Download WF1.json, WF2.json, ..., WF8.json

# Copy to your repo
Copy-Item ".\Downloads\WF1.json" "d:\workspace\DPCA\n8n-workflows\WF1-email-ingestion.json"
Copy-Item ".\Downloads\WF2.json" "d:\workspace\DPCA\n8n-workflows\WF2-classification.json"
# ... repeat for WF3–WF8

# Commit and push
cd d:\workspace\DPCA
git add n8n-workflows/
git commit -m "Update n8n workflows with Railway backend URLs and new credentials"
git push origin main
```

### Step 5 — Test n8n → Railway connection

1. In n8n, find any test node or webhook trigger
2. Send a test request with proper HMAC signature
3. Check Railway logs for successful webhook reception

---

## PART 5: POST-DEPLOYMENT VERIFICATION

### 5.1 Database check

```sql
-- Run in Supabase SQL Editor
SELECT config_key FROM system_config ORDER BY config_key;
-- Should return 15+ rows: auto_send_rules, brand_voice_prompt, classification_prompt, etc.

SELECT COUNT(*) FROM users;
-- Should return 3 (from seed data)
```

### 5.2 Backend health check

```powershell
curl https://dpca-api-production.up.railway.app/api/health
# Expected: { "status": "DPCA API running", "endpoints": [...] }
```

### 5.3 Backend auth check

```powershell
# Should return 401 (unauthenticated)
curl https://dpca-api-production.up.railway.app/api/messages
# Expected: { "error": "Missing bearer token" }
```

### 5.4 Dashboard loads

1. Visit `https://dpca-dashboard.vercel.app`
2. You should see the login page (not a 500 error)
3. Check browser console (F12) for any JavaScript errors
4. (Login won't work yet if backend isn't fully wired)

### 5.5 CORS check

```powershell
# From Vercel's domain, should succeed (CORS allowed)
curl -H "Origin: https://dpca-dashboard.vercel.app" `
  -H "Access-Control-Request-Method: GET" `
  https://dpca-api-production.up.railway.app/api/health
# Should NOT have CORS error
```

---

## PART 6: FULL PIPELINE TEST

### Test scenario: Send a test email

1. **Send a real email** to the DPW Gmail inbox (e.g., `contact@dreampariswedding.com`)
   - From: Any email address
   - Subject: "Test inquiry"
   - Body: "I'm interested in your services."

2. **Monitor n8n**:
   - Open n8n UI → **Executions**
   - WF1 should trigger within 2–5 minutes
   - Watch for WF1 → WF2 → WF5 chain
   - Check for any errors in execution logs

3. **Check Supabase**:
   ```sql
   SELECT id, subject, status FROM messages ORDER BY created_at DESC LIMIT 1;
   -- Should show your test email with status 'classified' or 'draft_ready'
   ```

4. **Check dashboard**:
   - Visit Vercel URL
   - Login with test account (from seed data)
   - Go to **Inbox**
   - Your test message should appear
   - Should show a draft waiting for approval

5. **Approve & send**:
   - Click the message
   - Review the draft
   - Click **Approve & Send**
   - Watch n8n WF6 (Send) execute
   - Check your Gmail — reply should appear in the original thread within 30 seconds

6. **Verify audit log**:
   ```sql
   SELECT action_type, user_id, created_at FROM audit_log ORDER BY created_at DESC LIMIT 5;
   -- Should show 'approve' action from the test
   ```

**If all steps succeed**, you're live in production.

---

## TROUBLESHOOTING

| Issue | Symptoms | Fix |
|---|---|---|
| **Vercel build fails** | Red X on deployment | 1. Check `npm run build` works locally in `dashboard/`. 2. Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars are set. 3. Check `.next` folder isn't in `.gitignore`. |
| **Railway build fails** | Red error in deployments | 1. Check `npm run build` works locally in `backend/`. 2. Check `backend/tsconfig.json` exists. 3. Check Node version on Railway matches local (use `node --version`). |
| **Dashboard 401 errors** | Inbox shows 401 when trying to load messages | 1. Dashboard is missing `Authorization: Bearer <token>` header. 2. Check `NEXT_PUBLIC_BACKEND_URL` is correct in Vercel env vars. 3. Update all `fetch()` calls in dashboard to include `Authorization: Bearer ${session.access_token}`. |
| **Backend returns CORS error** | Browser console shows "Access to XMLHttpRequest... blocked by CORS policy" | 1. Check Railway's `CORS_ORIGIN` env var is set to Vercel URL (e.g., `https://dpca-dashboard.vercel.app`). 2. Redeploy Railway after updating env var. 3. Wait 2 minutes for new container to start. |
| **Webhooks return 401** | n8n error: "Invalid signature" or "Invalid token" | 1. Check `N8N_WEBHOOK_SECRET` is set on Railway. 2. Check `INTERNAL_API_TOKEN` is set on Railway. 3. Update n8n workflows to send correct `x-internal-token` and `x-dpca-signature` headers. |
| **n8n can't reach backend** | n8n execution: "Failed to fetch http://localhost:3001..." | 1. n8n is still using `localhost` instead of Railway URL. 2. Update all HTTP nodes in n8n workflows to use `https://dpca-api-production.up.railway.app`. 3. Re-export workflows. 4. Restart n8n or re-trigger workflow. |
| **Database queries fail** | Supabase connection error in Railway logs | 1. Check `SUPABASE_SERVICE_ROLE_KEY` is correct and rotated. 2. Check `SUPABASE_URL` is correct. 3. Test connection: `curl -H "Authorization: Bearer <service-role-key>" https://your-project.supabase.co/rest/v1/users`. |
| **Gmail OAuth fails** | n8n WF1 error: "OAuth token expired" or "Invalid credentials" | 1. Reauthorize Gmail in n8n: Settings → Credentials → Gmail → re-authenticate. 2. Get new refresh token from Google. 3. Confirm refresh token is stored in n8n credential securely. |
| **Tone validation returns errors** | Drafts fail with "Haiku model error" | 1. Check `ANTHROPIC_API_KEY` is correct on Railway. 2. Check model name is `claude-haiku-4-5-20251001` (not typo). 3. Check Anthropic account has quota. |
| **Pinecone queries empty** | Dashboard shows "No context retrieved" or empty KB | 1. Check `PINECONE_API_KEY` and `PINECONE_INDEX_HOST` on Railway. 2. Confirm Pinecone index dimension is 1536 (matches text-embedding-3-small). 3. Run kb-import script to seed KB entries. 4. Verify `embedding_status='embedded'` on KB rows. |

---

## Rollback / Revert

If something breaks in production:

**Vercel**: Go to **Deployments** → find the last known good deployment → click **Redeploy**  
**Railway**: Go to **Deployments** → find the last known good → click **Redeploy**  
**Supabase**: Migrations are immutable, but you can:
  - Revert n8n workflows to a prior JSON export
  - Stop n8n from triggering new workflows
  - Manually fix data via SQL if needed

---

## Success Criteria

Your deployment is successful when:

- ✅ Dashboard loads at Vercel URL without 500 errors
- ✅ Backend health check returns 200 at Railway URL
- ✅ Dashboard can login with test account from Supabase seed data
- ✅ Dashboard shows inbox with messages (after seeding test data)
- ✅ Backend webhooks accept HMAC-signed requests from n8n
- ✅ Full pipeline works: email → n8n → Supabase → dashboard → approve → Gmail reply
- ✅ Audit log captures all actions
- ✅ No hardcoded secrets in git history
- ✅ All env vars are managed via platform UIs (Vercel, Railway), not committed

---

## Next Steps After Deployment

1. **Monitor logs**: Check Vercel & Railway dashboards daily for errors
2. **Test workflows**: Run 5+ test emails through the full pipeline
3. **Backup data**: Set up daily Supabase backups
4. **Enable monitoring**: Add error alerting via Railway/Vercel webhooks to Slack
5. **Scale as needed**: If traffic spikes, upgrade Railway plan
6. **Keep secrets rotated**: Rotate JWT and API keys monthly
7. **Monitor costs**: Track Anthropic + OpenAI + Railway costs

---

## Support & Documentation

- **Vercel docs**: https://vercel.com/docs
- **Railway docs**: https://railway.app/docs
- **Supabase docs**: https://supabase.com/docs
- **n8n docs**: https://docs.n8n.io
- **Project docs**: See `docs/` folder in repo (ARCHITECTURE.md, WORKFLOWS.md, etc.)
