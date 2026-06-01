import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check OTP
    const { data: record, error: fetchErr } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (fetchErr || !record) {
      return NextResponse.json({ error: 'No code found. Please request a new one.' }, { status: 400 });
    }

    if (record.otp !== otp.trim()) {
      return NextResponse.json({ error: 'Invalid code. Try again.' }, { status: 400 });
    }

    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 });
    }

    // Delete used OTP
    await supabaseAdmin.from('otp_codes').delete().eq('email', email.toLowerCase());

    // Generate a session for the user
    const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
    const user = userData?.users?.find(u => u.email === email.toLowerCase());

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    // Create a magic link to get a session token
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
    });

    if (linkErr) {
      console.error('generateLink error:', linkErr);
      return NextResponse.json({ error: 'Could not create session' }, { status: 500 });
    }

    // Return the action link — frontend will use it to set session
    return NextResponse.json({
      success: true,
      action_link: linkData.properties.action_link,
    });
  } catch (err) {
    console.error('verify-otp error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
