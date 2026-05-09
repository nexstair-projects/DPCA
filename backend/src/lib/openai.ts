import OpenAI from 'openai'

// OpenAI client retained as an optional dependency (e.g. future use).
// Embeddings are now handled by Gemini (see lib/embeddings.ts) — OPENAI_API_KEY not required.
// SDK v6 throws at instantiation if the key is falsy — use a placeholder so the server starts.
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'not-configured' })
