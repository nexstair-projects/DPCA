/**
 * kb-import.ts
 * Reads all markdown files from ../kb-data/, inserts them into Supabase knowledge_base,
 * then calls POST /api/internal/embed-kb for each entry to generate Pinecone embeddings.
 *
 * Usage:
 *   npx ts-node --project ../backend/tsconfig.json scripts/kb-import.ts
 *
 * Requires .env in the project root (or backend/.env) with:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BACKEND_URL, INTERNAL_API_TOKEN
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') })
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') })

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001'
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface KbFile {
  filePath: string
  title: string
  category: string
  content: string
}

function parseFrontmatter(raw: string): { title: string; category: string; content: string } | null {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/m)
  if (!match) return null

  const frontmatter = match[1]
  const content = match[2].trim()

  const titleMatch = frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m)
  const categoryMatch = frontmatter.match(/^category:\s*["']?(.+?)["']?\s*$/m)

  if (!titleMatch || !categoryMatch) return null

  return {
    title: titleMatch[1].trim(),
    category: categoryMatch[1].trim(),
    content,
  }
}

function loadKbFiles(dir: string): KbFile[] {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'))
  const results: KbFile[] = []

  for (const file of files) {
    const filePath = path.join(dir, file)
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = parseFrontmatter(raw)

    if (!parsed) {
      console.warn(`  Skipping ${file} — could not parse frontmatter`)
      continue
    }

    results.push({ filePath, ...parsed })
  }

  return results
}

async function embedEntry(kbId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/internal/embed-kb`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': INTERNAL_API_TOKEN,
      },
      body: JSON.stringify({ kb_id: kbId }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.warn(`    Embed failed (${res.status}): ${JSON.stringify(body)}`)
      return false
    }

    return true
  } catch (err) {
    console.warn(`    Embed request failed: ${(err as Error).message}`)
    return false
  }
}

async function main() {
  const kbDir = path.join(__dirname, '..', 'kb-data')

  if (!fs.existsSync(kbDir)) {
    console.error(`kb-data directory not found at ${kbDir}`)
    process.exit(1)
  }

  console.log(`\n📚 Dream Paris Wedding — KB Import\n`)
  console.log(`Loading files from: ${kbDir}`)

  const files = loadKbFiles(kbDir)
  console.log(`Found ${files.length} KB files to import\n`)

  let inserted = 0
  let skipped = 0
  let embedded = 0
  let embedFailed = 0

  for (const file of files) {
    const name = path.basename(file.filePath)
    process.stdout.write(`→ ${name} (${file.category}) … `)

    // Upsert by title to allow re-runs
    const { data, error } = await supabase
      .from('knowledge_base')
      .upsert(
        {
          title: file.title,
          category: file.category,
          content: file.content,
          embedding_status: 'pending',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'title' }
      )
      .select('id')
      .single()

    if (error || !data) {
      console.log(`FAILED (${error?.message ?? 'no data'})`)
      skipped++
      continue
    }

    inserted++
    process.stdout.write(`inserted (id: ${data.id}) `)

    // Attempt embedding (requires backend running with API keys)
    if (!INTERNAL_API_TOKEN) {
      console.log('— skipping embed (no INTERNAL_API_TOKEN)')
      embedFailed++
      continue
    }

    const ok = await embedEntry(data.id)
    if (ok) {
      console.log('— embedded ✓')
      embedded++
    } else {
      console.log('— embed pending (run again when backend has API keys)')
      embedFailed++
    }
  }

  console.log(`\n── Summary ────────────────────────────────`)
  console.log(`  Inserted / updated : ${inserted}`)
  console.log(`  Embedded in Pinecone: ${embedded}`)
  console.log(`  Embed pending       : ${embedFailed}`)
  console.log(`  Skipped (errors)    : ${skipped}`)

  if (embedFailed > 0) {
    console.log(`\n  To embed pending entries, start the backend with API keys and re-run this script.`)
    console.log(`  Or call: POST /api/internal/embed-kb with { kb_id } for each pending entry.\n`)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
