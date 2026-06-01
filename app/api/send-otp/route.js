import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // Generate OTP via Supabase admin — this creates/uses the user without sending email
    // Then we send the email ourselves via Resend
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
    });

    if (error) {
      console.error('Supabase generateLink error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Extract the token from the link
    const url = new URL(data.properties.action_link);
    const token = url.searchParams.get('token') || data.properties.hashed_token;

    // Send via Resend API directly
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
            <h2 style="color:#b09060;font-size:22px;margin-bottom:8px;">Scent Snob Decants</h2>
            <p style="color:#999;margin-bottom:32px;">Your one-time login code:</p>
            <div style="background:#1a1714;border:1px solid #333;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
              <span style="font-size:36px;font-weight:700;letter-spacing:0.3em;color:#fff;">${token?.slice(-8).toUpperCase()}</span>
            </div>
            <p style="color:#666;font-size:13px;">This code expires in 10 minutes.</p>
            <p style="color:#666;font-size:13px;">After signing in, you'll stay logged in — no code needed next time.</p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const resendErr = await resendRes.json();
      console.error('Resend error:', resendErr);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-otp error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
