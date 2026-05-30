import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

// Server-side / API routes (no cookies)
export const supabase = createClient(URL, ANON);

// Admin client — service role, bypasses RLS
export const supabaseAdmin = () => createClient(URL, SERVICE);

// Browser client — singleton to avoid multiple GoTrueClient instances
let browserClient = null;
export const createBrowserSupabase = () => {
  if (typeof window === 'undefined') {
    // Server side — return a plain client
    return createClient(URL, ANON);
  }
  if (!browserClient) {
    browserClient = createBrowserClient(URL, ANON);
  }
  return browserClient;
};
