import { anthropic, MODELS as ANTHROPIC_MODELS } from './anthropic'
import { createGeminiClient, GEMINI_MODELS } from './gemini'
import { createOpenRouterClient, OPENROUTER_MODELS } from './openrouter'

export type LLMRole = 'DRAFT' | 'CLASSIFY' | 'TONE'

export interface LLMResult {
  text: string
  inputTokens: number
  outputTokens: number
  modelUsed: string
}

function hasAnthropic(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}
function hasGemini(): boolean {
  return !!process.env.GEMINI_API_KEY
}
function hasOpenRouter(): boolean {
  return !!process.env.OPENROUTER_API_KEY
}

async function callAnthropic(
  role: LLMRole,
  system: string,
  user: string,
  maxTokens: number,
  temperature: number,
): Promise<LLMResult> {
  const res = await anthropic.messages.create({
    model: ANTHROPIC_MODELS[role],
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const text = res.content[0].type === 'text' ? res.content[0].text : ''
  return { text, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens, modelUsed: ANTHROPIC_MODELS[role] }
}

async function callGemini(
  role: LLMRole,
  system: string,
  user: string,
  maxTokens: number,
  temperature: number,
): Promise<LLMResult> {
  const genAI = createGeminiClient()
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODELS[role],
    systemInstruction: system,
  })
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature },
  })
  const text = result.response.text()
  return {
    text,
    inputTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
    modelUsed: GEMINI_MODELS[role],
  }
}

async function callOpenRouter(
  role: LLMRole,
  system: string,
  user: string,
  maxTokens: number,
  temperature: number,
): Promise<LLMResult> {
  const client = createOpenRouterClient()
  const res = await client.chat.completions.create({
    model: OPENROUTER_MODELS[role],
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })
  const text = res.choices[0]?.message?.content ?? ''
  return {
    text,
    inputTokens: res.usage?.prompt_tokens ?? 0,
    outputTokens: res.usage?.completion_tokens ?? 0,
    modelUsed: OPENROUTER_MODELS[role],
  }
}

// Provider chain: Anthropic → Gemini → OpenRouter.
// Each provider is only attempted if its API key is set. On failure, falls
// through to the next available provider; throws only if all configured
// providers fail (or none are configured).
export async function callLLM(
  role: LLMRole,
  system: string,
  user: string,
  maxTokens: number,
  temperature = 1,
): Promise<LLMResult> {
  const errors: string[] = []

  if (hasAnthropic()) {
    try {
      return await callAnthropic(role, system, user, maxTokens, temperature)
    } catch (err) {
      const msg = (err as Error).message
      console.warn(`[llm] Anthropic failed (${msg}), trying next provider`)
      errors.push(`anthropic: ${msg}`)
    }
  }

  if (hasGemini()) {
    try {
      return await callGemini(role, system, user, maxTokens, temperature)
    } catch (err) {
      const msg = (err as Error).message
      console.warn(`[llm] Gemini failed (${msg}), trying next provider`)
      errors.push(`gemini: ${msg}`)
    }
  }

  if (hasOpenRouter()) {
    try {
      return await callOpenRouter(role, system, user, maxTokens, temperature)
    } catch (err) {
      const msg = (err as Error).message
      console.warn(`[llm] OpenRouter failed (${msg})`)
      errors.push(`openrouter: ${msg}`)
    }
  }

  if (errors.length === 0) {
    throw new Error('No LLM API key configured. Set ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY.')
  }
  throw new Error(`All LLM providers failed. ${errors.join(' | ')}`)
}
