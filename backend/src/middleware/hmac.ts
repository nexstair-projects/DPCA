import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

export function requireHmac(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) return res.status(500).json({ error: 'N8N_WEBHOOK_SECRET not configured' })

  const sig = req.header('x-dpca-signature') ?? ''
  const body = JSON.stringify(req.body)
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')

  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return res.status(401).json({ error: 'Invalid webhook signature' })
  }
  next()
}

export function requireInternalToken(req: Request, res: Response, next: NextFunction) {
  const token = req.header('x-internal-token') ?? ''
  if (!token || token !== process.env.INTERNAL_API_TOKEN) {
    return res.status(401).json({ error: 'Invalid internal token' })
  }
  next()
}
