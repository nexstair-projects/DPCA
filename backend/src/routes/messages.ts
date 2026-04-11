import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

export const messagesRouter = Router()

// GET /api/messages — list messages with drafts (optional ?channel=gmail|whatsapp|instagram)
messagesRouter.get('/', async (req: Request, res: Response) => {
  let query = supabase
    .from('messages')
    .select('*, drafts(id, draft_text, tone_confidence, status)')
    .order('created_at', { ascending: false })
    .limit(100)

  const channel = req.query.channel as string | undefined
  if (channel && ['gmail', 'whatsapp', 'instagram'].includes(channel)) {
    query = query.eq('channel', channel)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/messages/:id — single message with full draft data
messagesRouter.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*, drafts(*)')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: error.message })
  res.json(data)
})

// GET /api/messages/stats/summary — dashboard-level stats
messagesRouter.get('/stats/summary', async (_req: Request, res: Response) => {
  const { data, error } = await supabase.rpc('get_dashboard_stats')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})
