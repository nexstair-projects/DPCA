# Backend API — DPCA

Express + TypeScript API bridging the Next.js dashboard ↔ Supabase ↔ n8n workflows.

## Quick start

```bash
cd backend
npm install
cp ../.env.example .env   # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.
npm run dev               # starts on :3001 with hot-reload
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/messages` | List messages with drafts |
| GET | `/api/messages/:id` | Single message with full draft |
| GET | `/api/messages/stats/summary` | Dashboard stats via RPC |
| POST | `/api/drafts/:id/approve` | Approve (optionally edit) draft |
| POST | `/api/drafts/:id/reject` | Reject draft with reason |
| POST | `/api/drafts/:id/regenerate` | Request new AI draft via n8n |
| POST | `/api/drafts/:id/reassign` | Reassign to team member |
| POST | `/api/webhooks/n8n/message-ingested` | n8n → new message ingested |
| POST | `/api/webhooks/n8n/message-classified` | n8n → classification result |
| POST | `/api/webhooks/n8n/draft-generated` | n8n → AI draft created |
| POST | `/api/webhooks/n8n/lead-extracted` | n8n → lead data extracted |
| POST | `/api/webhooks/n8n/send-result` | n8n → send success/failure |
