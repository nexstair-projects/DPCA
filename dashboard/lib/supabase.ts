import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// For Client Components (login, inbox, sidebar, etc.)
export const createClient = () => createClientComponentClient()
