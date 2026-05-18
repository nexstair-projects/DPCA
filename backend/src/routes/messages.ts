import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

export const messagesRouter = Router()

type MessageRow = {
  id: string
  thread_id?: string | null
  message_external_id?: string | null
  created_at?: string | null
  received_at?: string | null
  status?: string | null
  labels?: string[] | null
  drafts?: Array<{ id: string; created_at?: string | null; version?: number | null }>
  [key: string]: unknown
}

const messageTime = (message: MessageRow) => {
  const raw = message.received_at ?? message.created_at
  const time = raw ? Date.parse(raw) : 0
  return Number.isFinite(time) ? time : 0
}

const isSentMessage = (message: MessageRow) => {
  const labels = Array.isArray(message.labels) ? message.labels : []
  return labels.includes('SENT') || ['sent', 'replied', 'auto_sent'].includes(message.status ?? '')
}

const threadKey = (message: MessageRow) =>
  message.thread_id ?? message.message_external_id ?? message.id

const buildThreadedMessages = (rows: MessageRow[]) => {
  const groups = new Map<string, MessageRow[]>()

  for (const row of rows) {
    const key = threadKey(row)
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  return [...groups.values()]
    .map((conversation) => {
      const sortedConversation = [...conversation].sort((a, b) => messageTime(a) - messageTime(b))
      const latest = sortedConversation[sortedConversation.length - 1]
      const latestCustomer =
        [...sortedConversation].reverse().find((message) => !isSentMessage(message)) ?? latest

      return {
        ...latestCustomer,
        latest_message_at: latest.received_at ?? latest.created_at,
        conversation_count: sortedConversation.length,
        conversation: sortedConversation,
      }
    })
    .sort((a, b) => messageTime(b) - messageTime(a))
}

// GET /api/messages - list thread conversations with drafts (optional ?channel=gmail|whatsapp|instagram)
messagesRouter.get('/', async (req: Request, res: Response) => {
  let query = supabase
    .from('messages')
    .select('*, drafts(id, draft_text, edited_text, original_draft_text, tone_confidence, status, version, context_sources, sender_persona, subject_line, created_at)')
    .order('created_at', { ascending: false })
    .limit(500)

  const channel = req.query.channel as string | undefined
  if (channel && ['gmail', 'whatsapp', 'instagram'].includes(channel)) {
    query = query.eq('channel', channel)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const rows = (data ?? []) as MessageRow[]
  res.json(req.query.view === 'flat' ? rows : buildThreadedMessages(rows))
})

// GET /api/messages/stats/summary - dashboard-level stats
messagesRouter.get('/stats/summary', async (_req: Request, res: Response) => {
  const { data, error } = await supabase.rpc('get_dashboard_stats')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/messages/:id - single message with full draft data
messagesRouter.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*, drafts(*)')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: error.message })
  res.json(data)
})
