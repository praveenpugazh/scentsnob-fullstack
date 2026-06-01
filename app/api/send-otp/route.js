import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // Generate a 6-digit OTP ourselves
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Ensure user exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === email.toLowerCase());

    if (!userExists) {
      // Create user
      const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        email_confirm: true,
      });
      if (createErr && createErr.message !== 'User already registered') {
        console.error('Create user error:', createErr);
      }
    }

    // Store OTP in a custom table
    const { error: storeErr } = await supabaseAdmin
      .from('otp_codes')
      .upsert({ email: email.toLowerCase(), otp, expires_at: expiresAt }, { onConflict: 'email' });

    if (storeErr) {
      console.error('Store OTP error:', storeErr);
      return NextResponse.json({ error: 'Failed to store code' }, { status: 500 });
    }

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Scent Snob <onboarding@resend.dev>',
        to: [email],
        subject: 'Your Scent Snob login code',
        html: `
          <div style="background:#0a0908;padding:40px 24px;font-family:sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#b09060;font-size:20px;margin:0 0 6px;">Scent Snob Decants</h2>
            <p style="color:#888;margin:0 0 32px;font-size:14px;">Your one-time login code</p>
            <div style="background:#1a1714;border:1px solid #2a2520;border-radius:8px;padding:28px;text-align:center;margin-bottom:24px;">
              <span style="font-size:40px;font-weight:700;letter-spacing:0.25em;color:#fff;font-family:monospace;">${otp}</span>
            </div>
            <p style="color:#555;font-size:12px;margin:0 0 4px;">Expires in 10 minutes. Don't share this code.</p>
            <p style="color:#555;font-size:12px;margin:0;">After signing in you'll stay logged in — no code needed next time.</p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const resendErr = await resendRes.text();
      console.error('Resend error:', resendErr);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-otp error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
