'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createBrowserSupabase();

  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/account');
    });
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const sendOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setStep('otp');
    setResendTimer(60);
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length < 8) return;
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp.trim(),
      type: 'email',
    });
    setLoading(false);
    if (err) { setError('Invalid or expired code. Try again.'); return; }
    // Redirect to intended destination if set
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next') || '/account';
    router.replace(next);
  };

  const inp = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '0.5px solid rgba(255,255,255,0.15)',
    borderRadius: 8, padding: '14px 16px',
    fontFamily: 'var(--ff-sans)', fontSize: 16,
    color: 'rgba(255,255,255,0.9)', outline: 'none',
    letterSpacing: step === 'otp' ? '0.3em' : '0.02em',
    textAlign: step === 'otp' ? 'center' : 'left',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '0.5px solid var(--border)', padding: '0 4vw', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontFamily: 'var(--ff-sans)', fontSize: 14, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' }}>
          Scent Snob <span style={{ color: '#b09060' }}>Decants</span>
        </Link>
        <Link href="/" style={{ fontSize: 11, color: 'var(--t3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>← Back to store</Link>
      </nav>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo mark */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '0.5px solid rgba(176,144,96,0.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 20 }}>
              🧴
            </div>
            <h1 style={{ fontFamily: 'var(--ff-serif)', fontSize: '1.8rem', fontWeight: 400, color: 'var(--t1)', marginBottom: 8 }}>
              {step === 'email' ? 'Sign in' : 'Check your email'}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6 }}>
              {step === 'email'
                ? 'Enter your email to receive a one-time code'
                : <>We sent a 6-digit code to<br /><span style={{ color: 'var(--gold)' }}>{email}</span></>
              }
            </p>
          </div>

          {/* Email step */}
          {step === 'email' && (
            <form onSubmit={sendOTP} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)', display: 'block', marginBottom: 8 }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@example.com"
                  autoFocus
                  required
                  style={inp}
                />
              </div>
              {error && <p style={{ fontSize: 12, color: '#e05a5a', textAlign: 'center' }}>{error}</p>}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                style={{
                  width: '100%', padding: '14px', borderRadius: 8,
                  background: loading ? 'rgba(176,144,96,0.5)' : '#b09060',
                  border: 'none', color: '#fff',
                  fontFamily: 'var(--ff-sans)', fontSize: 13,
                  fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer', transition: 'all .2s',
                }}
              >
                {loading ? 'Sending...' : 'Send Code'}
              </button>
              <p style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', lineHeight: 1.7 }}>
                No account needed — just enter your email and we'll create one for you.
              </p>
            </form>
          )}

          {/* OTP step */}
          {step === 'otp' && (
            <form onSubmit={verifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)', display: 'block', marginBottom: 8, textAlign: 'center' }}>
                  6-digit code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
                  placeholder="00000000"
                  autoFocus
                  maxLength={8}
                  style={inp}
                />
              </div>
              {error && <p style={{ fontSize: 12, color: '#e05a5a', textAlign: 'center' }}>{error}</p>}
              <button
                type="submit"
                disabled={loading || otp.length < 8}
                style={{
                  width: '100%', padding: '14px', borderRadius: 8,
                  background: loading || otp.length < 8 ? 'rgba(176,144,96,0.5)' : '#b09060',
                  border: 'none', color: '#fff',
                  fontFamily: 'var(--ff-sans)', fontSize: 13,
                  fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: loading || otp.length < 8 ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
              <div style={{ textAlign: 'center' }}>
                {resendTimer > 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--t3)' }}>Resend in {resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={sendOTP}
                    style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Resend code
                  </button>
                )}
                <span style={{ color: 'var(--t3)', fontSize: 12, margin: '0 8px' }}>·</span>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 12, cursor: 'pointer' }}
                >
                  Change email
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
