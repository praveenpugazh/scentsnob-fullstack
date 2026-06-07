'use client'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('ssd_theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('ssd_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  // Avoid hydration mismatch — render nothing until mounted
  if (!mounted) return <div style={{ width: 36, height: 20 }} />

  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'relative',
        width: 36,
        height: 20,
        borderRadius: 10,
        border: '0.5px solid var(--w20)',
        background: isDark ? 'var(--w08)' : 'var(--gold-30)',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 0.3s, border-color 0.3s',
        flexShrink: 0
      }}
    >
      {/* Track icons */}
      <span
        style={{
          position: 'absolute',
          left: 4,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 9,
          opacity: isDark ? 0 : 1,
          transition: 'opacity 0.2s',
          lineHeight: 1
        }}
      >
        ☀️
      </span>
      <span
        style={{
          position: 'absolute',
          right: 4,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 9,
          opacity: isDark ? 1 : 0,
          transition: 'opacity 0.2s',
          lineHeight: 1
        }}
      >
        🌙
      </span>
      {/* Thumb */}
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: isDark ? 'calc(100% - 16px)' : 2,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: isDark ? 'var(--gold)' : '#fff',
          transition: 'left 0.25s cubic-bezier(.4,0,.2,1), background 0.3s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
        }}
      />
    </button>
  )
}
