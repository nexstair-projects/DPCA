'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { useSearchParams } from 'next/navigation'
import { formatDistanceToNow, parseISO } from 'date-fns'

// ── Types ──────────────────────────────────────────────────────────────────────

type Draft = {
  id: string
  draft_text: string | null
  tone_confidence: number | null
}

type Message = {
  id: string
  sender_name: string | null
  sender_email: string | null
  subject: string | null
  body_raw: string | null
  category: string | null
  priority: string | null
  tier: number | null
  channel: string | null
  estimated_value: number | null
  guest_count: number | null
  confidence_score: number | null
  status: string | null
  created_at: string
  classified_at: string | null
  drafts: Draft[]
}

// ── Design tokens ──────────────────────────────────────────────────────────────

const S = {
  gold:   '#B8960C',
  goldLight: '#D4AF37',
  dark:   '#1a1612',
  bg:     '#faf8f3',
  white:  '#ffffff',
  border: '#e8dfc8',
  text:   '#2c2416',
  muted:  '#9c8f6f',
  mid:    '#6b5d3f',
  green:  '#2d7a4e',
  red:    '#8b3a3a',
  redBg:  '#fde8e8',
  blue:   '#2e5c8a',
  purple: '#833ab4',
  pale:   '#FDF6E3',
  serif:  "'Cormorant Garamond', Georgia, serif",
  sans:   "'DM Sans', system-ui, sans-serif",
}

// ── Category look-up ────────────────────────────────────────────────────────────

const CAT: Record<string, { label: string; bg: string; color: string; border: string }> = {
  new_inquiry:     { label: 'New Inquiry', bg: '#fffbe6', color: '#7a5c00', border: '#f5d87a' },
  vendor:          { label: 'Vendor',      bg: '#edfaf2', color: '#1a5c35', border: '#7bd4a5' },
  existing_client: { label: 'Client',      bg: '#eff5ff', color: '#1a3a6e', border: '#90b8f0' },
  collaboration:   { label: 'Collab',      bg: '#f3eeff', color: '#5a2a8a', border: '#c0a0e0' },
  general:         { label: 'General',     bg: '#f5f5f5', color: '#5a5a5a', border: '#d0d0d0' },
}

const catMeta = (key: string | null) => CAT[key ?? 'general'] ?? CAT.general

const FILTERS = [
  { key: 'all',             label: 'All' },
  { key: 'new_inquiry',     label: 'Inquiry' },
  { key: 'existing_client', label: 'Client' },
  { key: 'vendor',          label: 'Vendor' },
  { key: 'collaboration',   label: 'Collab' },
]

// ── Small reusable pieces ──────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string | null }) {
  const m = catMeta(category)
  return (
    <span style={{ padding: '1px 8px', borderRadius: 12, fontSize: 10, background: m.bg, color: m.color, border: `1px solid ${m.border}`, whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 11 }}>
      <span style={{ color: S.muted }}>{label}</span>
      <span style={{ color: S.text, fontWeight: 500 }}>{children}</span>
    </div>
  )
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'

// Status groupings
const PENDING_STATUSES  = ['received', 'new', 'processing', 'classified', 'draft_ready', 'pending_review', 'needs_human_reply']
const APPROVED_STATUSES = ['approved', 'edited_approved']
const SENT_STATUSES     = ['auto_sent', 'auto_approved', 'sent', 'replied']

const CHANNEL_TABS = [
  { key: 'all',       label: 'All',       icon: '' },
  { key: 'gmail',     label: 'Gmail',     icon: '✉️' },
  { key: 'whatsapp',  label: 'WhatsApp',  icon: '💬' },
  { key: 'instagram', label: 'Instagram', icon: '📸' },
]

