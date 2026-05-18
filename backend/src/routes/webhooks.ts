import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'

export const webhooksRouter = Router()

// POST /api/webhooks/n8n/message-ingested — called by WF1 after email ingestion
const ingestSchema = z.object({
  inbox_id: z.string().uuid(),
  channel: z.enum(['gmail', 'whatsapp', 'instagram']),
  message_external_id: z.string(),
  thread_id: z.string().optional(),
  sender_name: z.string().optional(),
  sender_email: z.string().email().optional(),
  sender_phone: z.string().optional(),
  subject: z.string().optional(),
  body_raw: z.string(),
  body_clean: z.string().optional(),
  labels: z.array(z.string()).optional(),
})

const threadMessageSchema = z.object({
  messageId: z.string().optional(),
  message_external_id: z.string().optional(),
  threadId: z.string().optional(),
  thread_id: z.string().optional(),
  subject: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  date: z.string().optional(),
  timestamp: z.number().optional(),
  labels: z.array(z.string()).optional(),
  isSent: z.boolean().optional(),
  role: z.enum(['assistant', 'customer']).optional(),
  snippet: z.string().optional(),
  body_raw: z.string().optional(),
  body_clean: z.string().optional(),
})

const threadIngestSchema = z.object({
  inbox_id: z.string().uuid(),
  channel: z.enum(['gmail', 'whatsapp', 'instagram']).default('gmail'),
  messages: z.array(threadMessageSchema),
})

const parseEmailAddress = (value = '') => {
  const match = value.match(/^(.*?)\s*<([^>]+)>$/)
  if (!match) return { name: undefined, email: value.includes('@') ? value.trim() : undefined }

  return {
    name: match[1].replace(/^"|"$/g, '').trim() || undefined,
    email: match[2].trim() || undefined,
  }
}

webhooksRouter.post('/n8n/message-ingested', async (req: Request, res: Response) => {
  const parsed = ingestSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  // Upsert by external message id to avoid duplicate inserts when the same
  // thread is processed multiple times by n8n. Use `message_external_id` as
  // the conflict key in the DB (see Supabase table constraint).
  const { data, error } = await supabase
    .from('messages')
    .upsert({ ...parsed.data, status: 'new' }, { onConflict: 'message_external_id' })
    .select('id')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ id: data.id })
})

