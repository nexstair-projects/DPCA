/**
 * AI Pipeline Smoke Test
 *
 * Inserts a synthetic test message into Supabase, then runs it through
 * classify → extract-lead → generate-draft via the backend internal API.
 * Cleans up the test data afterwards.
 *
 * Usage:
 *   npx ts-node --project backend/tsconfig.json scripts/smoke-test.ts
 *
 * Required env vars (in backend/.env or exported):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   INTERNAL_API_TOKEN
 *   BACKEND_URL (default: http://localhost:3001)
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') })

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001'
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN ?? ''

const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
)

const TEST_MESSAGE = {
  inbox_id: null as string | null,
  sender_name: 'Sophie & Laurent Dubois',
  sender_email: 'smoke-test@example.com',
  subject: 'Dream Wedding in Paris — Autumn 2026',
  body_raw: `Bonjour,

We are Sophie and Laurent, a couple from London planning to get married in Paris in October 2026.
We have around 60 guests and a budget of approximately €35,000.
We would love a romantic venue with a garden — ideally a château outside Paris.
We found you through a friend who used your services last year and said you were exceptional.

Could you tell us more about your services and pricing?

Warm regards,
Sophie & Laurent`,
  body_clean: `We are Sophie and Laurent, a couple from London planning to get married in Paris in October 2026. We have around 60 guests and a budget of approximately €35,000. We would love a romantic venue with a garden — ideally a château outside Paris. We found you through a friend who used your services last year and said you were exceptional. Could you tell us more about your services and pricing?`,
  channel: 'gmail',
  status: 'unread',
  received_at: new Date().toISOString(),
}

async function internalPost(path: string, body: object): Promise<{ ok: boolean; data: unknown }> {
  const res = await fetch(`${BACKEND_URL}/api/internal/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-token': INTERNAL_TOKEN,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return { ok: res.ok, data }
}

function pass(label: string, detail?: string) {
  console.log(`  ✓ ${label}${detail ? ': ' + detail : ''}`)
}
function fail(label: string, detail?: unknown) {
  console.error(`  ✗ ${label}`, detail ?? '')
  process.exitCode = 1
}

async function run() {
  console.log('\n=== DPCA AI Pipeline Smoke Test ===')
  console.log(`Backend: ${BACKEND_URL}\n`)

  // ── 0. Preflight ────────────────────────────────────────────────────────────
  console.log('[ 0 ] Preflight checks')

  const health = await fetch(`${BACKEND_URL}/api/health`).catch(() => null)
  if (!health?.ok) { fail('Backend not reachable — is it running?'); return }
  pass('Backend is reachable')

  if (!INTERNAL_TOKEN) fail('INTERNAL_API_TOKEN not set — internal calls will return 401')
  else pass('INTERNAL_API_TOKEN present')

  // Get first inbox_id to assign to the test message
  const { data: inboxes } = await supabase.from('inboxes').select('id').limit(1)
  const inboxId = inboxes?.[0]?.id ?? null
  if (!inboxId) fail('No inboxes found in database — create one first')
  else pass(`Using inbox ${inboxId}`)

  // ── 1. Insert test message ───────────────────────────────────────────────────
  console.log('\n[ 1 ] Inserting test message')

  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({ ...TEST_MESSAGE, inbox_id: inboxId })
    .select('id')
    .single()

  if (msgErr || !msg) { fail('Insert failed', msgErr); return }
  const messageId = msg.id
  pass(`Message inserted`, messageId)

  try {
    // ── 2. Classify ────────────────────────────────────────────────────────────
    console.log('\n[ 2 ] Classify message')
    const { ok: cOk, data: cData } = await internalPost('classify', { message_id: messageId })
    if (!cOk) { fail('Classify failed', cData); }
    else {
      const c = cData as Record<string, unknown>
      pass(`category = ${c.category}, priority = ${c.priority}, tier = ${c.tier}, confidence = ${c.confidence}`)
    }

    // ── 3. Extract lead ────────────────────────────────────────────────────────
    console.log('\n[ 3 ] Extract lead')
    const { ok: lOk, data: lData } = await internalPost('extract-lead', { message_id: messageId })
    if (!lOk) { fail('Lead extraction failed', lData) }
    else {
      const l = lData as Record<string, unknown>
      pass(`lead_id = ${l.lead_id}, upserted = ${l.upserted}`)
    }

    // ── 4. Generate draft ──────────────────────────────────────────────────────
    console.log('\n[ 4 ] Generate draft')
    const { ok: dOk, data: dData } = await internalPost('generate-draft', { message_id: messageId })
    if (!dOk) { fail('Draft generation failed', dData) }
    else {
      const d = dData as Record<string, unknown>
      pass(`draft_id = ${d.draft_id}, auto_send = ${d.auto_send}, tone_score = ${d.tone_score}, flagged = ${d.flagged}`)

      // Fetch and print the draft text
      const { data: draft } = await supabase
        .from('drafts')
        .select('draft_text, model_used, status')
        .eq('id', d.draft_id as string)
        .single()

      if (draft) {
        pass(`model_used = ${draft.model_used}, status = ${draft.status}`)
        console.log('\n--- Draft Preview (first 500 chars) ---')
        console.log(draft.draft_text?.slice(0, 500) + (draft.draft_text?.length > 500 ? '…' : ''))
        console.log('---------------------------------------')
      }
    }

  } finally {
    // ── 5. Cleanup ─────────────────────────────────────────────────────────────
    console.log('\n[ 5 ] Cleanup')

    await supabase.from('drafts').delete().eq('message_id', messageId)
    await supabase.from('leads').delete().eq('email', TEST_MESSAGE.sender_email)
    await supabase.from('messages').delete().eq('id', messageId)
    pass('Test data removed')
  }

  const exitCode = process.exitCode ?? 0
  console.log(`\n=== ${exitCode === 0 ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'} ===\n`)
}

run().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
