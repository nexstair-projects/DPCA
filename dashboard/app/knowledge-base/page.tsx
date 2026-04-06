'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

// ── Types ──────────────────────────────────────────────────────────────────────

type KBEntry = {
  id: string
  title: string
  category: string
  subcategory: string | null
  content: string
  metadata: Record<string, unknown> | null
  embedding_status: string
  is_active: boolean
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

// ── Category badge ─────────────────────────────────────────────────────────────

const CATS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  brand_voice:    { label: 'Brand Voice',    bg: '#eff5ff', color: '#1a3a6e', border: '#90b8f0' },
  template:       { label: 'Template',       bg: '#edfaf2', color: '#1a5c35', border: '#7bd4a5' },
  email_example:  { label: 'Email Example',  bg: '#fffbe6', color: '#7a5c00', border: '#f5d87a' },
  faq:            { label: 'FAQ',            bg: '#f3eeff', color: '#5a2a8a', border: '#c0a0e0' },
  vendor:         { label: 'Vendor',         bg: '#edfaf2', color: '#1a5c35', border: '#4dbb80' },
  process:        { label: 'Process',        bg: '#fdf6e3', color: '#7a5c00', border: '#e8dfc8' },
  qualification:  { label: 'Qualification',  bg: '#fdf0f0', color: '#8b3a3a', border: '#e8c0c0' },
}

function CatBadge({ category }: { category: string }) {
  const m = CATS[category] ?? { label: category, bg: '#f5f5f5', color: '#5a5a5a', border: '#d0d0d0' }
  return (
    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: m.bg, color: m.color, border: `1px solid ${m.border}`, whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  )
}

const EMBED_STATUS: Record<string, { color: string; label: string }> = {
  pending:    { color: S.gold, label: 'Pending' },
  processing: { color: '#2d5a8a', label: 'Processing' },
  embedded:   { color: S.green, label: 'Embedded' },
  failed:     { color: '#8b3a3a', label: 'Failed' },
}

// ── Filter tabs ────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all',            label: 'All' },
  { key: 'brand_voice',    label: 'Brand Voice' },
  { key: 'template',       label: 'Templates' },
  { key: 'email_example',  label: 'Examples' },
  { key: 'faq',            label: 'FAQ' },
  { key: 'vendor',         label: 'Vendor' },
]

