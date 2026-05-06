import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

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

  console.log(`[Auth] ${req.method} ${req.path} | header=${header ? 'present' : 'MISSING'} | token=${token ? token.slice(0, 20) + '…' : 'NULL'}`)

  if (!token) return res.status(401).json({ error: 'Missing bearer token' })

  // Create a fresh client per-request so there is no stale auth state
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { data, error } = await client.auth.getUser(token)

  console.log(`[Auth] getUser → user=${data?.user?.id ?? 'null'} | error=${error?.message ?? 'none'}`)

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid token', detail: error?.message ?? 'no user returned' })
  }

  const { data: userRow, error: userErr } = await client
    .from('users')
    .select('id, auth_id, email, role, is_active')
    .eq('auth_id', data.user.id)
    .single()

  console.log(`[Auth] users table → id=${userRow?.id ?? 'null'} | error=${userErr?.message ?? 'none'}`)

  if (userErr || !userRow || !userRow.is_active) {
    return res.status(403).json({ error: 'User not provisioned or inactive', detail: userErr?.message })
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
