import { supabase } from '../lib/supabase'
import { callLLM } from '../lib/llm'
import { getConfig } from '../lib/systemConfig'

interface ClassificationResult {
  category: string
  priority: string
  confidence: number
  tier: number
  estimated_value: number | null
  guest_count: number | null
  reasoning: string
}

function renderPrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

function applySafetyOverrides(result: ClassificationResult): ClassificationResult {
  // Force tier 3 when confidence is too low (Rule 4 from SONNET_EXECUTION)
  if (result.confidence < 0.7) {
    result.tier = 3
  }
  // New high-value inquiries always tier 3
  if (
    result.category === 'new_inquiry' &&
    ((result.guest_count ?? 0) > 20 || (result.estimated_value ?? 0) > 5000)
  ) {
    result.tier = 3
  }
  return result
}

export async function classifyMessage(messageId: string): Promise<ClassificationResult> {
  // Fetch message
  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .select('inbox_id, sender_name, sender_email, sender_phone, subject, body_clean, body_raw, channel')
    .eq('id', messageId)
    .single()

  if (msgErr || !msg) throw new Error(`Message not found: ${messageId}`)

  // Check if sender is known (has prior messages)
  const { count: priorCount } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender_email', msg.sender_email ?? '')
    .neq('id', messageId)

  const isKnownSender = (priorCount ?? 0) > 0

  // Determine sender type from leads table
  let senderType = 'unknown'
  if (msg.sender_email) {
    const { data: lead } = await supabase
      .from('leads')
      .select('status')
      .eq('email', msg.sender_email)
      .maybeSingle()
    if (lead) senderType = 'existing_client'
  }

  // Get P2 classification prompt from system_config
  const promptTemplate = await getConfig('classification_prompt')
  if (!promptTemplate) throw new Error('classification_prompt not found in system_config')

  const rendered = renderPrompt(promptTemplate, {
    sender_name: msg.sender_name ?? 'Unknown',
    sender_email: msg.sender_email ?? '',
    is_known_sender: isKnownSender ? 'yes' : 'no',
    sender_type: senderType,
    subject: msg.subject ?? '',
    body_clean: msg.body_clean ?? msg.body_raw ?? '',
  })

  let raw: string
  try {
    const { text } = await callLLM(
      'CLASSIFY',
      'You are a message classification engine. Return ONLY valid JSON, no preamble, no markdown fences.',
      rendered,
      300,
    )
    raw = text
  } catch (err) {
    throw new Error(`LLM classification failed: ${err}`)
  }

  // Parse JSON with one retry
  let parsed: ClassificationResult
  try {
    parsed = JSON.parse(raw) as ClassificationResult
  } catch {
    // Strip any accidental markdown fences and retry
    const stripped = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
    try {
      parsed = JSON.parse(stripped) as ClassificationResult
    } catch {
      throw new Error(`Failed to parse classification JSON: ${raw}`)
    }
  }

  parsed = applySafetyOverrides(parsed)

  // Update messages row
  await supabase
    .from('messages')
    .update({
      category: parsed.category,
      priority: parsed.priority,
      classification_confidence: parsed.confidence,
      classification_reasoning: parsed.reasoning,
      tier: parsed.tier,
      estimated_value: parsed.estimated_value,
      guest_count: parsed.guest_count,
      status: 'classified',
      classified_at: new Date().toISOString(),
    })
    .eq('id', messageId)

  return parsed
}
