import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

export const inboxesRouter = Router()

// GET /api/inboxes — list all connected inboxes
inboxesRouter.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('inboxes')
    .select('id, name, channel, email_address, phone_number, instagram_handle, is_active, assigned_users, created_at')
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})