// ── Page ────────────────────────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  const { data: entries = [], isLoading, mutate } = useSWR<KBEntry[]>('kb-entries', async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as KBEntry[]
  })

  const selected = entries.find(e => e.id === selectedId) ?? null
  const filtered = filter === 'all' ? entries : entries.filter(e => e.category === filter)

  const handleSelect = useCallback((entry: KBEntry) => {
    setSelectedId(entry.id)
    setEditing(false)
    setEditTitle(entry.title)
    setEditContent(entry.content)
  }, [])

  const handleEdit = () => {
    if (!selected) return
    setEditTitle(selected.title)
    setEditContent(selected.content)
    setEditing(true)
  }

  const handleSave = async () => {
    if (!selected) return
    const supabase = createClient()
    await supabase.from('knowledge_base').update({
      title: editTitle,
      content: editContent,
      embedding_status: 'pending',
    }).eq('id', selected.id)
    setEditing(false)
    mutate()
  }

  const handleDelete = async () => {
    if (!selected) return
    const supabase = createClient()
    await supabase.from('knowledge_base').update({ is_active: false }).eq('id', selected.id)
    setSelectedId(null)
    mutate()
  }

  const fmtDate = (d: string) => {
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
              Knowledge Base
            </h1>
            <span style={{ background: S.pale, color: S.gold, border: `1px solid ${S.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 500 }}>
              {entries.length} Entries
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => mutate()} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${S.border}`, background: S.white, color: S.mid, fontSize: 12, cursor: 'pointer', fontFamily: S.sans }}>
              ⟳ Refresh
            </button>
          </div>
        </div>

        {/* ── 2-PANEL CONTENT ────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* ── ENTRY LIST ───────────────────────────────────────────────── */}
          <div style={{ width: 360, flexShrink: 0, borderRight: `1px solid ${S.border}`, display: 'flex', flexDirection: 'column', background: S.white }}>

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
                    {f.label}{f.key === 'all' ? ` (${entries.length})` : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Entry list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {isLoading && <div style={{ padding: 24, color: S.muted, fontSize: 13 }}>Loading…</div>}
              {!isLoading && filtered.length === 0 && <div style={{ padding: 24, color: S.muted, fontSize: 13 }}>No entries found</div>}
              {filtered.map(entry => {
                const isActive = entry.id === selectedId
                const embed = EMBED_STATUS[entry.embedding_status] ?? EMBED_STATUS.pending
                return (
                  <div
                    key={entry.id}
                    onClick={() => handleSelect(entry)}
                    style={{
                      padding: '14px 16px', borderBottom: `1px solid #f0e8d4`,
                      cursor: 'pointer', transition: 'all 0.12s',
                      background: isActive ? S.pale : 'transparent',
                      borderLeft: `2px solid ${isActive ? S.gold : 'transparent'}`,
                    }}
                  >
                    <div style={{ fontFamily: S.serif, fontSize: 14, fontWeight: 600, color: S.dark, marginBottom: 4 }}>
                      {entry.title}
                    </div>
                    {entry.subcategory && (
                      <div style={{ fontSize: 11, color: S.muted, marginBottom: 4 }}>{entry.subcategory}</div>
                    )}
                    <div style={{ fontSize: 11, color: S.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>
                      {entry.content.substring(0, 80)}…
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CatBadge category={entry.category} />
                      <span style={{ fontSize: 9, color: embed.color }}>● {embed.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── ENTRY DETAIL ─────────────────────────────────────────────── */}
          {selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ padding: '12px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: S.white }}>
                <div>
                  {editing ? (
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      style={{ fontFamily: S.serif, fontSize: 18, fontWeight: 600, color: S.dark, border: `1px solid ${S.border}`, borderRadius: 8, padding: '4px 10px', width: 400, outline: 'none' }}
                    />
                  ) : (
                    <div style={{ fontFamily: S.serif, fontSize: 18, fontWeight: 600, color: S.dark }}>{selected.title}</div>
                  )}
                  <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center' }}>
                    <CatBadge category={selected.category} />
                    <span style={{ fontSize: 10, color: S.muted }}>Updated {fmtDate(selected.updated_at)}</span>
                    <span style={{ fontSize: 10, color: EMBED_STATUS[selected.embedding_status]?.color ?? S.muted }}>
                      ● {EMBED_STATUS[selected.embedding_status]?.label ?? selected.embedding_status}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {editing ? (
                    <>
                      <button onClick={() => setEditing(false)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${S.border}`, background: S.white, color: S.mid, fontSize: 12, cursor: 'pointer', fontFamily: S.sans }}>
                        Cancel
                      </button>
                      <button onClick={handleSave} style={{ padding: '6px 14px', borderRadius: 8, background: S.gold, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: S.sans }}>
                        ✓ Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleEdit} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${S.border}`, background: S.white, color: S.mid, fontSize: 12, cursor: 'pointer', fontFamily: S.sans }}>
                        ✎ Edit
                      </button>
                      <button onClick={handleDelete} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e8c0c0', background: '#fff8f8', color: '#8b3a3a', fontSize: 12, cursor: 'pointer', fontFamily: S.sans }}>
                        ✕ Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                {editing ? (
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    style={{ width: '100%', height: '100%', minHeight: 300, padding: 16, border: `1px solid ${S.border}`, borderRadius: 12, fontSize: 13, color: S.text, lineHeight: 1.75, fontFamily: S.sans, resize: 'none', background: S.white, outline: 'none' }}
                  />
                ) : (
                  <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20, fontSize: 13, color: S.text, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                    {selected.content}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: S.muted, gap: 10 }}>
              <div style={{ fontSize: 28, color: S.gold }}>🧠</div>
              <div style={{ fontFamily: S.serif, fontSize: 20, color: S.mid }}>
                {isLoading ? 'Loading…' : 'Select an entry to view'}
              </div>
              {!isLoading && (
                <div style={{ fontSize: 12 }}>
                  {entries.length} entries in knowledge base
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── STATS BAR ──────────────────────────────────────────────────── */}
        <div style={{ background: S.white, borderTop: `1px solid ${S.border}`, padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0, fontSize: 11, color: S.muted }}>
          {Object.entries(CATS).slice(0, 4).map(([key, cat]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color }} />
              <strong style={{ color: S.text }}>{entries.filter(e => e.category === key).length}</strong>&nbsp;{cat.label}
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ color: S.text }}>{entries.filter(e => e.embedding_status === 'embedded').length}</strong>&nbsp;embedded
          </div>
        </div>
      </div>
    </div>
  )
}
