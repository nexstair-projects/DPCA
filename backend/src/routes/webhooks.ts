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

webhooksRouter.post('/n8n/message-ingested', async (req: Request, res: Response) => {
  const parsed = ingestSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { data, error } = await supabase
    .from('messages')
    .insert({ ...parsed.data, status: 'new' })
    .select('id')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ id: data.id })
})

// POST /api/webhooks/n8n/message-classified — called by WF2 after classification
const classifySchema = z.object({
  message_id: z.string().uuid(),
  category: z.string(),
  priority: z.string(),
  tier: z.number().int().min(1).max(3),
  confidence_score: z.number().min(0).max(1),
  estimated_value: z.number().optional(),
  guest_count: z.number().int().optional(),
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
  tone_confidence: z.number().min(0).max(1).optional(),
  confidence_score: z.number().min(0).max(1).optional(),
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
    .insert({ ...fields, message_id, status })
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
  client_name: z.string(),
  client_email: z.string().email().optional(),
  client_phone: z.string().optional(),
  wedding_date: z.string().optional(),
  guest_count: z.number().int().optional(),
  estimated_value: z.number().optional(),
  venue_preference: z.string().optional(),
  services_requested: z.array(z.string()).optional(),
  ai_summary: z.string().optional(),
  source: z.string().optional(),
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
      source: 'WF6',
      message_id,
      error_message: error_message ?? 'Unknown send error',
      metadata: { draft_id },
    })
  }

  res.json({ ok: true })
})
