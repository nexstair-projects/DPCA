import { anthropic, MODELS as ANTHROPIC_MODELS } from './anthropic'
import { createGeminiClient, GEMINI_MODELS } from './gemini'

export type LLMRole = 'DRAFT' | 'CLASSIFY' | 'TONE'

export interface LLMResult {
  text: string
  inputTokens: number
  outputTokens: number
  modelUsed: string
}

function activeProvider(): 'anthropic' | 'gemini' {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (process.env.GEMINI_API_KEY) return 'gemini'
  throw new Error('No LLM API key configured. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.')
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

// Anthropic takes priority when both keys are set; Gemini is the fallback.
// If Anthropic call fails for any reason (invalid key, quota, etc.) and GEMINI_API_KEY
// is available, the request is retried with Gemini automatically.
export async function callLLM(
  role: LLMRole,
  system: string,
  user: string,
  maxTokens: number,
  temperature = 1,
): Promise<LLMResult> {
  const provider = activeProvider()

  if (provider === 'anthropic') {
    try {
      return await callAnthropic(role, system, user, maxTokens, temperature)
    } catch (err) {
      if (process.env.GEMINI_API_KEY) {
        console.warn(`[llm] Anthropic failed (${(err as Error).message}), falling back to Gemini`)
        return callGemini(role, system, user, maxTokens, temperature)
      }
      throw err
    }
  }

  return callGemini(role, system, user, maxTokens, temperature)
}