// POST /api/webhooks/n8n/message-classified — called by WF2 after classification
// POST /api/webhooks/n8n/thread-messages-ingested - upsert missing Gmail messages from a full thread
webhooksRouter.post('/n8n/thread-messages-ingested', async (req: Request, res: Response) => {
  const body = Array.isArray(req.body?.messages)
    ? req.body
    : { ...req.body, messages: Array.isArray(req.body) ? req.body : [req.body] }

  const parsed = threadIngestSchema.safeParse(body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const rows = parsed.data.messages
    .map((message) => {
      const message_external_id = message.message_external_id ?? message.messageId
      if (!message_external_id) return null

      const sender = parseEmailAddress(message.from)
      const isSent =
        message.isSent ??
        (message.role === 'assistant' || (message.labels ?? []).includes('SENT'))
      const received_at =
        message.date ??
        (message.timestamp != null ? new Date(message.timestamp).toISOString() : new Date().toISOString())

      return {
        inbox_id: parsed.data.inbox_id,
        channel: parsed.data.channel,
        message_external_id,
        thread_id: message.thread_id ?? message.threadId,
        sender_name: sender.name,
        sender_email: sender.email,
        subject: message.subject ?? '',
        body_raw: message.body_raw ?? message.snippet ?? '',
        body_clean: message.body_clean ?? message.snippet ?? '',
        labels: message.labels,
        status: isSent ? 'replied' : 'new',
        received_at,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row != null)

  if (rows.length === 0) return res.status(400).json({ error: 'No valid thread messages supplied' })

  const { data, error } = await supabase
    .from('messages')
    .upsert(rows, { onConflict: 'message_external_id', ignoreDuplicates: false })
    .select('id, message_external_id')

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true, upserted: data?.length ?? 0, messages: data ?? [] })
})

const classifySchema = z.object({
  message_id: z.string().uuid(),
  category: z.string(),
  priority: z.string(),
  tier: z.number().int().min(1).max(3),
  classification_confidence: z.number().min(0).max(1),
  estimated_value: z.number().optional(),
  guest_count: z.number().int().optional(),
  classification_reasoning: z.string().optional(),
})

webhooksRouter.post('/n8n/message-classified', async (req: Request, res: Response) => {
  const parsed = classifySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { message_id, ...fields } = parsed.data

  const { error } = await supabase
    .from('messages')
    .update({ ...fields, status: 'classified', classified_at: new Date().toISOString() })
    .eq('id', message_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// POST /api/webhooks/n8n/draft-generated — called by WF5 after draft generation
const draftSchema = z.object({
  message_id: z.string().uuid(),
  draft_text: z.string(),
  model_used: z.string().optional(),
  prompt_tokens: z.number().int().optional(),
  completion_tokens: z.number().int().optional(),
  tone_confidence: z.number().min(0).max(100).optional(),
  context_sources: z.array(z.string()).optional(),
  auto_approve: z.boolean().optional(),
})

webhooksRouter.post('/n8n/draft-generated', async (req: Request, res: Response) => {
  const parsed = draftSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { message_id, auto_approve, ...fields } = parsed.data
  const status = auto_approve ? 'auto_approved' : 'pending_review'

  const { data, error } = await supabase
    .from('drafts')
    .insert({
      ...fields,
      message_id,
      status,
      original_draft_text: fields.draft_text,
    })
    .select('id')
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // Update message status
  await supabase
    .from('messages')
    .update({ status: auto_approve ? 'auto_sent' : 'pending_review' })
    .eq('id', message_id)

  res.json({ id: data.id, status })
})

// POST /api/webhooks/n8n/lead-extracted — called by WF7 after lead extraction
const leadSchema = z.object({
  message_id: z.string().uuid().optional(),
  inbox_id: z.string().uuid(),
  client_names: z.array(z.string()).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  wedding_date: z.string().optional(),
  wedding_date_flexible: z.boolean().optional(),
  guest_count: z.number().int().optional(),
  estimated_value: z.number().optional(),
  venue_preference: z.string().optional(),
  services_requested: z.array(z.string()).optional(),
  how_found_us: z.string().optional(),
  ai_summary: z.string().optional(),
  source_channel: z.enum(['gmail', 'whatsapp', 'instagram']).optional(),
})

webhooksRouter.post('/n8n/lead-extracted', async (req: Request, res: Response) => {
  const parsed = leadSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { data, error } = await supabase
    .from('leads')
    .insert({ ...parsed.data, status: 'new' })
    .select('id')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ id: data.id })
})

// POST /api/webhooks/n8n/send-result — called by WF6 after sending
const sendResultSchema = z.object({
  draft_id: z.string().uuid(),
  message_id: z.string().uuid(),
  success: z.boolean(),
  error_message: z.string().optional(),
  sent_at: z.string().optional(),
})

webhooksRouter.post('/n8n/send-result', async (req: Request, res: Response) => {
  const parsed = sendResultSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { draft_id, message_id, success, error_message, sent_at } = parsed.data

  if (success) {
    await supabase.from('drafts').update({ status: 'sent', sent_at: sent_at ?? new Date().toISOString() }).eq('id', draft_id)
    await supabase.from('messages').update({ status: 'sent' }).eq('id', message_id)
  } else {
    await supabase.from('drafts').update({ status: 'send_failed' }).eq('id', draft_id)
    await supabase.from('messages').update({ status: 'send_failed' }).eq('id', message_id)
    await supabase.from('errors_log').insert({
      error_type: 'send_failure',
      workflow_name: 'WF6',
      message_id,
      error_message: error_message ?? 'Unknown send error',
      metadata: { draft_id },
    })
  }

  res.json({ ok: true })
})
