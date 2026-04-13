import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!')
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Bypass Chrome's Web Locks API which causes orphaned locks and hangs
    // getSession()/token refresh indefinitely. A no-op lock is safe for
    // single-tab usage; worst case two tabs refresh a token simultaneously.
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => await fn(),
  },
})
