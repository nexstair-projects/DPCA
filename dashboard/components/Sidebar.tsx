'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const S = {
  dark:   '#1a1612',
  gold:   '#B8960C',
  pale:   '#FDF6E3',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.45)',
  text:   'rgba(255,255,255,0.88)',
  serif:  "'Cormorant Garamond', Georgia, serif",
  sans:   "'DM Sans', system-ui, sans-serif",
}

const NAV = [
  {
    section: 'Inbox',
    items: [
      { href: '/inbox',                    icon: '📋', label: 'All Messages' },
      { href: '/inbox?channel=gmail',      icon: '✉️',  label: 'Gmail' },
      { href: '/inbox?channel=whatsapp',   icon: '💬', label: 'WhatsApp' },
      { href: '/inbox?channel=instagram',  icon: '📸', label: 'Instagram' },
    ],
  },
  {
    section: 'Manage',
    items: [
      { href: '/leads',          icon: '👥', label: 'Leads' },
      { href: '/knowledge-base', icon: '🧠', label: 'Knowledge Base' },
    ],
  },
  {
    section: 'Settings',
    items: [
      { href: '/settings', icon: '⚙️', label: 'Settings' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const searchParams = useSearchParams()
  const [email,   setEmail]   = useState('')
  const [initial, setInitial] = useState('U')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then((result: Awaited<ReturnType<typeof supabase.auth.getUser>>) => {
      const user = result.data?.user
      if (user?.email) {
        setEmail(user.email)
        setInitial(user.email[0].toUpperCase())
      }
    })
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside style={{ width: 220, flexShrink: 0, background: S.dark, display: 'flex', flexDirection: 'column', fontFamily: S.sans }}>

      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: `1px solid ${S.border}` }}>
        <div style={{ fontFamily: S.serif, fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.2, marginBottom: 4 }}>
          Dream Paris Wedding
        </div>
        <div style={{ fontSize: 10, color: S.muted, letterSpacing: '0.08em', marginBottom: 10 }}>AI COMMAND CENTRE</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(45,122,78,0.18)', borderRadius: 12, padding: '3px 10px', fontSize: 10, color: '#4dbb80' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4dbb80', display: 'inline-block' }} />
          AI Active
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
        {NAV.map(group => (
          <div key={group.section} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: S.muted, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: 4 }}>
              {group.section}
            </div>
            {group.items.map(item => {
              const [itemPath, itemQuery] = item.href.split('?')
              const itemChannel = itemQuery ? new URLSearchParams(itemQuery).get('channel') : null
              const currentChannel = searchParams.get('channel')
              const active = itemChannel
                ? pathname.startsWith(itemPath) && currentChannel === itemChannel
                : pathname.startsWith(itemPath) && !currentChannel
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8, marginBottom: 1,
                    fontSize: 12, fontWeight: active ? 600 : 400,
                    color: active ? S.gold : S.text,
                    background: active ? 'rgba(184,150,12,0.12)' : 'transparent',
                    textDecoration: 'none', transition: 'all 0.12s',
                  }}
                >
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 16px', borderTop: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: S.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: S.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email || '…'}
          </div>
          <button
            onClick={handleLogout}
            style={{ fontSize: 10, color: S.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: S.sans }}
          >
            Sign out
          </button>
        </div>
      </div>

    </aside>
  )
}
