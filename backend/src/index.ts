import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { messagesRouter } from './routes/messages'
import { draftsRouter } from './routes/drafts'
import { webhooksRouter } from './routes/webhooks'
import { healthRouter } from './routes/health'

const app = express()
const PORT = process.env.PORT ?? 3001

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' }))
app.use(express.json({ limit: '1mb' }))
app.use(morgan('short'))

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter)
app.use('/api/messages', messagesRouter)
app.use('/api/drafts', draftsRouter)
app.use('/api/webhooks', webhooksRouter)

//root route
app.get('/', (_req, res) => {
  res.json({
    status: 'DPCA API running',
    endpoints: [
      '/api/health',
      '/api/messages',
      '/api/drafts',
      '/api/webhooks'
    ]
  })
})

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`DPCA API running on :${PORT}`)
})

export default app
