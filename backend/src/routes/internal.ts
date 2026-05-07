import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { classifyMessage } from '../services/classifier'
import { generateDraft } from '../services/draftGenerator'
import { extractLead } from '../services/leadExtractor'
import { embedKbEntry } from '../services/embedder'
import { retrieveContext } from '../services/retrieval'
import { supabase } from '../lib/supabase'

export const internalRouter = Router()

// POST /api/internal/classify
internalRouter.post('/classify', async (req: Request, res: Response) => {
  const schema = z.object({ message_id: z.string().uuid() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  try {
    const result = await classifyMessage(parsed.data.message_id)
    res.json(result)
  } catch (err) {
    console.error('[/classify]', err)
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/internal/generate-draft
internalRouter.post('/generate-draft', async (req: Request, res: Response) => {
  const schema = z.object({
    message_id: z.string().uuid(),
    regeneration_instructions: z.string().optional(),
    previous_draft_text: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  try {
    const result = await generateDraft(
      parsed.data.message_id,
      parsed.data.regeneration_instructions,
      parsed.data.previous_draft_text,
    )
    res.json(result)
  } catch (err) {
    console.error('[/generate-draft]', err)
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/internal/extract-lead
internalRouter.post('/extract-lead', async (req: Request, res: Response) => {
  const schema = z.object({ message_id: z.string().uuid() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  try {
    const result = await extractLead(parsed.data.message_id)
    res.json(result)
  } catch (err) {
    console.error('[/extract-lead]', err)
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/internal/embed-kb
internalRouter.post('/embed-kb', async (req: Request, res: Response) => {
  const schema = z.object({ kb_id: z.string().uuid() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  try {
    await embedKbEntry(parsed.data.kb_id)
    res.json({ ok: true })
  } catch (err) {
    console.error('[/embed-kb]', err)
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/internal/retrieve
internalRouter.post('/retrieve', async (req: Request, res: Response) => {
  const schema = z.object({
    query: z.string().min(1),
    category: z.string(),
    top_k: z.number().int().min(1).max(10).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  try {
    const result = await retrieveContext(parsed.data.query, parsed.data.category, parsed.data.top_k)
    res.json(result)
  } catch (err) {
    console.error('[/retrieve]', err)
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/internal/dashboard-action
// Handles approve / reject / regenerate triggered from the dashboard via n8n (WF8)
internalRouter.post('/dashboard-action', async (req: Request, res: Response) => {
  const schema = z.object({
    action: z.enum(['approve', 'reject', 'regenerate']),
    draft_id: z.string().uuid(),
    message_id: z.string().uuid(),
    user_id: z.string().uuid().optional(),
    instructions: z.string().optional(),
    rejection_reason: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { action, draft_id, message_id, user_id, instructions, rejection_reason } = parsed.data

  try {
    if (action === 'approve') {
      await supabase
        .from('drafts')
        .update({ status: 'approved', reviewed_by: user_id ?? null })
        .eq('id', draft_id)
      await supabase.from('messages').update({ status: 'approved' }).eq('id', message_id)
    } else if (action === 'reject') {
      await supabase
        .from('drafts')
        .update({ status: 'rejected', reviewed_by: user_id ?? null, rejection_reason: rejection_reason ?? null })
        .eq('id', draft_id)
      await supabase.from('messages').update({ status: 'discarded' }).eq('id', message_id)
    } else if (action === 'regenerate') {
      // Fetch current draft text for P5 regen context
      const { data: draft } = await supabase
        .from('drafts')
        .select('draft_text')
        .eq('id', draft_id)
        .single()

      const result = await generateDraft(message_id, instructions, draft?.draft_text as string)
      return res.json(result)
    }

    if (user_id) {
      await supabase.from('audit_log').insert({
        action_type: action,
        user_id,
        draft_id,
        message_id,
        metadata: { instructions, rejection_reason },
      })
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('[/dashboard-action]', err)
    res.status(500).json({ error: String(err) })
  }
})
