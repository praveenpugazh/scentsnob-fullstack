'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase';

export default function Nav({ cartCount = 0, onCartOpen, onSearch, searchValue = '', activeTab, onTabChange }) {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const supabase = createBrowserSupabase();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  const navLink = (id, label) => (
    <button onClick={() => { onTabChange(id); setSearchOpen(false); onSearch(''); }}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
        fontFamily: 'var(--ff-sans)', padding: '4px 0',
        color: activeTab === id ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
        borderBottom: activeTab === id ? '1px solid var(--gold)' : '1px solid transparent',
        transition: 'all .2s',
      }}>
      {label}
    </button>
  );

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: scrolled ? 'rgba(10,9,8,0.98)' : 'rgba(10,9,8,0.9)',
      backdropFilter: 'blur(16px)',
      borderBottom: '0.5px solid rgba(255,255,255,0.07)',
      transition: 'all .3s',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 4vw', display: 'flex', alignItems: 'center', height: 58, gap: 28 }}>

        {/* Logo */}
        <button onClick={() => { onTabChange('home'); setSearchOpen(false); onSearch(''); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ff-sans)', fontSize: 14, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)', flexShrink: 0, padding: 0 }}>
          Scent Snob <span style={{ color: '#b09060' }}>Decants</span>
        </button>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1 }}>
          {navLink('brands', 'Brands')}
          {navLink('partials', 'Partials')}
          <Link href="/about" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>About</Link>
        </div>

        {/* Right: search + account + cart */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>

          {/* Search */}
          {searchOpen ? (
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>⌕</span>
              <input
                autoFocus
                value={searchValue}
                onChange={e => onSearch(e.target.value)}
                onBlur={() => { if (!searchValue) setSearchOpen(false); }}
                placeholder="Search..."
                style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '7px 28px 7px 30px', fontSize: 13, color: 'var(--t1)', outline: 'none', width: 220, fontFamily: 'var(--ff-sans)' }}
              />
              {searchValue && (
                <button onClick={() => { onSearch(''); setSearchOpen(false); }}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 16 }}>×</button>
              )}
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', padding: 4 }}
              title="Search">⌕</button>
          )}

          {/* Account */}
          {user ? (
            <Link href="/account" title={user.email} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(176,144,96,0.15)', border: '0.5px solid rgba(176,144,96,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-serif)', fontSize: 10, color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>
              {user.email.slice(0, 2).toUpperCase()}
            </Link>
          ) : (
            <Link href="/login" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Sign in</Link>
          )}

          {/* Cart */}
          <button onClick={onCartOpen} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(176,144,96,0.08)', border: '0.5px solid rgba(176,144,96,0.25)', borderRadius: 5, padding: '7px 14px', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--ff-sans)', transition: 'all .2s' }}>
            🧴
            {cartCount > 0 && <span style={{ background: '#b09060', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{cartCount}</span>}
            <span>Cart</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
