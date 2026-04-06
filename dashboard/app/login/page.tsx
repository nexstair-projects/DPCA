'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/inbox')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 28, fontWeight: 600, color: '#1a1612', marginBottom: 4 }}>
            Dream Paris Wedding
          </div>
          <div style={{ fontSize: 12, color: '#9c8f6f', letterSpacing: '0.06em' }}>AI COMMAND CENTRE</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, background: '#FDF6E3', border: '1px solid #e8dfc8', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#B8960C' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2d7a4e', display: 'inline-block' }} />
            AI Assistant Active
          </div>
        </div>

        {/* Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e8dfc8', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(26,22,18,0.06)' }}>
          <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 22, fontWeight: 600, color: '#1a1612', marginBottom: 6, marginTop: 0 }}>
            Sign In
          </h2>
          <p style={{ fontSize: 12, color: '#9c8f6f', marginBottom: 28, marginTop: 0 }}>Access your assistant dashboard</p>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: '#fff8f8', border: '1px solid #e8c0c0', borderRadius: 8, padding: '10px 14px', color: '#8b3a3a', fontSize: 12, marginBottom: 20 }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b5d3f', marginBottom: 6, letterSpacing: '0.04em' }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e8dfc8', borderRadius: 8, fontSize: 13, color: '#2c2416', background: '#faf8f3', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b5d3f', marginBottom: 6, letterSpacing: '0.04em' }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e8dfc8', borderRadius: 8, fontSize: 13, color: '#2c2416', background: '#faf8f3', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '11px 0', background: loading ? '#c9a84c' : '#B8960C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em' }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#9c8f6f', marginTop: 24, marginBottom: 0 }}>
            🔒 Access restricted to authorised team members
          </p>
        </div>
      </div>
    </div>
  )
}
