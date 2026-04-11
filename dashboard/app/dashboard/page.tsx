'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import Sidebar from '@/components/Sidebar'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, parseISO } from 'date-fns'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'

// ── Types ──────────────────────────────────────────────────────────────────────

type Draft = { id: string; draft_text: string | null; tone_confidence: number | null; status: string | null }

type Message = {
  id: string
  sender_name: string | null
  sender_email: string | null
  subject: string | null
  category: string | null
  channel: string | null
  status: string | null
  created_at: string
  drafts: Draft[]
}

type Lead = {
  id: string
  client_name: string | null
  client_names: string[] | null
  status: string
  created_at: string
}

type Inbox = {
  id: string
  name: string
  channel: string
  email_address: string | null
  phone_number: string | null
  instagram_handle: string | null
  is_active: boolean
}

// ── Design tokens ──────────────────────────────────────────────────────────────

const S = {
  gold:   '#B8960C',
  dark:   '#1a1612',
  bg:     '#faf8f3',
  white:  '#ffffff',
  border: '#e8dfc8',
  text:   '#2c2416',
  muted:  '#9c8f6f',
  mid:    '#6b5d3f',
  green:  '#2d7a4e',
  blue:   '#2e5c8a',
  purple: '#833ab4',
  red:    '#c23b22',
  pale:   '#FDF6E3',
  serif:  "'Cormorant Garamond', Georgia, serif",
  sans:   "'DM Sans', system-ui, sans-serif",
}

const CAT: Record<string, { label: string; bg: string; color: string; border: string }> = {
  new_inquiry:     { label: 'New Inquiry', bg: '#fffbe6', color: '#7a5c00', border: '#f5d87a' },
  vendor:          { label: 'Vendor',      bg: '#edfaf2', color: '#1a5c35', border: '#7bd4a5' },
  existing_client: { label: 'Client',      bg: '#eff5ff', color: '#1a3a6e', border: '#90b8f0' },
  collaboration:   { label: 'Collab',      bg: '#f3eeff', color: '#5a2a8a', border: '#c0a0e0' },
  general:         { label: 'General',     bg: '#f5f5f5', color: '#5a5a5a', border: '#d0d0d0' },
}

const CHANNELS = {
  gmail:     { label: 'Gmail',     icon: '✉️',  color: '#c23b22', bg: '#fde8e8', borderColor: '#f0c0b8' },
  whatsapp:  { label: 'WhatsApp',  icon: '💬', color: '#25a244', bg: '#e8f7ee', borderColor: '#a0d8b0' },
  instagram: { label: 'Instagram', icon: '📸', color: '#833ab4', bg: '#f3eeff', borderColor: '#c0a0e0' },
}

// Status groupings — covers both original DB values and webhook-set values
const PENDING_STATUSES  = ['received', 'new', 'processing', 'classified', 'draft_ready', 'pending_review', 'needs_human_reply']
const APPROVED_STATUSES = ['approved', 'edited_approved']
const SENT_STATUSES     = ['auto_sent', 'auto_approved', 'sent', 'replied']

