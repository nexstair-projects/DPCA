import { supabase } from '../lib/supabase'
import { createEmbedding } from '../lib/embeddings'
import { getIndex } from '../lib/pinecone'

export async function embedKbEntry(kbId: string): Promise<void> {
  const { data: row, error } = await supabase
    .from('knowledge_base')
    .select('id, title, content, category')
    .eq('id', kbId)
    .single()

  if (error || !row) throw new Error(`KB entry not found: ${kbId}`)

  // Embed title + content concatenated for richer retrieval signal
  const text = `${row.title}\n\n${row.content}`

  const vector = await createEmbedding(text)

  // Upsert into Pinecone with category metadata for filter-before-search (Rule 4)
  const index = getIndex()
  await index.upsert({
    records: [
      {
        id: row.id as string,
        values: vector,
        metadata: {
          kb_id: row.id as string,
          title: row.title as string,
          category: row.category as string,
        },
      },
    ],
  })

  // Mark as embedded in Supabase
  await supabase
    .from('knowledge_base')
    .update({ embedding_status: 'embedded', updated_at: new Date().toISOString() })
    .eq('id', kbId)
}
