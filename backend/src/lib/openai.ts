import OpenAI from 'openai'

// OpenAI is used ONLY for text-embedding-3-small (1536-dim) — Anthropic has no embeddings API
// Key is optional at startup; calls will fail at runtime if key is absent
// OpenAI SDK v6 throws at instantiation if the key is falsy — use a placeholder so
// the server starts without a key; calls will return 401 at runtime until the key is set.
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'not-configured' })

export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMS = 1536