// ── Page ────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [channelFilter, setChannelFilter] = useState<string>('all')

  // Fetch from backend API (service_role — bypasses RLS)
  const { data: messages = [] } = useSWR<Message[]>('dash-messages', async () => {
    const res = await fetch(`${BACKEND_URL}/api/messages`)
    if (!res.ok) throw new Error('Failed to fetch messages')
    return res.json()
  })

  const { data: leads = [] } = useSWR<Lead[]>('dash-leads', async () => {
    const res = await fetch(`${BACKEND_URL}/api/leads`)
    if (!res.ok) throw new Error('Failed to fetch leads')
    return res.json()
  })

  const { data: inboxes = [] } = useSWR<Inbox[]>('dash-inboxes', async () => {
    const res = await fetch(`${BACKEND_URL}/api/inboxes`)
    if (!res.ok) throw new Error('Failed to fetch inboxes')
    return res.json()
  })

  // Apply channel filter
  const filtered = useMemo(() => {
    if (channelFilter === 'all') return messages
    return messages.filter(m => m.channel === channelFilter)
  }, [messages, channelFilter])

  // Stats based on filtered messages
  const pending   = filtered.filter(m => PENDING_STATUSES.includes(m.status ?? '')).length
  const approved  = filtered.filter(m => APPROVED_STATUSES.includes(m.status ?? '')).length
  const sent      = filtered.filter(m => SENT_STATUSES.includes(m.status ?? '')).length
  const total     = filtered.length
  const newLeads  = leads.filter(l => l.status === 'new').length
  const recent5   = filtered.slice(0, 5)

  // Channel counts (always from all messages)
  const channelCounts = useMemo(() => {
    const counts = { gmail: 0, whatsapp: 0, instagram: 0 }
    messages.forEach(m => {
      const ch = (m.channel ?? '').toLowerCase()
      if (ch in counts) counts[ch as keyof typeof counts]++
    })
    return counts
  }, [messages])

  const relTime = (iso: string) => {
    try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }) }
    catch { return '' }
  }

  const statusDot = (s: string | null) => {
    if (APPROVED_STATUSES.includes(s ?? '')) return S.green
    if (SENT_STATUSES.includes(s ?? '')) return S.blue
    return S.gold
  }

  const channelIcon = (ch: string | null) =>
    CHANNELS[(ch ?? '').toLowerCase() as keyof typeof CHANNELS]?.icon ?? '✉️'

  return (
    <div style={{ display: 'flex', height: '100vh', background: S.bg, fontFamily: S.sans }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* ── TOPBAR ─────────────────────────────────────────────────────── */}
        <div style={{ background: S.white, borderBottom: `1px solid ${S.border}`, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontFamily: S.serif, fontSize: 18, fontWeight: 600, color: S.dark, margin: 0 }}>
              Dashboard
            </h1>
            <span style={{ background: S.pale, color: S.gold, border: `1px solid ${S.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 500 }}>
              {channelFilter === 'all' ? 'All Channels' : CHANNELS[channelFilter as keyof typeof CHANNELS]?.label ?? 'Overview'}
            </span>
          </div>
          <button onClick={() => router.push('/inbox')} style={{ padding: '6px 14px', borderRadius: 8, background: S.gold, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: S.sans }}>
            Go to Inbox →
          </button>
        </div>

        {/* ── CONTENT ────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* ── CHANNEL CARDS ────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            {(Object.entries(CHANNELS) as [string, typeof CHANNELS['gmail']][]).map(([key, ch]) => {
              const inbox = inboxes.find(i => i.channel === key)
              const count = channelCounts[key as keyof typeof channelCounts] ?? 0
              const pendingCh = messages.filter(m => m.channel === key && PENDING_STATUSES.includes(m.status ?? '')).length
              const isActive = channelFilter === key
              return (
                <div
                  key={key}
                  onClick={() => setChannelFilter(isActive ? 'all' : key)}
                  style={{
                    background: isActive ? ch.bg : S.white,
                    border: `1.5px solid ${isActive ? ch.borderColor : S.border}`,
                    borderRadius: 12, padding: '16px 18px', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{ch.icon}</span>
                      <span style={{ fontFamily: S.serif, fontSize: 15, fontWeight: 600, color: S.dark }}>{ch.label}</span>
                    </div>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: inbox?.is_active ? S.green : '#ccc',
                    }} />
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div>
                      <div style={{ fontFamily: S.serif, fontSize: 24, fontWeight: 600, color: ch.color, lineHeight: 1 }}>{count}</div>
                      <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>messages</div>
                    </div>
                    {pendingCh > 0 && (
                      <div>
                        <div style={{ fontFamily: S.serif, fontSize: 24, fontWeight: 600, color: S.gold, lineHeight: 1 }}>{pendingCh}</div>
                        <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>pending</div>
                      </div>
                    )}
                  </div>
                  {inbox && (
                    <div style={{ marginTop: 8, fontSize: 10, color: S.muted }}>
                      {inbox.email_address || inbox.phone_number || inbox.instagram_handle || 'Not configured'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── STAT CARDS ───────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
            {([
              [pending,  'Pending Review', S.gold],
              [approved, 'Approved',       S.green],
              [sent,     'Sent',           S.blue],
              [total,    'Total Messages',  S.dark],
              [newLeads, 'New Leads',       '#5a2a8a'],
            ] as [number, string, string][]).map(([val, lbl, col]) => (
              <div key={lbl} style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: '18px 16px' }}>
                <div style={{ fontFamily: S.serif, fontSize: 28, fontWeight: 600, color: col, lineHeight: 1, marginBottom: 4 }}>{val}</div>
                <div style={{ fontSize: 11, color: S.muted }}>{lbl}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

            {/* ── RECENT MESSAGES ─────────────────────────────────────────── */}
            <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: S.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                Recent Messages {channelFilter !== 'all' && `· ${CHANNELS[channelFilter as keyof typeof CHANNELS]?.label}`}
              </div>
              {recent5.length === 0 ? (
                <div style={{ fontSize: 13, color: S.muted, padding: '20px 0' }}>No messages yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recent5.map(msg => {
                    const cat = CAT[msg.category ?? 'general'] ?? CAT.general
                    return (
                      <div
                        key={msg.id}
                        onClick={() => router.push('/inbox')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: `1px solid ${S.border}`, borderRadius: 10, cursor: 'pointer', transition: 'all 0.12s' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusDot(msg.status) }} />
                            <span style={{ fontSize: 12 }}>{channelIcon(msg.channel)}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: S.serif, fontSize: 13, fontWeight: 600, color: S.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {msg.sender_name ?? msg.sender_email ?? 'Unknown'}
                            </div>
                            <div style={{ fontSize: 11, color: S.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {msg.subject ?? '(no subject)'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                          <span style={{ padding: '1px 8px', borderRadius: 12, fontSize: 9, background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}>
                            {cat.label}
                          </span>
                          <span style={{ fontSize: 10, color: S.muted }}>{relTime(msg.created_at)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Category breakdown */}
              <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: S.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                  By Category
                </div>
                {Object.entries(CAT).map(([key, cat]) => {
                  const count = filtered.filter(m => m.category === key).length
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0
                  return (
                    <div key={key} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: S.text }}>{cat.label}</span>
                        <span style={{ color: S.muted }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: '#f0ebe0' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: cat.color, width: `${pct}%`, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Channel distribution */}
              <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: S.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                  Channel Distribution
                </div>
                {(Object.entries(CHANNELS) as [string, typeof CHANNELS['gmail']][]).map(([key, ch]) => {
                  const count = channelCounts[key as keyof typeof channelCounts] ?? 0
                  const totalAll = messages.length || 1
                  const pct = Math.round((count / totalAll) * 100)
                  return (
                    <div key={key} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: S.text, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12 }}>{ch.icon}</span> {ch.label}
                        </span>
                        <span style={{ color: S.muted }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: '#f0ebe0' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: ch.color, width: `${pct}%`, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Recent leads */}
              <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: S.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                  Recent Leads
                </div>
                {leads.slice(0, 5).length === 0 ? (
                  <div style={{ fontSize: 13, color: S.muted }}>No leads yet</div>
                ) : (
                  leads.slice(0, 5).map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => router.push('/leads')}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid #f0e8d4`, cursor: 'pointer' }}
                    >
                      <div style={{ fontFamily: S.serif, fontSize: 13, fontWeight: 500, color: S.dark }}>
                        {lead.client_name || (lead.client_names ?? []).join(' & ') || 'Unknown'}
                      </div>
                      <span style={{ fontSize: 9, textTransform: 'capitalize', color: S.muted }}>
                        {lead.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── STATS BAR ──────────────────────────────────────────────────── */}
        <div style={{ background: S.white, borderTop: `1px solid ${S.border}`, padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0, fontSize: 11, color: S.muted }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: S.gold }} />
            <strong style={{ color: S.text }}>{pending}</strong>&nbsp;pending
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: S.green }} />
            <strong style={{ color: S.text }}>{approved}</strong>&nbsp;approved
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5a2a8a' }} />
            <strong style={{ color: S.text }}>{newLeads}</strong>&nbsp;new leads
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>
              ✉️ {channelCounts.gmail} &nbsp;💬 {channelCounts.whatsapp} &nbsp;📸 {channelCounts.instagram}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: S.green }} />
              System online
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
