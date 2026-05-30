import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This handles magic link / OAuth redirects (not needed for OTP, but good to have)
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/account';

  if (code) {
    // Exchange code — for future OAuth flows
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login`);
}
