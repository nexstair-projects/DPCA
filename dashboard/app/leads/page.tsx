'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

// ── Types ──────────────────────────────────────────────────────────────────────

type Lead = {
  id: string
  client_names: string[] | null
  email: string | null
  phone: string | null
  location: string | null
  wedding_date: string | null
  wedding_date_flexible: boolean | null
  guest_count: number | null
  budget_range: string | null
  venue_preference: string | null
  services_requested: string[] | null
  source_channel: string | null
  how_found_us: string | null
  ai_summary: string | null
  status: string
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
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

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  new:            { label: 'New',           bg: '#eff5ff', color: '#1a3a6e', border: '#90b8f0' },
  contacted:      { label: 'Contacted',     bg: '#fffbe6', color: '#7a5c00', border: '#f5d87a' },
  qualified:      { label: 'Qualified',     bg: '#edfaf2', color: '#1a5c35', border: '#7bd4a5' },
  proposal_sent:  { label: 'Proposal Sent', bg: '#f3eeff', color: '#5a2a8a', border: '#c0a0e0' },
  booked:         { label: 'Booked',        bg: '#edfaf2', color: '#1a5c35', border: '#4dbb80' },
  lost:           { label: 'Lost',          bg: '#fdf0f0', color: '#8b3a3a', border: '#e8c0c0' },
  archived:       { label: 'Archived',      bg: '#f5f5f5', color: '#5a5a5a', border: '#d0d0d0' },
}

function StatusBadge({ status }: { status: string }) {
  const m = STATUS[status] ?? STATUS.new
  return (
    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: m.bg, color: m.color, border: `1px solid ${m.border}`, whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, fontSize: 12 }}>
      <span style={{ color: S.muted, flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ color: S.text, fontWeight: 500, textAlign: 'right' }}>{children}</span>
    </div>
  )
}

// ── Filter tabs ────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all',            label: 'All' },
  { key: 'new',            label: 'New' },
  { key: 'contacted',      label: 'Contacted' },
  { key: 'qualified',      label: 'Qualified' },
  { key: 'proposal_sent',  label: 'Proposal' },
  { key: 'booked',         label: 'Booked' },
]

