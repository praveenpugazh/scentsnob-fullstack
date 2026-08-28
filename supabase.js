import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

// Server-side / API routes only.
// persistSession: false so this never registers a GoTrueClient against
// the browser's localStorage key, even if bundled into client code.
export const supabase = createClient(URL, ANON, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
})

// Admin client — service role, bypasses RLS, server-only
export const supabaseAdmin = () =>
  createClient(URL, SERVICE, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })

// Browser singleton — the ONE client that owns the session in the browser.
// All client components must use this, never the exports above.
let browserClient = null
export const createBrowserSupabase = () => {
  if (typeof window === 'undefined') {
    // SSR fallback — no session needed on server
    return createClient(URL, ANON, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
  }
  if (!browserClient) {
    browserClient = createBrowserClient(URL, ANON)
  }
  return browserClient
}
