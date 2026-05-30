'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase';

export default function Nav({ cartCount = 0, onCartOpen, onSearch, searchValue = '' }) {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const router = useRouter();
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
      borderBottom: '0.5px solid rgba(255,255,255,0.06)',
      transition: 'all .3s',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 4vw', display: 'flex', alignItems: 'center', height: 56, gap: 16 }}>

        {/* Logo */}
        <Link href="/" style={{ fontFamily: 'var(--ff-sans)', fontSize: 14, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)', flexShrink: 0 }}>
          Scent Snob <span style={{ color: '#b09060' }}>Decants</span>
        </Link>

        {/* Search bar — expands inline */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: 480, margin: '0 auto' }}>
          {showSearch || searchValue ? (
            <div style={{ position: 'relative', width: '100%' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 15 }}>⌕</span>
              <input
                autoFocus
                value={searchValue}
                onChange={e => onSearch && onSearch(e.target.value)}
                placeholder="Search fragrances, brands, notes..."
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '8px 32px 8px 34px', fontSize: 13, color: 'var(--t1)', outline: 'none', fontFamily: 'var(--ff-sans)' }}
              />
              {searchValue && (
                <button onClick={() => onSearch && onSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 16 }}>×</button>
              )}
            </div>
          ) : (
            <button onClick={() => setShowSearch(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '7px 16px', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--ff-sans)', letterSpacing: '0.06em' }}>
              <span style={{ fontSize: 15 }}>⌕</span> Search fragrances...
            </button>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <Link href="/about" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>About</Link>

          {user ? (
            <Link href="/account" title={user.email} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(176,144,96,0.15)', border: '0.5px solid rgba(176,144,96,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-serif)', fontSize: 11, color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>
              {user.email.slice(0, 2).toUpperCase()}
            </Link>
          ) : (
            <Link href="/login" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Sign in</Link>
          )}

          <button onClick={onCartOpen} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '0.5px solid rgba(176,144,96,0.3)', borderRadius: 4, padding: '6px 14px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all .2s', fontFamily: 'var(--ff-sans)' }}>
            🧴{cartCount > 0 && <span style={{ background: '#b09060', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>{cartCount}</span>}
          </button>
        </div>
      </div>
    </nav>
  );
}