// ── Page ────────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [editNotes, setEditNotes] = useState('')

  const { data: leads = [], isLoading, mutate } = useSWR<Lead[]>('leads-list', async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Lead[]
  })

  const selected = leads.find(l => l.id === selectedId) ?? null
  const filtered = filter === 'all' ? leads : leads.filter(l => l.status === filter)

  const handleSelect = useCallback((lead: Lead) => {
    setSelectedId(lead.id)
    setEditNotes(lead.notes ?? '')
  }, [])

  const handleStatusChange = async (newStatus: string) => {
    if (!selected) return
    const supabase = createClient()
    await supabase.from('leads').update({ status: newStatus }).eq('id', selected.id)
    mutate()
  }

  const handleSaveNotes = async () => {
    if (!selected) return
    const supabase = createClient()
    await supabase.from('leads').update({ notes: editNotes }).eq('id', selected.id)
    mutate()
  }

  const fmtDate = (d: string | null) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
    catch { return d }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: S.bg, fontFamily: S.sans }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* ── TOPBAR ─────────────────────────────────────────────────────── */}
        <div style={{ background: S.white, borderBottom: `1px solid ${S.border}`, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontFamily: S.serif, fontSize: 18, fontWeight: 600, color: S.dark, margin: 0 }}>
              Leads
            </h1>
            <span style={{ background: S.pale, color: S.gold, border: `1px solid ${S.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 500 }}>
              {leads.length} Total
            </span>
          </div>
          <button onClick={() => mutate()} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${S.border}`, background: S.white, color: S.mid, fontSize: 12, cursor: 'pointer', fontFamily: S.sans }}>
            ⟳ Refresh
          </button>
        </div>

        {/* ── 2-PANEL CONTENT ────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* ── LEAD LIST ────────────────────────────────────────────────── */}
          <div style={{ width: 380, flexShrink: 0, borderRight: `1px solid ${S.border}`, display: 'flex', flexDirection: 'column', background: S.white }}>

            {/* Filter tabs */}
            <div style={{ padding: '10px 12px 0', borderBottom: `1px solid ${S.border}` }}>
              <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
                    {f.label}{f.key === 'all' ? ` (${leads.length})` : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Lead list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {isLoading && <div style={{ padding: 24, color: S.muted, fontSize: 13 }}>Loading leads…</div>}
              {!isLoading && filtered.length === 0 && <div style={{ padding: 24, color: S.muted, fontSize: 13 }}>No leads found</div>}
              {filtered.map(lead => {
                const isActive = lead.id === selectedId
                const names = (lead.client_names ?? []).join(' & ') || 'Unknown'
                return (
                  <div
                    key={lead.id}
                    onClick={() => handleSelect(lead)}
                    style={{
                      padding: '14px 16px', borderBottom: `1px solid #f0e8d4`,
                      cursor: 'pointer', transition: 'all 0.12s',
                      background: isActive ? S.pale : 'transparent',
                      borderLeft: `2px solid ${isActive ? S.gold : 'transparent'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontFamily: S.serif, fontSize: 14, fontWeight: 600, color: S.dark }}>
                        {names}
                      </div>
                      <StatusBadge status={lead.status} />
                    </div>
                    {lead.email && (
                      <div style={{ fontSize: 11, color: S.muted, marginBottom: 2 }}>✉️ {lead.email}</div>
                    )}
                    <div style={{ display: 'flex', gap: 12, fontSize: 10.5, color: S.muted, marginTop: 4 }}>
                      {lead.wedding_date && <span>📅 {fmtDate(lead.wedding_date)}</span>}
                      {lead.source_channel && <span style={{ textTransform: 'capitalize' }}>📨 {lead.source_channel}</span>}
                      {lead.guest_count && <span>👥 {lead.guest_count} guests</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── LEAD DETAIL ──────────────────────────────────────────────── */}
          {selected ? (
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

              {/* Main detail */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                <div style={{ fontFamily: S.serif, fontSize: 22, fontWeight: 600, color: S.dark, marginBottom: 4 }}>
                  {(selected.client_names ?? []).join(' & ') || 'Unknown'}
                </div>
                <div style={{ fontSize: 12, color: S.muted, marginBottom: 20 }}>
                  Added {fmtDate(selected.created_at)} · Last updated {fmtDate(selected.updated_at)}
                </div>

                {/* Status actions */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
                  {(['new', 'contacted', 'qualified', 'proposal_sent', 'booked', 'lost', 'archived'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      style={{
                        padding: '4px 12px', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontFamily: S.sans, transition: 'all 0.12s',
                        background: selected.status === s ? S.gold : S.white,
                        color: selected.status === s ? '#fff' : S.mid,
                        border: `1px solid ${selected.status === s ? S.gold : S.border}`,
                        fontWeight: selected.status === s ? 600 : 400,
                      }}
                    >
                      {(STATUS[s]?.label ?? s)}
                    </button>
                  ))}
                </div>

                {/* AI Summary */}
                {selected.ai_summary && (
                  <div style={{ background: S.pale, border: `1px solid ${S.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: S.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                      ✦ AI Summary
                    </div>
                    <div style={{ fontSize: 13, color: S.text, lineHeight: 1.6 }}>{selected.ai_summary}</div>
                  </div>
                )}

                {/* Contact & Wedding details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                  <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: S.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                      Contact Details
                    </div>
                    <DetailRow label="Email">{selected.email ?? '—'}</DetailRow>
                    <DetailRow label="Phone">{selected.phone ?? '—'}</DetailRow>
                    <DetailRow label="Source"><span style={{ textTransform: 'capitalize' }}>{selected.source_channel ?? '—'}</span></DetailRow>
                    <DetailRow label="Found via">{selected.how_found_us ?? '—'}</DetailRow>
                  </div>
                  <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: S.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                      Wedding Details
                    </div>
                    <DetailRow label="Date">{fmtDate(selected.wedding_date)}{selected.wedding_date_flexible ? ' (flexible)' : ''}</DetailRow>
                    <DetailRow label="Location">{selected.location ?? '—'}</DetailRow>
                    <DetailRow label="Guests">{selected.guest_count ?? '—'}</DetailRow>
                    <DetailRow label="Budget">{selected.budget_range ?? '—'}</DetailRow>
                    <DetailRow label="Venue">{selected.venue_preference ?? '—'}</DetailRow>
                  </div>
                </div>

                {/* Services requested */}
                {(selected.services_requested ?? []).length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: S.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                      Services Requested
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(selected.services_requested ?? []).map((svc, i) => (
                        <span key={i} style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, background: S.pale, color: S.gold, border: `1px solid ${S.border}` }}>
                          {svc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: S.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Notes
                  </div>
                  <textarea
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Add notes about this lead…"
                    style={{ width: '100%', minHeight: 100, padding: 12, border: `1px solid ${S.border}`, borderRadius: 10, fontSize: 13, color: S.text, lineHeight: 1.6, fontFamily: S.sans, resize: 'vertical', background: S.white, outline: 'none' }}
                  />
                  <button
                    onClick={handleSaveNotes}
                    style={{ marginTop: 8, padding: '6px 16px', borderRadius: 8, background: S.gold, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: S.sans }}
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: S.muted, gap: 10 }}>
              <div style={{ fontSize: 28, color: S.gold }}>👥</div>
              <div style={{ fontFamily: S.serif, fontSize: 20, color: S.mid }}>
                {isLoading ? 'Loading…' : 'Select a lead to view details'}
              </div>
              {!isLoading && (
                <div style={{ fontSize: 12 }}>
                  {leads.length > 0
                    ? `${leads.filter(l => l.status === 'new').length} new lead${leads.filter(l => l.status === 'new').length === 1 ? '' : 's'}`
                    : 'No leads yet'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── STATS BAR ──────────────────────────────────────────────────── */}
        <div style={{ background: S.white, borderTop: `1px solid ${S.border}`, padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0, fontSize: 11, color: S.muted }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2d5a8a' }} />
            <strong style={{ color: S.text }}>{leads.filter(l => l.status === 'new').length}</strong>&nbsp;new
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: S.gold }} />
            <strong style={{ color: S.text }}>{leads.filter(l => l.status === 'contacted').length}</strong>&nbsp;contacted
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: S.green }} />
            <strong style={{ color: S.text }}>{leads.filter(l => l.status === 'booked').length}</strong>&nbsp;booked
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
