import { supabase } from '../lib/supabase'
import { openai, EMBEDDING_MODEL } from '../lib/openai'
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

  const embRes = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  })
  const vector = embRes.data[0].embedding

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