// ── Page ────────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const searchParams = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter]         = useState('all')
  const [channelFilter, setChannelFilter] = useState(searchParams.get('channel') ?? 'all')
  const [draftText, setDraftText]   = useState('')
  const [userId, setUserId]         = useState<string | null>(null)

  // Get current user ID for audit logging
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const { data: messages = [], isLoading, mutate } = useSWR<Message[]>('inbox-messages', async () => {
    const res = await fetch(`${BACKEND_URL}/api/messages`)
    if (!res.ok) throw new Error('Failed to fetch messages')
    return res.json()
  })

  const selected = messages.find(m => m.id === selectedId) ?? null

  useEffect(() => {
    if (selected) setDraftText(selected.drafts?.[0]?.draft_text ?? '')
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let result = messages
    if (channelFilter !== 'all') result = result.filter(m => m.channel === channelFilter)
    if (filter !== 'all') result = result.filter(m => m.category === filter)
    return result
  }, [messages, channelFilter, filter])

  const handleSelect = useCallback((msg: Message) => {
    setSelectedId(msg.id)
    setDraftText(msg.drafts?.[0]?.draft_text ?? '')
  }, [])

  const advanceSelection = useCallback(() => {
    if (!selected) return
    const idx = filtered.findIndex(m => m.id === selected.id)
    const next = filtered[idx + 1] ?? filtered[idx - 1] ?? null
    if (next) handleSelect(next)
    else setSelectedId(null)
  }, [selected, filtered, handleSelect])

  const handleApprove = async () => {
    if (!selected || !userId) return
    const draftId = selected.drafts?.[0]?.id
    if (draftId) {
      const editedText = draftText !== selected.drafts[0]?.draft_text ? draftText : undefined
      await fetch(`${BACKEND_URL}/api/drafts/${draftId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewed_by: userId, edited_text: editedText }),
      })
    } else {
      const supabase = createClient()
      await supabase.from('messages').update({ status: 'approved' }).eq('id', selected.id)
    }
    mutate()
    advanceSelection()
  }

  const handleDiscard = async () => {
    if (!selected || !userId) return
    const draftId = selected.drafts?.[0]?.id
    if (draftId) {
      await fetch(`${BACKEND_URL}/api/drafts/${draftId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewed_by: userId, review_notes: 'Discarded from inbox' }),
      })
    } else {
      const supabase = createClient()
      await supabase.from('messages').update({ status: 'discarded' }).eq('id', selected.id)
    }
    mutate()
    advanceSelection()
  }

  const pendingCount  = messages.filter(m => PENDING_STATUSES.includes(m.status ?? '')).length
  const approvedCount = messages.filter(m => APPROVED_STATUSES.includes(m.status ?? '')).length
  const autoSentCount = messages.filter(m => SENT_STATUSES.includes(m.status ?? '')).length
  const activeDraft   = selected?.drafts?.[0]
  const [sendingMode, setSendingMode] = useState<'auto' | 'approve' | 'draft'>('approve')

  // Channel activity counts
  const channelCounts = useMemo(() => {
    const counts = { gmail: 0, whatsapp: 0, instagram: 0 }
    messages.forEach(m => {
      const ch = (m.channel ?? 'gmail').toLowerCase()
      if (ch in counts) counts[ch as keyof typeof counts]++
    })
    const total = Math.max(counts.gmail + counts.whatsapp + counts.instagram, 1)
    return { ...counts, total }
  }, [messages])

  // Average tone score
  const avgToneScore = useMemo(() => {
    const scores = messages
      .flatMap(m => m.drafts)
      .map(d => d?.tone_confidence)
      .filter((s): s is number => s != null)
    return scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) : null
  }, [messages])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); handleApprove() }
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); handleDiscard() }
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault()
        const idx = selected ? filtered.findIndex(m => m.id === selected.id) : -1
        const next = filtered[idx + 1]
        if (next) handleSelect(next)
      }
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        const idx = selected ? filtered.findIndex(m => m.id === selected.id) : filtered.length
        const prev = filtered[idx - 1]
        if (prev) handleSelect(prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }) // intentionally no deps — always uses latest state

  const relativeTime = (iso: string) => {
    try { return formatDistanceToNow(parseISO(iso), { addSuffix: false }) }
    catch { return '' }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: S.bg, fontFamily: S.sans }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* ── TOPBAR ──────────────────────────────────────────────────────── */}
        <div style={{ background: S.white, borderBottom: `1px solid ${S.border}`, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontFamily: S.serif, fontSize: 18, fontWeight: 600, color: S.dark, margin: 0 }}>
              Approval Queue
            </h1>
            {pendingCount > 0 && (
              <span style={{ background: S.pale, color: S.gold, border: `1px solid ${S.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 500 }}>
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => mutate()} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${S.border}`, background: S.white, color: S.mid, fontSize: 12, cursor: 'pointer', fontFamily: S.sans }}>
              ⟳ Refresh
            </button>
            <button style={{ padding: '6px 14px', borderRadius: 8, background: S.gold, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: S.sans }}>
              ✓ Approve All Safe
            </button>
          </div>
        </div>

        {/* ── 3-PANEL CONTENT ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* ── INBOX LIST PANEL ──────────────────────────────────────────── */}
          <div style={{ width: 310, flexShrink: 0, borderRight: `1px solid ${S.border}`, display: 'flex', flexDirection: 'column', background: S.white }}>

            {/* Channel tabs */}
            <div style={{ padding: '8px 12px 0', borderBottom: `1px solid ${S.border}` }}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                {CHANNEL_TABS.map(ch => (
                  <button
                    key={ch.key}
                    onClick={() => setChannelFilter(ch.key)}
                    style={{
                      padding: '4px 9px', borderRadius: 6, border: 'none',
                      background: channelFilter === ch.key ? S.dark : 'transparent',
                      color: channelFilter === ch.key ? '#fff' : S.muted,
                      fontSize: 10, fontWeight: channelFilter === ch.key ? 600 : 400,
                      cursor: 'pointer', fontFamily: S.sans, transition: 'all 0.12s',
                    }}
                  >
                    {ch.icon} {ch.label}
                  </button>
                ))}
              </div>
              {/* Category filter tabs */}
              <div style={{ display: 'flex', gap: 2 }}>
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    style={{
                      padding: '5px 9px', borderRadius: '6px 6px 0 0', border: 'none',
                      background: filter === f.key ? S.gold : 'transparent',
                      color: filter === f.key ? '#fff' : S.muted,
                      fontSize: 10.5, fontWeight: filter === f.key ? 600 : 400,
                      cursor: 'pointer', fontFamily: S.sans, transition: 'all 0.12s',
                    }}
                  >
                    {f.label}{f.key === 'all' ? ` (${filtered.length})` : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Message list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {isLoading && (
                <div style={{ padding: 24, color: S.muted, fontSize: 13 }}>Loading messages…</div>
              )}
              {!isLoading && filtered.length === 0 && (
                <div style={{ padding: 24, color: S.muted, fontSize: 13 }}>No messages</div>
              )}
              {filtered.map(msg => {
                const isActive = msg.id === selectedId
                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelect(msg)}
                    style={{
                      padding: '14px 16px', borderBottom: `1px solid #f0e8d4`,
                      cursor: 'pointer', transition: 'all 0.12s',
                      background: isActive ? S.pale : 'transparent',
                      borderLeft: `2px solid ${isActive ? S.gold : 'transparent'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <div style={{ fontFamily: S.serif, fontSize: 14, fontWeight: 600, color: S.dark }}>
                        {msg.sender_name ?? 'Unknown'}
                      </div>
                      <div style={{ fontSize: 10, color: S.muted, flexShrink: 0, marginLeft: 8 }}>
                        {relativeTime(msg.created_at)}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: S.text, fontWeight: 500, marginBottom: 3 }}>
                      {msg.subject ?? '(no subject)'}
                    </div>
                    <div style={{ fontSize: 11, color: S.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(msg.body_raw ?? '').substring(0, 80)}
                    </div>
                    <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: msg.status === 'approved' ? S.green : msg.status === 'auto_sent' ? '#2d5a8a' : S.gold }} />
                      <CategoryBadge category={msg.category} />
                      {(msg.tier === 3 || (msg.estimated_value != null && msg.estimated_value >= 5000)) && (
                        <span style={{ padding: '1px 7px', borderRadius: 10, fontSize: 9.5, background: S.redBg, color: S.red, border: '1px solid #e8c0c0', whiteSpace: 'nowrap' }}>High Value</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── REVIEW + META ──────────────────────────────────────────────── */}
          {selected ? (
            <>
              {/* Review panel */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Review header */}
                <div style={{ padding: '12px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: S.white }}>
                  <div>
                    <div style={{ fontFamily: S.serif, fontSize: 18, fontWeight: 600, color: S.dark }}>
                      {selected.sender_name}
                    </div>
                    <div style={{ fontSize: 11, color: S.muted, marginTop: 3, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {selected.sender_email && <span>✉️ {selected.sender_email}</span>}
                      <span>🕐 {new Date(selected.created_at).toLocaleDateString()} {new Date(selected.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>📍 Via {(selected.channel ?? 'Gmail').replace(/^\w/, c => c.toUpperCase())}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                    <button onClick={() => setSelectedId(null)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${S.border}`, background: S.white, color: S.mid, fontSize: 12, cursor: 'pointer', fontFamily: S.sans }}>
                      ↩ Skip
                    </button>
                    <button onClick={handleDiscard} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e8c0c0', background: '#fff8f8', color: '#8b3a3a', fontSize: 12, cursor: 'pointer', fontFamily: S.sans }}>
                      ✕ Discard
                    </button>
                    <button onClick={handleApprove} style={{ padding: '6px 14px', borderRadius: 8, background: S.gold, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: S.sans }}>
                      ✓ Approve &amp; Send
                    </button>
                  </div>
                </div>

                {/* Review body — two columns */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                  {/* Original message */}
                  <div style={{ flex: 1, padding: 20, overflowY: 'auto', borderRight: `1px solid ${S.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: S.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                      Original Message
                    </div>
                    <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20, fontSize: 13, color: S.text, lineHeight: 1.75 }}>
                      {(selected.body_raw ?? '(no content)').split('\n').map((line, i) => (
                        <p key={i} style={{ margin: '0 0 10px' }}>{line || <br />}</p>
                      ))}
                    </div>
                  </div>

                  {/* AI Draft */}
                  <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ background: S.dark, color: '#D4AF37', padding: '2px 9px', borderRadius: 12, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>
                        ✦ AI DRAFT
                      </span>
                      {activeDraft?.tone_confidence != null && (
                        <span style={{ fontSize: 10, color: S.green }}>
                          {activeDraft.tone_confidence}% tone match
                        </span>
                      )}
                    </div>
                    <textarea
                      value={draftText}
                      onChange={e => setDraftText(e.target.value)}
                      style={{ flex: 1, minHeight: 260, padding: 16, border: `1px solid ${S.border}`, borderRadius: 12, fontSize: 13, color: S.text, lineHeight: 1.75, fontFamily: S.sans, resize: 'none', background: '#fffdf8', outline: 'none' }}
                    />
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: S.muted }}>
                      <span>✎ Click to edit before sending</span>
                      <span>{draftText.length} characters</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* ── META PANEL ──────────────────────────────────────────── */}
              <div style={{ width: 220, flexShrink: 0, borderLeft: `1px solid ${S.border}`, padding: '18px 16px', overflowY: 'auto', background: S.white, display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Classification */}
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: S.muted, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${S.border}` }}>
                    Classification
                  </div>
                  <MetaRow label="Category"><CategoryBadge category={selected.category} /></MetaRow>
                  <MetaRow label="Priority">
                    {(() => {
                      const p = selected.priority ?? 'medium'
                      const cfg: Record<string, { bg: string; color: string }> = {
                        high:   { bg: S.redBg, color: S.red },
                        medium: { bg: S.pale, color: S.gold },
                        low:    { bg: '#f5f5f5', color: '#666' },
                      }
                      const c = cfg[p] ?? cfg.medium
                      return <span style={{ background: c.bg, color: c.color, padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600, textTransform: 'capitalize' }}>{p}</span>
                    })()}
                  </MetaRow>
                  <MetaRow label="Source">{(selected.channel ?? 'Gmail').replace(/^\w/, c => c.toUpperCase())}</MetaRow>
                  {selected.estimated_value != null && (
                    <MetaRow label="Est. Value"><span style={{ color: S.green }}>&euro;{selected.estimated_value.toLocaleString()}+</span></MetaRow>
                  )}
                  {selected.guest_count != null && (
                    <MetaRow label="Guests">~{selected.guest_count}</MetaRow>
                  )}
                </div>

                {/* Sending Mode */}
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: S.muted, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${S.border}` }}>
                    Sending Mode
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {([
                      ['auto', 'Auto-Send'],
                      ['approve', 'Approve First'],
                      ['draft', 'Draft Only'],
                    ] as const).map(([key, label]) => {
                      const active = sendingMode === key
                      return (
                        <div
                          key={key}
                          onClick={() => setSendingMode(key)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8,
                            border: `1px solid ${active ? '#e8d5a3' : S.border}`,
                            background: active ? S.pale : 'transparent',
                            color: active ? S.gold : S.muted,
                            fontWeight: active ? 500 : 400, fontSize: 11, cursor: 'pointer', transition: 'all 0.12s',
                          }}
                        >
                          <div style={{
                            width: 12, height: 12, borderRadius: '50%', border: `1.5px solid currentColor`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            {active && <div style={{ width: 6, height: 6, background: S.gold, borderRadius: '50%' }} />}
                          </div>
                          {label}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: S.muted, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${S.border}` }}>
                    Today&apos;s Stats
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {([
                      [pendingCount,  'Pending',   S.gold],
                      [autoSentCount, 'Auto-sent', S.green],
                      [approvedCount, 'Approved',  S.dark],
                      [avgToneScore != null ? `${avgToneScore}%` : '—', 'Tone Score', S.mid],
                    ] as [string | number, string, string][]).map(([val, lbl, col]) => (
                      <div key={lbl} style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: '10px 10px 8px' }}>
                        <div style={{ fontFamily: S.serif, fontSize: 22, fontWeight: 600, color: col, lineHeight: 1, marginBottom: 3 }}>{val}</div>
                        <div style={{ fontSize: 9.5, color: S.muted }}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Channel Activity */}
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: S.muted, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${S.border}` }}>
                    Channel Activity
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {([
                      { key: 'gmail' as const, icon: '✉', label: 'Gmail', color: S.gold, iconBg: S.redBg, iconColor: '#c23b22' },
                      { key: 'whatsapp' as const, icon: '💬', label: 'WhatsApp', color: S.green, iconBg: '#e8f7ee', iconColor: '#25a244' },
                      { key: 'instagram' as const, icon: '📸', label: 'Instagram', color: S.purple, iconBg: '#f3eeff', iconColor: S.purple },
                    ]).map(ch => {
                      const count = channelCounts[ch.key]
                      const pct = Math.round((count / channelCounts.total) * 100)
                      return (
                        <div key={ch.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0, background: ch.iconBg, color: ch.iconColor }}>
                            {ch.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: S.text, marginBottom: 3 }}>
                              {ch.label} <span style={{ color: S.muted }}>· {count} msgs</span>
                            </div>
                            <div style={{ height: 4, background: S.border, borderRadius: 4 }}>
                              <div style={{ height: 4, background: ch.color, borderRadius: 4, width: `${pct}%`, transition: 'width 0.3s' }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>
            </>
          ) : (
            /* ── EMPTY STATE ─────────────────────────────────────────────── */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: S.muted, gap: 10 }}>
              <div style={{ fontSize: 28, color: S.gold }}>✦</div>
              <div style={{ fontFamily: S.serif, fontSize: 20, color: S.mid }}>
                {isLoading ? 'Loading…' : 'Select a message to review'}
              </div>
              {!isLoading && (
                <div style={{ fontSize: 12 }}>
                  {pendingCount > 0
                    ? `${pendingCount} message${pendingCount === 1 ? '' : 's'} awaiting review`
                    : 'All caught up!'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── STATS BAR ───────────────────────────────────────────────────── */}
        <div style={{ background: S.white, borderTop: `1px solid ${S.border}`, padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0, fontSize: 11, color: S.muted }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: S.gold }} />
            <strong style={{ color: S.text }}>{pendingCount}</strong>&nbsp;awaiting approval
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: S.green }} />
            <strong style={{ color: S.text }}>{autoSentCount}</strong>&nbsp;auto-sent today
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: S.blue }} />
            <strong style={{ color: S.text }}>{approvedCount}</strong>&nbsp;manually approved
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            {avgToneScore != null && (
              <span>AI tone accuracy: <strong style={{ color: S.green }}>{avgToneScore}%</strong></span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: S.green, animation: 'pulse 2s infinite' }} />
              System online
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
