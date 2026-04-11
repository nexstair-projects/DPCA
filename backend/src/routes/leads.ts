import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

export const leadsRouter = Router()

// GET /api/leads — list leads
leadsRouter.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/leads/:id — single lead
leadsRouter.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: error.message })
  res.json(data)
})
