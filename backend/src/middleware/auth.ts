import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AuthedRequest extends Request {
  user?: {
    id: string
    auth_id: string
    email: string
    role: 'admin' | 'manager' | 'team_member'
  }
  userJwt?: string
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing bearer token' })

  const { data, error } = await adminClient.auth.getUser(token)
  if (error || !data.user) return res.status(401).json({ error: 'Invalid token' })

  const { data: userRow, error: userErr } = await adminClient
    .from('users')
    .select('id, auth_id, email, role, is_active')
    .eq('auth_id', data.user.id)
    .single()

  if (userErr || !userRow || !userRow.is_active) {
    return res.status(403).json({ error: 'User not provisioned or inactive' })
  }

  req.user = {
    id: userRow.id,
    auth_id: userRow.auth_id,
    email: userRow.email,
    role: userRow.role as 'admin' | 'manager' | 'team_member',
  }
  req.userJwt = token
  next()
}

export function requireRole(...roles: Array<'admin' | 'manager' | 'team_member'>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient role' })
    next()
  }
}
