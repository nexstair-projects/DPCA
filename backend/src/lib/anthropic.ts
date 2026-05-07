import Anthropic from '@anthropic-ai/sdk'

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('Missing ANTHROPIC_API_KEY')
}

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const MODELS = {
  DRAFT: process.env.ANTHROPIC_MODEL_DRAFT ?? 'claude-sonnet-4-6',
  CLASSIFY: process.env.ANTHROPIC_MODEL_CLASSIFY ?? 'claude-sonnet-4-6',
  TONE: process.env.ANTHROPIC_MODEL_TONE ?? 'claude-haiku-4-5-20251001',
} as const
