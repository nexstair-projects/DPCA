import { supabase } from '../lib/supabase'
import { anthropic, MODELS } from '../lib/anthropic'
import { getConfig } from '../lib/systemConfig'

interface ExtractedLead {
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
  how_found_us: string | null
  ai_summary: string | null
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

export async function extractLead(messageId: string): Promise<{ lead_id: string; upserted: boolean }> {
  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .select('inbox_id, sender_name, sender_email, subject, body_clean, body_raw, channel')
    .eq('id', messageId)
    .single()

  if (msgErr || !msg) throw new Error(`Message not found: ${messageId}`)

  const bodyClean = (msg.body_clean ?? msg.body_raw ?? '') as string

  const promptTemplate = await getConfig('lead_extraction_prompt')
  if (!promptTemplate) throw new Error('lead_extraction_prompt not found in system_config')

  const rendered = renderTemplate(promptTemplate, {
    sender_name: (msg.sender_name ?? 'Unknown') as string,
    sender_email: (msg.sender_email ?? '') as string,
    subject: (msg.subject ?? '') as string,
    body_clean: bodyClean,
  })

  let raw: string
  try {
    const res = await anthropic.messages.create({
      model: MODELS.CLASSIFY,
      max_tokens: 500,
      system: 'You are a lead extraction engine. Return ONLY valid JSON, no preamble, no markdown fences.',
      messages: [{ role: 'user', content: rendered }],
    })
    raw = res.content[0].type === 'text' ? res.content[0].text : ''
  } catch (err) {
    throw new Error(`Claude lead extraction failed: ${err}`)
  }

  let extracted: ExtractedLead
  try {
    extracted = JSON.parse(raw) as ExtractedLead
  } catch {
    const stripped = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
    try {
      extracted = JSON.parse(stripped) as ExtractedLead
    } catch {
      throw new Error(`Failed to parse lead extraction JSON: ${raw}`)
    }
  }

  // Upsert by email — prefer email from extraction, fall back to sender_email
  const email = extracted.email ?? (msg.sender_email as string | null) ?? null

  const leadPayload = {
    inbox_id: msg.inbox_id as string,
    message_id: messageId,
    client_names: extracted.client_names,
    email,
    phone: extracted.phone,
    location: extracted.location,
    wedding_date: extracted.wedding_date,
    wedding_date_flexible: extracted.wedding_date_flexible,
    guest_count: extracted.guest_count,
    estimated_value: null,
    venue_preference: extracted.venue_preference,
    services_requested: extracted.services_requested,
    how_found_us: extracted.how_found_us,
    ai_summary: extracted.ai_summary,
    source_channel: (msg.channel ?? 'gmail') as string,
    status: 'new',
  }

  let leadId: string
  let upserted = false

  if (email) {
    // Check for existing lead with this email
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      // Update existing lead with new info (non-null fields only)
      const updateFields = Object.fromEntries(
        Object.entries(leadPayload).filter(([, v]) => v !== null && v !== undefined),
      )
      await supabase.from('leads').update(updateFields).eq('id', existing.id)
      leadId = existing.id as string
      upserted = true
    } else {
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert(leadPayload)
        .select('id')
        .single()
      if (error) throw new Error(`Lead insert failed: ${error.message}`)
      leadId = newLead.id as string
    }
  } else {
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert(leadPayload)
      .select('id')
      .single()
    if (error) throw new Error(`Lead insert failed: ${error.message}`)
    leadId = newLead.id as string
  }

  return { lead_id: leadId, upserted }
}
