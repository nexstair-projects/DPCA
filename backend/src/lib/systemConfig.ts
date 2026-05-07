import { supabase } from './supabase'

interface CacheEntry {
  value: string
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const TTL_MS = 60_000

export async function getConfig(key: string): Promise<string | null> {
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && cached.expiresAt > now) return cached.value

  const { data, error } = await supabase
    .from('system_config')
    .select('config_value')
    .eq('config_key', key)
    .single()

  if (error || !data) return null

  cache.set(key, { value: data.config_value, expiresAt: now + TTL_MS })
  return data.config_value
}

export async function getConfigJson<T>(key: string): Promise<T | null> {
  const raw = await getConfig(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
