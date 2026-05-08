import OpenAI from 'openai'

// OpenAI is used ONLY for text-embedding-3-small (1536-dim) — Anthropic has no embeddings API
// Key is optional at startup; calls will fail at runtime if key is absent
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMS = 1536
