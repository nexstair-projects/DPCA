import { GoogleGenerativeAI } from '@google/generative-ai'

// Gemini text-embedding-004 produces 768-dimensional vectors.
// Both kb-import (embedder.ts) and query-time (retrieval.ts) must use this same model
// so vectors are comparable. Pinecone index must be created at 768 dims.
export const EMBEDDING_MODEL = 'text-embedding-004'
export const EMBEDDING_DIMS = 768

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

export async function createEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL })
  const result = await model.embedContent(text)
  return result.embedding.values
}
