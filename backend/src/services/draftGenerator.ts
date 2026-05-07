import { supabase } from '../lib/supabase'
import { anthropic, MODELS } from '../lib/anthropic'
import { getConfig, getConfigJson } from '../lib/systemConfig'
import { retrieveContext } from './retrieval'
import { commissionSanitize, callAvailabilitySanitize, subjectLineEnforcer } from './sanitizers'

interface SenderRoute {
  sender: string
  from: string
  cc?: string[]
}

interface ToneValidationResult {
  tone_score: number
  passes: boolean
  issues: string[]
  suggestion: string | null
}

interface AutoSendRule {
  tier: number
  category: string
  auto_send: boolean
}

interface DraftResult {
  draft_id: string
  auto_send: boolean
  tone_score: number | null
  flagged: boolean
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

async function callSonnetDraft(system: string, user: string): Promise<{
  text: string
  inputTokens: number
  outputTokens: number
}> {
  const res = await anthropic.messages.create({
    model: MODELS.DRAFT,
    max_tokens: 1024,
    temperature: 1,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const text = res.content[0].type === 'text' ? res.content[0].text : ''
  return { text, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens }
}

async function runToneValidation(
  draftText: string,
  bodyClean: string,
  category: string,
  channel: string,
): Promise<ToneValidationResult | null> {
  const promptTemplate = await getConfig('tone_validation_prompt')
  if (!promptTemplate) return null

  const rendered = renderTemplate(promptTemplate, {
    category,
    channel,
    draft_text: draftText,
    body_clean: bodyClean,
  })

  try {
    const res = await anthropic.messages.create({
      model: MODELS.TONE,
      max_tokens: 200,
      system: 'You are a tone validation engine. Return ONLY valid JSON, no preamble, no markdown fences.',
      messages: [{ role: 'user', content: rendered }],
    })
    const raw = res.content[0].type === 'text' ? res.content[0].text : ''
    return JSON.parse(raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()) as ToneValidationResult
  } catch {
    return null
  }
}

export async function generateDraft(
  messageId: string,
  regenerationInstructions?: string,
  previousDraftText?: string,
): Promise<DraftResult> {
  // Fetch message
  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .select('inbox_id, sender_name, sender_email, subject, body_clean, body_raw, channel, category, priority, received_at')
    .eq('id', messageId)
    .single()

  if (msgErr || !msg) throw new Error(`Message not found: ${messageId}`)

  const bodyClean = (msg.body_clean ?? msg.body_raw ?? '') as string
  const category = (msg.category ?? 'general') as string
  const channel = (msg.channel ?? 'gmail') as string

  // Find associated lead by sender email
  let planningStep = 'lead_qualification'
  let signatureSigned = false
  if (msg.sender_email) {
    const { data: lead } = await supabase
      .from('leads')
      .select('planning_step, signature_signed')
      .eq('email', msg.sender_email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (lead) {
      planningStep = (lead.planning_step as string) ?? 'lead_qualification'
      signatureSigned = (lead.signature_signed as boolean) ?? false
    }
  }

  // Sender routing: deterministic lookup — LLM never decides who signs (Rule 5)
  const senderRouting = await getConfigJson<Record<string, SenderRoute>>('sender_routing')
  const route: SenderRoute = senderRouting?.[planningStep] ?? {
    sender: 'audrey',
    from: 'audrey@dreampariswedding.com',
  }

  // Fixed subject line — exact match only (Rule 1)
  const subjectMap = await getConfigJson<Record<string, string>>('planning_step_subjects')
  const fixedSubject = subjectMap?.[planningStep] ?? (msg.subject as string) ?? ''

  // Retrieve KB context
  const { context_text, source_ids } = await retrieveContext(bodyClean, category)

  // Get prompts from system_config
  const brandVoicePrompt = await getConfig('brand_voice_prompt') ?? ''
  const preSignatureConstraint = signatureSigned ? '' : (await getConfig('pre_signature_constraint') ?? '')

  const systemPrompt = [brandVoicePrompt, preSignatureConstraint].filter(Boolean).join('\n\n')

  // Build user message — P5 (regen) or P3 (new draft)
  let userPromptTemplate: string
  if (regenerationInstructions && previousDraftText) {
    userPromptTemplate = await getConfig('draft_regeneration_prompt') ?? buildFallbackRegenPrompt()
  } else {
    userPromptTemplate = await getConfig('draft_generation_prompt') ?? buildFallbackDraftPrompt()
  }

  const userPrompt = renderTemplate(userPromptTemplate, {
    category,
    priority: (msg.priority ?? 'medium') as string,
    channel,
    sender_name: (msg.sender_name ?? 'Unknown') as string,
    sender_email: (msg.sender_email ?? '') as string,
    subject: (msg.subject ?? '') as string,
    received_at: (msg.received_at ?? '') as string,
    body_clean: bodyClean,
    retrieved_context: context_text,
    previous_draft_text: previousDraftText ?? '',
    regeneration_instructions: regenerationInstructions ?? '',
    sender_persona: route.sender,
  })

  // Generate draft with commission sanitizer + up to 2 retries
  let draftText = ''
  let inputTokens = 0
  let outputTokens = 0
  let commissionFlagged = false
  let stricterSystem = systemPrompt

  for (let attempt = 0; attempt <= 2; attempt++) {
    const result = await callSonnetDraft(stricterSystem, userPrompt)
    draftText = result.text
    inputTokens = result.inputTokens
    outputTokens = result.outputTokens

    const check = await commissionSanitize(draftText)
    if (check.clean) break

    if (attempt < 2) {
      stricterSystem = systemPrompt + '\n\nCRITICAL: Do NOT under any circumstances mention commission, kickback, markup, vendor fees, or any pay-to-recommend concept in any language.'
    } else {
      commissionFlagged = true
    }
  }

  // Availability sanitizer — auto-replaces non-Mon/Wed call day refs (Rule 7)
  const availResult = callAvailabilitySanitize(draftText)
  draftText = availResult.text

  // Enforce subject line (Rule 1) — always use fixed subject, never LLM's subject
  const subjResult = subjectLineEnforcer(fixedSubject, fixedSubject)
  const finalSubject = subjResult.text

  // Tone validation with Claude Haiku (P6)
  const toneResult = await runToneValidation(draftText, bodyClean, category, channel)
  const toneScore = toneResult?.tone_score ?? null

  // Determine status: commission-flagged drafts always need human review
  const autoSendRules = await getConfigJson<AutoSendRule[]>('auto_send_rules') ?? []
  const autoSendRule = autoSendRules.find(
    (r) => r.tier === 1 && r.category === category,
  )
  const canAutoSend = !commissionFlagged && autoSendRule?.auto_send === true
  const status = canAutoSend ? 'auto_approved' : 'pending_review'

  // Insert draft
  const { data: draft, error: draftErr } = await supabase
    .from('drafts')
    .insert({
      message_id: messageId,
      draft_text: draftText,
      model_used: MODELS.DRAFT,
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      tone_confidence: toneScore ? toneScore / 100 : null,
      sender_persona: route.sender,
      sender_email: route.from,
      subject_line: finalSubject,
      planning_step: planningStep,
      context_sources: source_ids,
      status,
    })
    .select('id')
    .single()

  if (draftErr) throw new Error(`Draft insert failed: ${draftErr.message}`)

  // Update message status
  await supabase
    .from('messages')
    .update({ status: canAutoSend ? 'auto_sent' : 'pending_review' })
    .eq('id', messageId)

  return {
    draft_id: draft.id as string,
    auto_send: canAutoSend,
    tone_score: toneScore,
    flagged: commissionFlagged,
  }
}

function buildFallbackDraftPrompt(): string {
  return `## Your Task
Write a reply to the following incoming message on behalf of Dream Paris Wedding.

## Message Classification
- Category: {{category}}
- Priority: {{priority}}
- Channel: {{channel}}

## Original Message
From: {{sender_name}} <{{sender_email}}>
Subject: {{subject}}
Date: {{received_at}}

{{body_clean}}

## Relevant Knowledge Base Context
---
{{retrieved_context}}
---

## Instructions
1. Write a reply following the brand voice rules in your system instructions
2. Match the tone calibration for the "{{category}}" category
3. Follow the channel-specific rules for "{{channel}}"
4. Reference specific details the sender mentioned
5. Include a clear next step or call to action
6. Do NOT invent any details not present in the message or context above
7. Do NOT include a subject line — only the reply body
8. Sign off as {{sender_persona}}

Write the reply now:`
}

function buildFallbackRegenPrompt(): string {
  return `## Your Task
Regenerate a reply to the following message. A previous draft was generated but needs improvement.

## Previous Draft (DO NOT reuse — write a fresh reply)
{{previous_draft_text}}

## Feedback from Team
{{regeneration_instructions}}

## Original Message
From: {{sender_name}} <{{sender_email}}>
Subject: {{subject}}
Channel: {{channel}}
Category: {{category}}

{{body_clean}}

## Relevant Knowledge Base Context
---
{{retrieved_context}}
---

## Instructions
1. Write a completely NEW reply — do not edit or rephrase the previous draft
2. Address the specific feedback provided by the team
3. Follow all brand voice rules from your system instructions
4. Match tone for "{{category}}" category and "{{channel}}" channel rules
5. If no specific feedback was given, aim for a warmer, more personalised tone

Write the new reply now:`
}
