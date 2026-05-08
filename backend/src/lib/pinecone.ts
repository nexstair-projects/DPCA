import { Pinecone } from '@pinecone-database/pinecone'

// Key is optional at startup; calls will fail at runtime if key is absent
export const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY ?? '' })

export const getIndex = () =>
  pinecone.index(process.env.PINECONE_INDEX_NAME ?? 'dpca-knowledge-base')
