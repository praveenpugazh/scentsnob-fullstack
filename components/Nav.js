'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase'

export default function Nav({
  cartCount = 0,
  onCartOpen,
  onSearch = () => {},
  searchValue = '',
  activeTab,
  onTabChange
}) {
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const supabase = createBrowserSupabase()

  // Safe wrapper — won't crash if onTabChange not provided (e.g. /about page)
  const goTab = (id) => {
    if (typeof onTabChange === 'function') onTabChange(id)
  }

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user || null))
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user || null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  const mobileNavLink = (id, label, emoji = '') => (
    <button
      onClick={() => {
        setMenuOpen(false)
        setSearchOpen(false)
        onSearch('')
        // Small delay so menu closes visually before tab switches
        setTimeout(() => {
          if (typeof onTabChange === 'function') onTabChange(id)
        }, 10)
      }}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 15,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        fontFamily: 'var(--ff-sans)',
        padding: '18px 0',
        width: '100%',
        textAlign: 'left',
        color: activeTab === id ? 'var(--gold)' : 'var(--t1)',
        borderBottom: '0.5px solid var(--w08)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        WebkitTapHighlightColor: 'rgba(176,144,96,0.15)',
        userSelect: 'none'
      }}
    >
      {emoji && <span style={{ fontSize: 20 }}>{emoji}</span>}
      {label}
      {activeTab === id && (
        <span
          style={{ marginLeft: 'auto', color: 'var(--gold)', fontSize: 12 }}
        >
          ●
        </span>
      )}
    </button>
  )

  const desktopNavLink = (id, label) => (
    <button
      onClick={() => {
        goTab(id)
        setSearchOpen(false)
        onSearch('')
      }}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 11,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontFamily: 'var(--ff-sans)',
        padding: '4px 0',
        color: activeTab === id ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
        borderBottom:
          activeTab === id ? '1px solid var(--gold)' : '1px solid transparent',
        transition: 'all .2s'
      }}
    >
      {label}
    </button>
  )

  return (
    <>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: scrolled ? 'rgba(10,9,8,0.98)' : 'rgba(10,9,8,0.9)',
          backdropFilter: 'blur(16px)',
          borderBottom: '0.5px solid rgba(255,255,255,0.07)',
          transition: 'all .3s'
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            padding: '0 4vw',
            display: 'flex',
            alignItems: 'center',
            height: 56,
            gap: 16
          }}
        >
          {/* Logo */}
          <button
            onClick={() => {
              goTab('home')
              setSearchOpen(false)
              onSearch('')
              setMenuOpen(false)
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--ff-sans)',
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.9)',
              flexShrink: 0,
              padding: 0
            }}
          >
            Scent Snob <span style={{ color: '#b09060' }}>Decants</span>
          </button>

          {/* Desktop nav links */}
          <div
            className='desktop-nav'
            style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1 }}
          >
            {desktopNavLink('brands', 'Brands')}
            {desktopNavLink('partials', 'Partials')}
            {desktopNavLink('about', 'About')}
          </div>

          {/* Right side */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginLeft: 'auto',
              flexShrink: 0
            }}
          >
            {/* Search */}
            {searchOpen ? (
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: 14
                  }}
                >
                  ⌕
                </span>
                <input
                  autoFocus
                  value={searchValue}
                  onChange={(e) => onSearch(e.target.value)}
                  onBlur={() => {
                    if (!searchValue) setSearchOpen(false)
                  }}
                  placeholder='Search...'
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '0.5px solid rgba(255,255,255,0.15)',
                    borderRadius: 6,
                    padding: '7px 28px 7px 30px',
                    fontSize: 13,
                    color: 'var(--t1)',
                    outline: 'none',
                    width: 180,
                    fontFamily: 'var(--ff-sans)'
                  }}
                />
                {searchValue && (
                  <button
                    onClick={() => {
                      onSearch('')
                      setSearchOpen(false)
                    }}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.3)',
                      cursor: 'pointer',
                      fontSize: 16
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontSize: 20,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                ⌕
              </button>
            )}

            {/* Account — desktop only */}
            <div className='desktop-nav'>
              {user ? (
                <Link
                  href='/account'
                  title={user.email}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(176,144,96,0.15)',
                    border: '0.5px solid rgba(176,144,96,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--ff-serif)',
                    fontSize: 10,
                    color: 'var(--gold)',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  {user.email.slice(0, 2).toUpperCase()}
                </Link>
              ) : (
                <Link
                  href='/login'
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.4)',
                    textDecoration: 'none'
                  }}
                >
                  Sign in
                </Link>
              )}
            </div>

            {/* Cart */}
            <button
              onClick={onCartOpen}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(176,144,96,0.08)',
                border: '0.5px solid rgba(176,144,96,0.25)',
                borderRadius: 5,
                padding: '7px 12px',
                color: 'rgba(255,255,255,0.75)',
                cursor: 'pointer',
                fontSize: 12,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: 'var(--ff-sans)'
              }}
            >
              🧴
              {cartCount > 0 && (
                <span
                  style={{
                    background: '#b09060',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>

            {/* Hamburger — mobile only */}
            <button
              ref={menuRef}
              onClick={() => setMenuOpen((o) => !o)}
              className='hamburger'
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: 20,
                  height: 1.5,
                  background: menuOpen
                    ? 'var(--gold)'
                    : 'rgba(255,255,255,0.7)',
                  transition: 'all .2s',
                  transform: menuOpen
                    ? 'rotate(45deg) translate(4px, 4px)'
                    : 'none'
                }}
              />
              <span
                style={{
                  display: 'block',
                  width: 20,
                  height: 1.5,
                  background: menuOpen
                    ? 'transparent'
                    : 'rgba(255,255,255,0.7)',
                  transition: 'all .2s'
                }}
              />
              <span
                style={{
                  display: 'block',
                  width: 20,
                  height: 1.5,
                  background: menuOpen
                    ? 'var(--gold)'
                    : 'rgba(255,255,255,0.7)',
                  transition: 'all .2s',
                  transform: menuOpen
                    ? 'rotate(-45deg) translate(4px, -4px)'
                    : 'none'
                }}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.5)'
          }}
          onClick={() => setMenuOpen(false)}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              background: 'var(--bg)',
              padding: '0 4vw',
              paddingTop: 70,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              borderBottom: '1px solid var(--gold-15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {mobileNavLink('brands', 'Brands', '🏷️')}
            {mobileNavLink('partials', 'Partials', '🧴')}
            {mobileNavLink('about', 'About', 'ℹ️')}
            <div>
              {user ? (
                <Link
                  href='/account'
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 0',
                    color: 'rgba(255,255,255,0.65)',
                    textDecoration: 'none',
                    fontSize: 13,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--ff-sans)'
                  }}
                >
                  <span style={{ fontSize: 16 }}>👤</span> My Account
                </Link>
              ) : (
                <Link
                  href='/login'
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 0',
                    color: 'rgba(255,255,255,0.65)',
                    textDecoration: 'none',
                    fontSize: 13,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--ff-sans)'
                  }}
                >
                  <span style={{ fontSize: 16 }}>🔑</span> Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .desktop-nav { display: flex !important; align-items: center; gap: 24px; flex: 1; }
        .hamburger { display: none !important; }
        @media (max-width: 640px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>
    </>
  )
}
