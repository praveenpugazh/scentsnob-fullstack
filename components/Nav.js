'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase';

export default function Nav({ cartCount = 0, onCartOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const supabase = createBrowserSupabase();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: scrolled ? 'rgba(10,9,8,0.97)' : 'rgba(10,9,8,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: `0.5px solid ${scrolled ? 'rgba(176,144,96,0.15)' : 'rgba(255,255,255,0.05)'}`,
      transition: 'all .3s',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 4vw', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <Link href="/" style={{ fontFamily: 'var(--ff-sans)', fontSize: 14, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' }}>
          Scent Snob <span style={{ color: '#b09060' }}>Decants</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/about" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>About</Link>

          {/* Account link */}
          {user ? (
            <Link href="/account" title={user.email} style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(176,144,96,0.15)',
              border: '0.5px solid rgba(176,144,96,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--ff-serif)', fontSize: 11, color: 'var(--gold)',
              fontWeight: 600, textDecoration: 'none', letterSpacing: 0,
            }}>
              {user.email.slice(0, 2).toUpperCase()}
            </Link>
          ) : (
            <Link href="/login" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
              Sign in
            </Link>
          )}

          {/* Cart */}
          <button
            onClick={onCartOpen}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: '0.5px solid rgba(176,144,96,0.3)', borderRadius: 4, padding: '6px 14px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all .2s' }}
          >
            🧴 Cart{cartCount > 0 && <span style={{ background: '#b09060', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>{cartCount}</span>}
          </button>
        </div>
      </div>
    </nav>
  );
}
