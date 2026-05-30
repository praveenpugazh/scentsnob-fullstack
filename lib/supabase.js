import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

// Server-side / API routes (no cookies)
export const supabase = createClient(URL, ANON);

// Admin client — service role, bypasses RLS
export const supabaseAdmin = () => createClient(URL, SERVICE);

// Browser client — used in client components for auth
export const createBrowserSupabase = () =>
  createBrowserClient(URL, ANON);
