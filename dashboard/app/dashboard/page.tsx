'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, parseISO } from 'date-fns'

// ── Types ──────────────────────────────────────────────────────────────────────

type Message = {
  id: string
  sender_name: string | null
  subject: string | null
  category: string | null
  status: string | null
  created_at: string
}

type Lead = {
  id: string
  client_names: string[] | null
  status: string
  created_at: string
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

// ── Page ────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()

  const { data: messages = [] } = useSWR<Message[]>('dash-messages', async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_name, subject, category, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return (data ?? []) as Message[]
  })

  const { data: leads = [] } = useSWR<Lead[]>('dash-leads', async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('leads')
      .select('id, client_names, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw error
    return (data ?? []) as Lead[]
  })

  const pending   = messages.filter(m => m.status === 'pending_review').length
  const approved  = messages.filter(m => m.status === 'approved').length
  const autoSent  = messages.filter(m => m.status === 'auto_sent').length
  const total     = messages.length
  const newLeads  = leads.filter(l => l.status === 'new').length
  const recent5   = messages.slice(0, 5)

  const relTime = (iso: string) => {
    try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }) }
    catch { return '' }
  }

  const statusDot = (s: string | null) =>
    s === 'approved' ? S.green : s === 'auto_sent' ? '#2d5a8a' : S.gold

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
              Overview
            </span>
          </div>
          <button onClick={() => router.push('/inbox')} style={{ padding: '6px 14px', borderRadius: 8, background: S.gold, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: S.sans }}>
            Go to Inbox →
          </button>
        </div>

        {/* ── CONTENT ────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* ── STAT CARDS ───────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
            {([
              [pending,  'Pending Review', S.gold],
              [approved, 'Approved',       S.green],
              [autoSent, 'Auto-Sent',      '#2d5a8a'],
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
                Recent Messages
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
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusDot(msg.status), flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: S.serif, fontSize: 13, fontWeight: 600, color: S.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {msg.sender_name ?? 'Unknown'}
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
                  const count = messages.filter(m => m.category === key).length
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
                        {(lead.client_names ?? []).join(' & ') || 'Unknown'}
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
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: S.green }} />
            System online
          </div>
        </div>
      </div>
    </div>
  )
}
