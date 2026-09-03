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
  const supabase = createBrowserSupabase()

  const navigate = (id) => {
    if (typeof onTabChange === 'function') onTabChange(id)
    setMenuOpen(false)
    setSearchOpen(false)
    onSearch('')
  }

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h, { passive: true })
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

  // Lock body scroll when menu open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const NAV_ITEMS = [
    { id: 'brands', label: 'Brands', emoji: '🏷️' },
    { id: 'partials', label: 'Partials', emoji: '🧴' },
    { id: 'about', label: 'About', emoji: 'ℹ️' }
  ]

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
            onClick={() => navigate('home')}
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
            {NAV_ITEMS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => navigate(id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--ff-sans)',
                  padding: '4px 0',
                  color:
                    activeTab === id ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
                  borderBottom:
                    activeTab === id
                      ? '1px solid var(--gold)'
                      : '1px solid transparent',
                  transition: 'all .2s'
                }}
              >
                {label}
              </button>
            ))}
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

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className='hamburger'
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: 22,
                  height: 2,
                  background: menuOpen
                    ? 'var(--gold)'
                    : 'rgba(255,255,255,0.8)',
                  borderRadius: 2,
                  transition: 'all .25s',
                  transform: menuOpen
                    ? 'rotate(45deg) translate(4px, 4px)'
                    : 'none'
                }}
              />
              <span
                style={{
                  display: 'block',
                  width: 22,
                  height: 2,
                  background: menuOpen
                    ? 'transparent'
                    : 'rgba(255,255,255,0.8)',
                  borderRadius: 2,
                  transition: 'all .25s'
                }}
              />
              <span
                style={{
                  display: 'block',
                  width: 22,
                  height: 2,
                  background: menuOpen
                    ? 'var(--gold)'
                    : 'rgba(255,255,255,0.8)',
                  borderRadius: 2,
                  transition: 'all .25s',
                  transform: menuOpen
                    ? 'rotate(-45deg) translate(4px, -4px)'
                    : 'none'
                }}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer — completely separate from nav, no event propagation issues */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          {/* Backdrop — tapping this closes menu */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.6)'
            }}
            onClick={() => setMenuOpen(false)}
          />

          {/* Drawer panel — slides in from top */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              background: '#0a0908',
              borderBottom: '1px solid rgba(176,144,96,0.2)',
              paddingBottom: 8,
              zIndex: 1
            }}
          >
            {/* Nav header row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4vw',
                height: 56,
                borderBottom: '0.5px solid rgba(255,255,255,0.06)'
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--ff-sans)',
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.9)'
                }}
              >
                Scent Snob <span style={{ color: '#b09060' }}>Decants</span>
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 28,
                  lineHeight: 1,
                  padding: '4px 8px'
                }}
              >
                ×
              </button>
            </div>

            {/* Nav items — large tap targets */}
            <div style={{ padding: '8px 4vw 0' }}>
              {NAV_ITEMS.map(({ id, label, emoji }) => (
                <button
                  key={id}
                  onClick={() => navigate(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    width: '100%',
                    padding: '16px 0',
                    background: 'none',
                    border: 'none',
                    borderBottom: '0.5px solid rgba(255,255,255,0.07)',
                    cursor: 'pointer',
                    color:
                      activeTab === id ? '#b09060' : 'rgba(255,255,255,0.85)',
                    fontFamily: 'var(--ff-sans)',
                    fontSize: 15,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    textAlign: 'left',
                    WebkitTapHighlightColor: 'rgba(176,144,96,0.15)'
                  }}
                >
                  <span
                    style={{ fontSize: 20, width: 28, textAlign: 'center' }}
                  >
                    {emoji}
                  </span>
                  {label}
                  {activeTab === id && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        color: '#b09060',
                        fontSize: 18
                      }}
                    >
                      ›
                    </span>
                  )}
                </button>
              ))}

              {/* Account / Sign in */}
              {user ? (
                <Link
                  href='/account'
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    width: '100%',
                    padding: '16px 0',
                    color: 'rgba(255,255,255,0.85)',
                    textDecoration: 'none',
                    fontFamily: 'var(--ff-sans)',
                    fontSize: 15,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    borderBottom: '0.5px solid rgba(255,255,255,0.07)'
                  }}
                >
                  <span
                    style={{ fontSize: 20, width: 28, textAlign: 'center' }}
                  >
                    👤
                  </span>{' '}
                  My Account
                </Link>
              ) : (
                <Link
                  href='/login'
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    width: '100%',
                    padding: '16px 0',
                    color: 'rgba(255,255,255,0.85)',
                    textDecoration: 'none',
                    fontFamily: 'var(--ff-sans)',
                    fontSize: 15,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    borderBottom: '0.5px solid rgba(255,255,255,0.07)'
                  }}
                >
                  <span
                    style={{ fontSize: 20, width: 28, textAlign: 'center' }}
                  >
                    🔑
                  </span>{' '}
                  Sign In
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
