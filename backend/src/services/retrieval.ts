import { supabase } from '../lib/supabase'
import { createEmbedding } from '../lib/embeddings'
import { getIndex } from '../lib/pinecone'

// Rule 4 from SONNET_EXECUTION: metadata filters MUST apply BEFORE vector similarity search
const CATEGORY_FILTER_MAP: Record<string, string[]> = {
  new_inquiry: ['template', 'email_example', 'faq', 'qualification'],
  existing_client: ['email_example', 'template', 'process'],
  vendor: ['vendor', 'template'],
  collaboration: ['email_example', 'template'],
  general: ['faq', 'template'],
}

export interface RetrievalResult {
  context_text: string
  source_ids: string[]
}

export async function retrieveContext(
  query: string,
  messageCategory: string,
  topK = 5,
): Promise<RetrievalResult> {
  let vector: number[]
  try {
    vector = await createEmbedding(query)
  } catch (err) {
    // Embedding provider unavailable — degrade gracefully so draft generation
    // can still proceed without retrieved KB context.
    console.warn(`[retrieval] embedding failed (${(err as Error).message}); returning empty context`)
    return { context_text: '', source_ids: [] }
  }

  const allowedCategories = CATEGORY_FILTER_MAP[messageCategory] ?? ['template', 'faq']

  // Query Pinecone with category metadata filter
  const index = getIndex()
  const queryRes = await index.query({
    vector,
    topK,
    filter: { category: { $in: allowedCategories } },
    includeMetadata: true,
  })

  const matches = queryRes.matches ?? []
  if (matches.length === 0) {
    return { context_text: '', source_ids: [] }
  }

  // Extract KB IDs from Pinecone metadata
  const kbIds = matches
    .map((m) => (m.metadata as Record<string, string> | undefined)?.kb_id)
    .filter((id): id is string => Boolean(id))

  if (kbIds.length === 0) {
    return { context_text: '', source_ids: [] }
  }

  // Hydrate full content from Supabase knowledge_base table
  const { data: kbRows } = await supabase
    .from('knowledge_base')
    .select('id, title, content, category')
    .in('id', kbIds)

  if (!kbRows || kbRows.length === 0) {
    return { context_text: '', source_ids: [] }
  }

  const context_text = kbRows
    .map((row) => `### ${row.title} [${row.category}]\n${row.content}`)
    .join('\n\n---\n\n')

  const source_ids = kbRows.map((row) => row.id as string)

  return { context_text, source_ids }
}
