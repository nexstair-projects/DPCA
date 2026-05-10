import { GoogleGenerativeAI } from '@google/generative-ai'
import { createOpenRouterClient } from './openrouter'

// Both embedding providers are tried in order: Gemini first (free, 768-dim),
// OpenRouter NVIDIA Llama Nemotron as fallback (free via OpenRouter).
//
// IMPORTANT: Pinecone index dimensionality MUST match whichever provider you
// actually use. Vectors from different providers are NOT comparable, so do
// not mix providers in the same index — pick one for kb-import and stick with
// it for query-time retrieval. If you switch providers, recreate the Pinecone
// index at the correct dim and re-run scripts/kb-import.ts.
//
// EMBEDDING_DIMS reflects the active provider's output size and gates the
// Pinecone index spec. Set EMBEDDING_DIMS env var to override.
export const GEMINI_EMBEDDING_MODEL = 'text-embedding-004'
export const OPENROUTER_EMBEDDING_MODEL =
  process.env.OPENROUTER_EMBEDDING_MODEL ?? 'nvidia/llama-nemotron-embed-vl-1b-v2:free'
export const EMBEDDING_DIMS = Number(process.env.EMBEDDING_DIMS ?? 768)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

async function embedWithGemini(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL })
  const result = await model.embedContent(text)
  return result.embedding.values
}

async function embedWithOpenRouter(text: string): Promise<number[]> {
  const client = createOpenRouterClient()
  const res = await client.embeddings.create({
    model: OPENROUTER_EMBEDDING_MODEL,
    input: text,
  })
  return res.data[0].embedding
}

export async function createEmbedding(text: string): Promise<number[]> {
  const errors: string[] = []

  if (process.env.GEMINI_API_KEY) {
    try {
      return await embedWithGemini(text)
    } catch (err) {
      const msg = (err as Error).message
      console.warn(`[embeddings] Gemini failed (${msg}), falling back to OpenRouter`)
      errors.push(`gemini: ${msg}`)
    }
  }

  if (process.env.OPENROUTER_API_KEY) {
    try {
      return await embedWithOpenRouter(text)
    } catch (err) {
      const msg = (err as Error).message
      console.warn(`[embeddings] OpenRouter failed (${msg})`)
      errors.push(`openrouter: ${msg}`)
    }
  }

  if (errors.length === 0) {
    throw new Error('No embedding provider configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY.')
  }
  throw new Error(`All embedding providers failed. ${errors.join(' | ')}`)
}
