import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh the session cookie (keeps the user logged in)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl
  const isLoginPage = pathname === '/login'
  const isRootPage = pathname === '/'
  const isPublic = isLoginPage || isRootPage

  // Unauthenticated user trying to access a protected route
  if (!isPublic && !session) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user visiting login page → send to inbox
  if (isLoginPage && session) {
    const inboxUrl = new URL('/inbox', req.url)
    return NextResponse.redirect(inboxUrl)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
