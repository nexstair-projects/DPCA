import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { messagesRouter } from './routes/messages'
import { draftsRouter } from './routes/drafts'
import { webhooksRouter } from './routes/webhooks'
import { healthRouter } from './routes/health'
import { inboxesRouter } from './routes/inboxes'
import { leadsRouter } from './routes/leads'
import { internalRouter } from './routes/internal'
import { requireAuth } from './middleware/auth'
import { requireHmac, requireInternalToken } from './middleware/hmac'

const app = express()
const PORT = process.env.PORT ?? 3001

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' }))
app.use(express.json({ limit: '1mb' }))
app.use(morgan('short'))

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter)
app.use('/api/messages', requireAuth, messagesRouter)
app.use('/api/drafts', requireAuth, draftsRouter)
app.use('/api/webhooks', requireHmac, webhooksRouter)
app.use('/api/inboxes', requireAuth, inboxesRouter)
app.use('/api/leads', requireAuth, leadsRouter)
app.use('/api/internal', requireInternalToken, internalRouter)

app.get('/', (_req, res) => {
  res.json({
    status: 'DPCA API running',
    endpoints: [
      '/api/health',
      '/api/messages',
      '/api/drafts',
      '/api/webhooks',
      '/api/inboxes',
      '/api/leads',
      '/api/internal',
    ],
  })
})

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`DPCA API running on :${PORT}`)
})

export default app
