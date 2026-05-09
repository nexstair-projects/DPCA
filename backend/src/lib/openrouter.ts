import OpenAI from 'openai'

export const OPENROUTER_MODELS = {
  DRAFT: process.env.OPENROUTER_MODEL_DRAFT ?? 'openai/gpt-oss-120b:free',
  CLASSIFY: process.env.OPENROUTER_MODEL_CLASSIFY ?? 'openai/gpt-oss-120b:free',
  TONE: process.env.OPENROUTER_MODEL_TONE ?? 'openai/gpt-oss-120b:free',
} as const

export function createOpenRouterClient() {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY ?? '',
    baseURL: 'https://openrouter.ai/api/v1',
  })
}
