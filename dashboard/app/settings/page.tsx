'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

// ── Types ──────────────────────────────────────────────────────────────────────

type Inbox = {
  id: string
  name: string
  channel: string
  email_address: string | null
  phone_number: string | null
  instagram_handle: string | null
  is_active: boolean
  assigned_users: string[]
}

type User = {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
}

type ConfigEntry = {
  id: string
  config_key: string
  config_value: unknown
  description: string | null
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

// ── Config key labels ──────────────────────────────────────────────────────────

const CONFIG_LABELS: Record<string, { label: string; hint: string }> = {
  brand_voice_prompt:   { label: 'Brand Voice Prompt',    hint: 'Master AI system prompt for draft generation' },
  classification_prompt:{ label: 'Classification Prompt',  hint: 'System prompt for message classification' },
  lead_extraction_prompt:{ label: 'Lead Extraction Prompt', hint: 'System prompt for lead data extraction' },
  email_signature:      { label: 'Email Signature',        hint: 'JSON signature block appended to outgoing emails' },
  auto_send_rules:      { label: 'Auto-Send Rules',        hint: 'Tier 1 auto-send thresholds and confidence settings' },
  business_hours:       { label: 'Business Hours',         hint: 'Timezone and working hours for delayed sends' },
  exclusion_list:       { label: 'Exclusion List',         hint: 'Emails and domains to ignore' },
  notification_emails:  { label: 'Notification Emails',    hint: 'Alert recipients for Tier 3 and errors' },
}

// ── Channel icon ───────────────────────────────────────────────────────────────

const channelIcon = (ch: string) =>
  ch === 'gmail' ? '✉️' : ch === 'whatsapp' ? '💬' : ch === 'instagram' ? '📸' : '📨'

const roleBadge = (role: string) => {
  const map: Record<string, { bg: string; color: string }> = {
    admin: { bg: '#fdf0f0', color: '#8b3a3a' },
    manager: { bg: '#eff5ff', color: '#1a3a6e' },
    team_member: { bg: '#edfaf2', color: '#1a5c35' },
  }
  const m = map[role] ?? map.team_member
  return (
    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: m.bg, color: m.color, textTransform: 'capitalize' }}>
      {role.replace('_', ' ')}
    </span>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [editingConfig, setEditingConfig] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const { data: inboxes = [], mutate: mutateInboxes } = useSWR<Inbox[]>('settings-inboxes', async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from('inboxes').select('*').order('created_at')
    if (error) throw error
    return (data ?? []) as Inbox[]
  })

  const { data: users = [] } = useSWR<User[]>('settings-users', async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from('users').select('*').order('full_name')
    if (error) throw error
    return (data ?? []) as User[]
  })

  const { data: configs = [], mutate: mutateConfigs } = useSWR<ConfigEntry[]>('settings-configs', async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from('system_config').select('*').order('config_key')
    if (error) throw error
    return (data ?? []) as ConfigEntry[]
  })

  const handleEditConfig = (cfg: ConfigEntry) => {
    setEditingConfig(cfg.id)
    setEditValue(typeof cfg.config_value === 'string' ? cfg.config_value : JSON.stringify(cfg.config_value, null, 2))
  }

  const handleSaveConfig = async (cfg: ConfigEntry) => {
    const supabase = createClient()
    let parsed: unknown
    try { parsed = JSON.parse(editValue) } catch { parsed = editValue }
    await supabase.from('system_config').update({ config_value: parsed }).eq('id', cfg.id)
    setEditingConfig(null)
    mutateConfigs()
  }

  const handleToggleInbox = async (inbox: Inbox) => {
    const supabase = createClient()
    await supabase.from('inboxes').update({ is_active: !inbox.is_active }).eq('id', inbox.id)
    mutateInboxes()
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
        <div style={{ background: S.white, borderBottom: `1px solid ${S.border}`, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <h1 style={{ fontFamily: S.serif, fontSize: 18, fontWeight: 600, color: S.dark, margin: 0 }}>
            Settings
          </h1>
        </div>

        {/* ── SCROLLABLE CONTENT ─────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── INBOXES ────────────────────────────────────────────────── */}
            <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: S.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                Connected Inboxes
              </div>
              {inboxes.length === 0 ? (
                <div style={{ fontSize: 13, color: S.muted }}>No inboxes configured</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {inboxes.map(inbox => (
                    <div key={inbox.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: `1px solid ${S.border}`, borderRadius: 10, background: inbox.is_active ? S.white : '#f9f7f2' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 18 }}>{channelIcon(inbox.channel)}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: S.dark }}>{inbox.name}</div>
                          <div style={{ fontSize: 11, color: S.muted }}>
                            {inbox.email_address ?? inbox.phone_number ?? inbox.instagram_handle ?? inbox.channel}
                            <span style={{ marginLeft: 8, textTransform: 'capitalize' }}>· {inbox.channel}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleInbox(inbox)}
                        style={{
                          padding: '4px 12px', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontFamily: S.sans,
                          background: inbox.is_active ? '#edfaf2' : '#fdf0f0',
                          color: inbox.is_active ? S.green : '#8b3a3a',
                          border: `1px solid ${inbox.is_active ? '#7bd4a5' : '#e8c0c0'}`,
                        }}
                      >
                        {inbox.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── TEAM MEMBERS ────────────────────────────────────────────── */}
            <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: S.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                Team Members
              </div>
              {users.length === 0 ? (
                <div style={{ fontSize: 13, color: S.muted }}>No team members</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {users.map(user => (
                    <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: `1px solid ${S.border}`, borderRadius: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: S.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {user.full_name[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: S.dark }}>{user.full_name}</div>
                          <div style={{ fontSize: 11, color: S.muted }}>{user.email}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {roleBadge(user.role)}
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: user.is_active ? S.green : '#ccc' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── SYSTEM CONFIGURATION ────────────────────────────────────── */}
            <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: S.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                System Configuration
              </div>
              {configs.length === 0 ? (
                <div style={{ fontSize: 13, color: S.muted }}>No configuration entries</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {configs.map(cfg => {
                    const meta = CONFIG_LABELS[cfg.config_key] ?? { label: cfg.config_key, hint: cfg.description ?? '' }
                    const isEditing = editingConfig === cfg.id
                    return (
                      <div key={cfg.id} style={{ border: `1px solid ${S.border}`, borderRadius: 10, padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: S.dark }}>{meta.label}</div>
                            <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>{meta.hint}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            {isEditing ? (
                              <>
                                <button onClick={() => setEditingConfig(null)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${S.border}`, background: S.white, color: S.mid, fontSize: 11, cursor: 'pointer', fontFamily: S.sans }}>
                                  Cancel
                                </button>
                                <button onClick={() => handleSaveConfig(cfg)} style={{ padding: '4px 10px', borderRadius: 6, background: S.gold, color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: S.sans }}>
                                  Save
                                </button>
                              </>
                            ) : (
                              <button onClick={() => handleEditConfig(cfg)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${S.border}`, background: S.white, color: S.mid, fontSize: 11, cursor: 'pointer', fontFamily: S.sans }}>
                                Edit
                              </button>
                            )}
                          </div>
                        </div>
                        {isEditing ? (
                          <textarea
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            style={{ width: '100%', minHeight: 120, padding: 10, border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 12, color: S.text, lineHeight: 1.6, fontFamily: 'monospace', resize: 'vertical', background: '#fffdf8', outline: 'none' }}
                          />
                        ) : (
                          <div style={{ fontSize: 11, color: S.mid, background: S.bg, borderRadius: 8, padding: '8px 10px', maxHeight: 80, overflowY: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {typeof cfg.config_value === 'string'
                              ? (cfg.config_value.length > 200 ? cfg.config_value.substring(0, 200) + '…' : cfg.config_value)
                              : JSON.stringify(cfg.config_value, null, 2).substring(0, 200)}
                          </div>
                        )}
                        <div style={{ fontSize: 9, color: S.muted, marginTop: 6 }}>
                          Last updated: {fmtDate(cfg.updated_at)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── STATS BAR ──────────────────────────────────────────────────── */}
        <div style={{ background: S.white, borderTop: `1px solid ${S.border}`, padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0, fontSize: 11, color: S.muted }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ color: S.text }}>{inboxes.filter(i => i.is_active).length}</strong>&nbsp;active inbox{inboxes.filter(i => i.is_active).length !== 1 ? 'es' : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ color: S.text }}>{users.filter(u => u.is_active).length}</strong>&nbsp;team member{users.filter(u => u.is_active).length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ color: S.text }}>{configs.length}</strong>&nbsp;config entries
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
