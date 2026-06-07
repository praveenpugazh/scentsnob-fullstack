'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase'
import ThemeToggle from '@/components/ThemeToggle'

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
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const mobileNavLink = (id, label, emoji = '') => (
    <button
      onClick={() => {
        goTab(id)
        setMenuOpen(false)
        setSearchOpen(false)
        onSearch('')
      }}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        fontFamily: 'var(--ff-sans)',
        padding: '12px 0',
        width: '100%',
        textAlign: 'left',
        color: activeTab === id ? 'var(--gold)' : 'var(--w65)',
        borderBottom: '0.5px solid var(--w06)',
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}
    >
      {emoji && <span style={{ fontSize: 16 }}>{emoji}</span>}
      {label}
      {activeTab === id && (
        <span
          style={{ marginLeft: 'auto', color: 'var(--gold)', fontSize: 10 }}
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
        color: activeTab === id ? 'var(--gold)' : 'var(--w50)',
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
          background: scrolled
            ? 'color-mix(in srgb, var(--bg) 98%, transparent)'
            : 'color-mix(in srgb, var(--bg) 90%, transparent)',
          backdropFilter: 'blur(16px)',
          borderBottom: '0.5px solid var(--w07)',
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
              color: 'var(--w90)',
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
                    color: 'var(--w30)',
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
                    background: 'var(--w06)',
                    border: '0.5px solid var(--w15)',
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
                      color: 'var(--w30)',
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
                  color: 'var(--w50)',
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
                    background: 'var(--gold-15)',
                    border: '0.5px solid var(--gold-40)',
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
                    color: 'var(--w40)',
                    textDecoration: 'none'
                  }}
                >
                  Sign in
                </Link>
              )}
            </div>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Cart */}
            <button
              onClick={onCartOpen}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--gold-08)',
                border: '0.5px solid var(--gold-25)',
                borderRadius: 5,
                padding: '7px 12px',
                color: 'var(--w75)',
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
                  background: menuOpen ? 'var(--gold)' : 'var(--w70)',
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
                  background: menuOpen ? 'transparent' : 'var(--w70)',
                  transition: 'all .2s'
                }}
              />
              <span
                style={{
                  display: 'block',
                  width: 20,
                  height: 1.5,
                  background: menuOpen ? 'var(--gold)' : 'var(--w70)',
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
            top: 56,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99,
            background: 'var(--overlay)'
          }}
          onClick={() => setMenuOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg)',
              borderBottom: '0.5px solid var(--w08)',
              padding: '0.5rem 4vw 1rem'
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
                    color: 'var(--w65)',
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
                    color: 'var(--w65)',
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

            {/* Theme toggle in mobile menu */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 0',
                borderTop: '0.5px solid var(--w06)',
                marginTop: 4
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--ff-sans)',
                  color: 'var(--w65)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <span style={{ fontSize: 16 }}>🎨</span> Appearance
              </span>
              <ThemeToggle />
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
