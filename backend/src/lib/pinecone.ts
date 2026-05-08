import { Pinecone } from '@pinecone-database/pinecone'

// Key is optional at startup; calls will fail at runtime if key is absent
// Pinecone SDK throws at instantiation if the key is falsy — use a placeholder so
// the server starts without a key; calls will return auth errors at runtime until the key is set.
export const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || 'not-configured' })

export const getIndex = () =>
  pinecone.index(process.env.PINECONE_INDEX_NAME ?? 'dpca-knowledge-base')
