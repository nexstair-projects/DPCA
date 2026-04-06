import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'

export const draftsRouter = Router()

// POST /api/drafts/:id/approve — approve draft & mark message approved
const approveSchema = z.object({
  reviewed_by: z.string().uuid(),
  edited_text: z.string().optional(),
})

draftsRouter.post('/:id/approve', async (req: Request, res: Response) => {
  const parsed = approveSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { reviewed_by, edited_text } = parsed.data
  const draftId = req.params.id
  const status = edited_text ? 'edited_approved' : 'approved'

  const { data: draft, error: draftErr } = await supabase
    .from('drafts')
    .update({ status, reviewed_by, edited_text, updated_at: new Date().toISOString() })
    .eq('id', draftId)
    .select('message_id')
    .single()

  if (draftErr) return res.status(500).json({ error: draftErr.message })

  await supabase
    .from('messages')
    .update({ status: 'approved' })
    .eq('id', draft.message_id)

  // Log to audit trail
  await supabase.from('audit_log').insert({
    action_type: edited_text ? 'edit_and_approve' : 'approve',
    user_id: reviewed_by,
    draft_id: draftId,
    message_id: draft.message_id,
    metadata: edited_text ? { edited: true } : {},
  })

  res.json({ ok: true, status })
})

// POST /api/drafts/:id/reject — reject draft with reason
const rejectSchema = z.object({
  reviewed_by: z.string().uuid(),
  review_notes: z.string().min(1),
})

draftsRouter.post('/:id/reject', async (req: Request, res: Response) => {
  const parsed = rejectSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { reviewed_by, review_notes } = parsed.data
  const draftId = req.params.id

  const { data: draft, error: draftErr } = await supabase
    .from('drafts')
    .update({ status: 'rejected', reviewed_by, review_notes, updated_at: new Date().toISOString() })
    .eq('id', draftId)
    .select('message_id')
    .single()

  if (draftErr) return res.status(500).json({ error: draftErr.message })

  await supabase
    .from('messages')
    .update({ status: 'discarded' })
    .eq('id', draft.message_id)

  await supabase.from('audit_log').insert({
    action_type: 'reject',
    user_id: reviewed_by,
    draft_id: draftId,
    message_id: draft.message_id,
    metadata: { reason: review_notes },
  })

  res.json({ ok: true })
})

// POST /api/drafts/:id/regenerate — request new AI draft via n8n
const regenerateSchema = z.object({
  reviewed_by: z.string().uuid(),
  instructions: z.string().optional(),
})

draftsRouter.post('/:id/regenerate', async (req: Request, res: Response) => {
  const parsed = regenerateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { reviewed_by, instructions } = parsed.data
  const draftId = req.params.id

  const { data: draft, error: draftErr } = await supabase
    .from('drafts')
    .select('message_id')
    .eq('id', draftId)
    .single()

  if (draftErr) return res.status(404).json({ error: draftErr.message })

  // Trigger n8n regeneration webhook (WF8)
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
  if (n8nWebhookUrl) {
    try {
      await fetch(`${n8nWebhookUrl}/webhook/draft-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate',
          draft_id: draftId,
          message_id: draft.message_id,
          instructions: instructions ?? '',
          user_id: reviewed_by,
        }),
      })
    } catch (err) {
      console.error('n8n webhook failed:', err)
    }
  }

  await supabase.from('audit_log').insert({
    action_type: 'regenerate',
    user_id: reviewed_by,
    draft_id: draftId,
    message_id: draft.message_id,
    metadata: { instructions: instructions ?? '' },
  })

  res.json({ ok: true, message: 'Regeneration requested' })
})

// POST /api/drafts/:id/reassign — reassign to another team member
const reassignSchema = z.object({
  reviewed_by: z.string().uuid(),
  assign_to: z.string().uuid(),
})

draftsRouter.post('/:id/reassign', async (req: Request, res: Response) => {
  const parsed = reassignSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { reviewed_by, assign_to } = parsed.data
  const draftId = req.params.id

  const { data: draft, error: draftErr } = await supabase
    .from('drafts')
    .update({ assigned_to: assign_to, updated_at: new Date().toISOString() })
    .eq('id', draftId)
    .select('message_id')
    .single()

  if (draftErr) return res.status(500).json({ error: draftErr.message })

  await supabase.from('audit_log').insert({
    action_type: 'reassign',
    user_id: reviewed_by,
    draft_id: draftId,
    message_id: draft.message_id,
    metadata: { assigned_to: assign_to },
  })

  res.json({ ok: true })
})
