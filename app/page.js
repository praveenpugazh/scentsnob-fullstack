'use client'
import { useState, useEffect, useCallback } from 'react'
import Nav from '@/components/Nav'
import CartDrawer from '@/components/CartDrawer'
import ProductCard from '@/components/ProductCard'
import PartialCard from '@/components/PartialCard'
import {
  WA_NUMBER,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_CHARGE,
  formatINR
} from '@/lib/pricing'
import { createBrowserSupabase } from '@/lib/supabase'

const COMBOS = [
  {
    id: 'summer-escape',
    label: 'Summer Escape',
    emoji: '☀️',
    tag: 'Summer Combo',
    tagline: 'Four fresh, aquatic and citrus scents built for Indian summers.',
    color: '#7ec8e3',
    discountPct: 10,
    items: [
      { brand: 'Rasasi', name: 'Hawas Ice', size: '5ml', price: 379 },
      { brand: 'French Avenue', name: 'Frostbite', size: '5ml', price: 349 },
      { brand: 'Rayhaan', name: 'Aquatica', size: '5ml', price: 209 },
      { brand: 'Afnan', name: 'Turathi Blue', size: '5ml', price: 229 }
    ]
  },
  {
    id: 'starter-pack',
    label: 'The Starter Pack',
    emoji: '🎯',
    tag: 'Starter Combo',
    tagline: 'New to fragrance? Four crowd-pleasing picks to get you started.',
    color: '#4caf7d',
    discountPct: 10,
    items: [
      { brand: 'Lattafa', name: 'Asad Elixir', size: '5ml', price: 179 },
      { brand: 'Afnan', name: '9pm Elixir', size: '5ml', price: 219 },
      { brand: 'Rayhaan', name: 'Aquatica', size: '5ml', price: 209 },
      { brand: 'Armaf', name: 'Odyssey Spectre', size: '5ml', price: 159 }
    ]
  }
]

function comboPrice(combo) {
  const original = combo.items.reduce((s, i) => s + i.price, 0)
  const discounted =
    Math.round((original * (1 - combo.discountPct / 100)) / 10) * 10
  return { original, discounted, saving: original - discounted }
}

function addComboToCart(combo, addToCart, showToast) {
  const { discounted } = comboPrice(combo)
  const original = combo.items.reduce((s, i) => s + i.price, 0)
  combo.items.forEach((item) => {
    const p = Math.round(((item.price / original) * discounted) / 10) * 10
    // Pass silent=true to suppress individual toasts
    addToCart(
      {
        id: `combo-${combo.id}-${item.name}`,
        brand: item.brand,
        name: item.name,
        isPartial: false
      },
      item.size,
      p,
      true
    )
  })
  // Show one combined toast for the whole combo
  if (showToast)
    showToast(`${combo.label} added — ${combo.items.length} items 🧴`)
}

// Brand categories
const BRAND_CATS = [
  { id: 'niche', label: 'Niche' },
  { id: 'designer', label: 'Designer' },
  { id: 'dupe', label: 'Middle Eastern & Dupes' }
]

export default function Home() {
  const [products, setProducts] = useState([])
  const [partials, setPartials] = useState([])
  const [cart, setCart] = useState({})
  const [cartOpen, setCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('home')
  const [brandCat, setBrandCat] = useState('niche')
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [wishlistIds, setWishlistIds] = useState(new Set())

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/partials').then((r) => r.json())
    ]).then(([prods, parts]) => {
      setProducts(Array.isArray(prods) ? prods : [])
      setPartials(Array.isArray(parts) ? parts : [])
      setLoading(false)
    })
  }, [])

  // Load wishlist if logged in
  const supabase = createBrowserSupabase()
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const res = await fetch('/api/wishlist', {
        headers: { Authorization: `Bearer ${data.session.access_token}` }
      })
      const wl = await res.json()
      if (Array.isArray(wl))
        setWishlistIds(new Set(wl.map((w) => w.product_id)))
    })
  }, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('ssd_cart')
      if (savedCart) setCart(JSON.parse(savedCart))
      const savedTab = localStorage.getItem('ssd_tab')
      if (savedTab) setTab(savedTab)
      const savedCat = localStorage.getItem('ssd_brandcat')
      if (savedCat) setBrandCat(savedCat)
    } catch {}
  }, [])

  // Persist cart to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem('ssd_cart', JSON.stringify(cart))
    } catch {}
  }, [cart])

  // Persist tab to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ssd_tab', tab)
    } catch {}
  }, [tab])

  // Persist brandCat
  useEffect(() => {
    try {
      localStorage.setItem('ssd_brandcat', brandCat)
    } catch {}
  }, [brandCat])

  const addToCart = useCallback((product, size, price, silent = false) => {
    const key = `${product.id}-${size}`
    setCart((c) => ({
      ...c,
      [key]: c[key]
        ? { ...c[key], qty: c[key].qty + 1 }
        : {
            id: product.id,
            brand: product.brand,
            name: product.name,
            size,
            price,
            qty: 1,
            isPartial: !!product.isPartial
          }
    }))
    if (!silent) showToast(`${product.name} added`)
  }, [])

  const changeQty = useCallback((key, delta) => {
    setCart((c) => {
      const item = c[key]
      if (!item) return c
      if (item.qty + delta <= 0) {
        const { [key]: _, ...rest } = c
        return rest
      }
      return { ...c, [key]: { ...item, qty: item.qty + delta } }
    })
  }, [])

  const items = Object.entries(cart)
  const subtotal = items.reduce((a, [, b]) => a + b.price * b.qty, 0)
  const hasOnlyPartials =
    items.length > 0 && items.every(([, b]) => b.isPartial)
  const shipping =
    subtotal >= FREE_SHIPPING_THRESHOLD && !hasOnlyPartials
      ? 0
      : SHIPPING_CHARGE
  const grandTotal = subtotal + shipping
  const cartCount = items.reduce((a, [, b]) => a + b.qty, 0)

  const visiblePartials = partials.filter((p) => p.visible && !p.sold_out)
  const searchQ = search.trim().toLowerCase()

  // Brands by category
  const brandsInCat = [
    ...new Set(
      products.filter((p) => p.category === brandCat).map((p) => p.brand)
    )
  ].sort()
  const allBrandsTotal = [...new Set(products.map((p) => p.brand))].sort()

  // Products for selected brand
  const brandProducts = selectedBrand
    ? products.filter((p) => p.brand === selectedBrand)
    : []

  // Search results
  const searchProducts = products.filter((p) =>
    `${p.brand} ${p.name} ${p.notes || ''}`.toLowerCase().includes(searchQ)
  )
  const searchPartials = visiblePartials.filter((p) =>
    `${p.brand} ${p.name} ${p.notes || ''}`.toLowerCase().includes(searchQ)
  )

  const switchTab = (id) => {
    setTab(id)
    setSelectedBrand(null)
    setSearch('')
  }

  const S = {
    subTab: (active) => ({
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--ff-sans)',
      fontSize: 11,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      padding: '8px 16px',
      color: active ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
      borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
      transition: 'all .2s',
      whiteSpace: 'nowrap'
    })
  }

  return (
    <>
      <Nav
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)}
        onSearch={(v) => {
          setSearch(v)
          if (v) setTab('home')
        }}
        searchValue={search}
        activeTab={tab}
        onTabChange={switchTab}
      />

      {/* Announcement bar */}
      <div
        style={{
          background: '#0e0c0a',
          borderBottom: '0.5px solid rgba(255,255,255,0.05)',
          padding: '7px 0',
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--t3)',
          letterSpacing: '0.1em'
        }}
      >
        Free shipping above ₹3,000 · PAN India · Free 2ml niche sample on orders
        above ₹4,999
      </div>

      {/* ── SEARCH RESULTS ── */}
      {searchQ && (
        <main
          style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 4vw 6rem' }}
        >
          <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 20 }}>
            {searchProducts.length + searchPartials.length} result
            {searchProducts.length + searchPartials.length !== 1 ? 's' : ''} for
            "<span style={{ color: 'var(--t1)' }}>{search}</span>"
          </p>
          {searchPartials.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--gold)',
                  marginBottom: 14
                }}
              >
                Partial Bottles
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
                  gap: 12
                }}
              >
                {searchPartials.map((p) => (
                  <PartialCard key={p.id} partial={p} onAdd={addToCart} />
                ))}
              </div>
            </div>
          )}
          {searchProducts.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
                gap: 12
              }}
            >
              {searchProducts.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={addToCart} />
              ))}
            </div>
          )}
          {searchProducts.length === 0 && searchPartials.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '5rem',
                color: 'var(--t3)'
              }}
            >
              No results found for "{search}"
            </div>
          )}
        </main>
      )}

      {/* ── HOME ── */}
      {!searchQ && tab === 'home' && (
        <>
          {/* Hero */}
          <section
            style={{
              position: 'relative',
              overflow: 'hidden',
              minHeight: '72vh',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              <img
                src='/hero.jpg'
                alt=''
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: '60% center',
                  filter: 'brightness(0.5) saturate(0.9)'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(100deg, rgba(10,9,8,0.97) 30%, rgba(10,9,8,0.75) 50%, rgba(10,9,8,0.2) 80%, rgba(10,9,8,0.1) 100%)'
                }}
              />
            </div>
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                maxWidth: 1400,
                margin: '0 auto',
                padding: '3rem 4vw',
                width: '100%'
              }}
            >
              <div style={{ maxWidth: 580 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 24
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: '0.5px',
                      background: 'var(--gold)',
                      opacity: 0.6
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.32em',
                      textTransform: 'uppercase',
                      color: 'var(--gold)',
                      opacity: 0.85
                    }}
                  >
                    India's Niche Decant House
                  </span>
                </div>
                <h1
                  style={{
                    fontFamily: 'var(--ff-serif)',
                    fontSize: 'clamp(2.4rem,5vw,4rem)',
                    fontWeight: 400,
                    color: 'rgba(255,255,255,0.95)',
                    lineHeight: 1.12,
                    marginBottom: 18
                  }}
                >
                  Scent is the one
                  <br />
                  luxury <span style={{ color: 'var(--gold)' }}>everyone</span>
                  <br />
                  deserves.
                </h1>
                <p
                  style={{
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.45)',
                    maxWidth: 400,
                    lineHeight: 1.75,
                    marginBottom: 28
                  }}
                >
                  Authentic decants from bottles we personally source.
                  <br />
                  Try before you commit to a full bottle.
                </p>
                <div style={{ display: 'flex', gap: 28, marginBottom: 32 }}>
                  {[
                    [products.length || '247', 'Fragrances'],
                    ['5ml', 'Starting from'],
                    ['PAN India', 'Delivery']
                  ].map(([val, label]) => (
                    <div key={label}>
                      <div
                        style={{
                          fontFamily: 'var(--ff-serif)',
                          fontSize: '1.4rem',
                          color: 'rgba(255,255,255,0.85)'
                        }}
                      >
                        {val}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.3)',
                          marginTop: 2
                        }}
                      >
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => switchTab('brands')}
                    style={{
                      padding: '12px 24px',
                      borderRadius: 4,
                      background: '#b09060',
                      border: 'none',
                      color: '#fff',
                      fontFamily: 'var(--ff-sans)',
                      fontSize: 12,
                      fontWeight: 500,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      cursor: 'pointer'
                    }}
                  >
                    Shop Now
                  </button>
                  <a
                    href={`https://wa.me/${WA_NUMBER}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    style={{
                      padding: '12px 24px',
                      borderRadius: 4,
                      background: 'none',
                      border: '0.5px solid rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.65)',
                      fontFamily: 'var(--ff-sans)',
                      fontSize: 12,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    💬 WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* New Arrivals */}
          <main
            style={{ maxWidth: 1400, margin: '0 auto', padding: '3rem 4vw 0' }}
          >
            {!loading &&
              products.some((p) => p.is_new) &&
              (() => {
                const newArrivals = [...products]
                  .filter((p) => p.is_new)
                  .sort(
                    (a, b) => new Date(b.created_at) - new Date(a.created_at)
                  )
                  .slice(0, 10)
                return (
                  <section style={{ marginBottom: '3.5rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        marginBottom: '1.25rem'
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 6
                          }}
                        >
                          <div
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: '50%',
                              background: 'var(--gold)'
                            }}
                          />
                          <span
                            style={{
                              fontSize: 10,
                              letterSpacing: '0.24em',
                              textTransform: 'uppercase',
                              color: 'var(--gold)'
                            }}
                          >
                            Just In
                          </span>
                        </div>
                        <h2
                          style={{
                            fontFamily: 'var(--ff-serif)',
                            fontSize: 'clamp(1.4rem,2.5vw,1.8rem)',
                            fontWeight: 400,
                            color: 'var(--t1)'
                          }}
                        >
                          New Arrivals
                        </h2>
                      </div>
                      <button
                        onClick={() => switchTab('brands')}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: 12,
                          color: 'var(--t3)',
                          cursor: 'pointer',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          fontFamily: 'var(--ff-sans)'
                        }}
                      >
                        View all →
                      </button>
                    </div>
                    {/* Horizontal scroll row */}
                    <div
                      style={{
                        display: 'flex',
                        gap: 12,
                        overflowX: 'auto',
                        paddingBottom: 8,
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                      }}
                    >
                      {newArrivals.map((p) => (
                        <div key={p.id} style={{ flexShrink: 0, width: 190 }}>
                          <ProductCard
                            product={p}
                            onAdd={addToCart}
                            wishlisted={wishlistIds.has(p.id)}
                            onWishlistChange={(id, on) =>
                              setWishlistIds((s) => {
                                const n = new Set(s)
                                on ? n.add(id) : n.delete(id)
                                return n
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })()}
          </main>

          {/* Combos */}
          <main
            style={{ maxWidth: 1400, margin: '0 auto', padding: '0 4vw 6rem' }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 6
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--gold)'
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    color: 'var(--gold)'
                  }}
                >
                  Curated Sets
                </span>
              </div>
              <h2
                style={{
                  fontFamily: 'var(--ff-serif)',
                  fontSize: 'clamp(1.4rem,2.5vw,1.8rem)',
                  fontWeight: 400,
                  color: 'var(--t1)'
                }}
              >
                Combo <span style={{ color: 'var(--gold)' }}>Deals</span>
              </h2>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
                gap: 16,
                marginBottom: '4rem'
              }}
            >
              {COMBOS.map((combo) => {
                const { original, discounted, saving } = comboPrice(combo)
                return (
                  <div
                    key={combo.id}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 10,
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all .2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        'rgba(176,144,96,0.35)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.transform = 'none'
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(176,144,96,0.1)',
                        border: '0.5px solid rgba(176,144,96,0.2)',
                        borderRadius: 4,
                        padding: '3px 10px',
                        fontSize: 10,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.6)',
                        marginBottom: '0.75rem',
                        alignSelf: 'flex-start'
                      }}
                    >
                      {combo.emoji} {combo.tag}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--ff-serif)',
                        fontSize: '1.2rem',
                        color: 'var(--t1)',
                        marginBottom: 4
                      }}
                    >
                      {combo.label}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--t3)',
                        lineHeight: 1.6,
                        marginBottom: '1rem'
                      }}
                    >
                      {combo.tagline}
                    </div>
                    <div
                      style={{
                        borderTop: '0.5px solid var(--border)',
                        paddingTop: '0.75rem',
                        marginBottom: '1rem'
                      }}
                    >
                      {combo.items.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.45)',
                            padding: '4px 0'
                          }}
                        >
                          <span>
                            {item.brand} {item.name} ({item.size})
                          </span>
                          <span>₹{item.price}</span>
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 10,
                        marginBottom: '0.75rem'
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--ff-serif)',
                          fontSize: '1.5rem',
                          color: 'var(--gold)'
                        }}
                      >
                        ₹{discounted}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--t3)',
                          textDecoration: 'line-through'
                        }}
                      >
                        ₹{original}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: '#4caf7d',
                          background: 'rgba(76,175,125,0.1)',
                          padding: '2px 7px',
                          borderRadius: 3
                        }}
                      >
                        Save ₹{saving}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        addComboToCart(combo, addToCart, showToast)
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        background: '#b09060',
                        color: '#fff',
                        border: 'none',
                        padding: '11px 16px',
                        borderRadius: 6,
                        fontFamily: 'var(--ff-sans)',
                        fontSize: 12,
                        fontWeight: 500,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        cursor: 'pointer'
                      }}
                    >
                      🧴 Add Combo to Cart
                    </button>
                  </div>
                )
              })}
            </div>
          </main>
        </>
      )}

      {/* ── BRANDS PAGE ── */}
      {!searchQ && tab === 'brands' && (
        <main
          style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 4vw 6rem' }}
        >
          {/* Brand selected — show its products */}
          {selectedBrand ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 24
                }}
              >
                <button
                  onClick={() => setSelectedBrand(null)}
                  style={{
                    background: 'none',
                    border: '0.5px solid var(--border)',
                    borderRadius: 4,
                    padding: '5px 12px',
                    color: 'var(--t3)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontFamily: 'var(--ff-sans)'
                  }}
                >
                  ← All Brands
                </button>
                <div>
                  <h2
                    style={{
                      fontFamily: 'var(--ff-serif)',
                      fontSize: '1.4rem',
                      color: 'var(--t1)',
                      fontWeight: 400
                    }}
                  >
                    {selectedBrand}
                  </h2>
                  <p style={{ fontSize: 11, color: 'var(--t3)' }}>
                    {brandProducts.length} fragrance
                    {brandProducts.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {loading ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: 'var(--t3)'
                  }}
                >
                  Loading...
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
                    gap: 12
                  }}
                >
                  {brandProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onAdd={addToCart}
                      wishlisted={wishlistIds.has(p.id)}
                      onWishlistChange={(id, on) =>
                        setWishlistIds((s) => {
                          const n = new Set(s)
                          on ? n.add(id) : n.delete(id)
                          return n
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Sub-tabs: Niche | Designer | Dupes */}
              <div
                style={{
                  display: 'flex',
                  gap: 0,
                  borderBottom: '0.5px solid var(--border)',
                  marginBottom: 24
                }}
              >
                {BRAND_CATS.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setBrandCat(cat.id)}
                    style={S.subTab(brandCat === cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Brand cards */}
              {loading ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: 'var(--t3)'
                  }}
                >
                  Loading...
                </div>
              ) : brandsInCat.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '4rem',
                    color: 'var(--t3)'
                  }}
                >
                  No brands in this category yet.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))',
                    gap: 10
                  }}
                >
                  {brandsInCat.map((brand) => {
                    const count = products.filter(
                      (p) => p.brand === brand
                    ).length
                    return (
                      <button
                        key={brand}
                        onClick={() => setSelectedBrand(brand)}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '0.5px solid var(--border)',
                          borderRadius: 8,
                          padding: '18px 14px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'var(--ff-sans)',
                          transition: 'all .18s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor =
                            'rgba(176,144,96,0.5)'
                          e.currentTarget.style.background =
                            'rgba(176,144,96,0.07)'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.background =
                            'rgba(255,255,255,0.02)'
                          e.currentTarget.style.transform = 'none'
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.85)',
                            fontWeight: 500,
                            marginBottom: 6,
                            lineHeight: 1.3
                          }}
                        >
                          {brand}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: 'var(--t3)',
                            letterSpacing: '0.08em'
                          }}
                        >
                          {count} {count === 1 ? 'fragrance' : 'fragrances'}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </main>
      )}

      {/* ── PARTIALS PAGE ── */}
      {!searchQ && tab === 'partials' && (
        <main
          style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 4vw 6rem' }}
        >
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem',
                color: 'var(--t3)'
              }}
            >
              Loading...
            </div>
          ) : visiblePartials.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '6rem',
                border: '0.5px solid var(--border)',
                borderRadius: 12
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 16 }}>🧴</div>
              <p
                style={{
                  fontFamily: 'var(--ff-serif)',
                  fontSize: '1.2rem',
                  color: 'var(--t2)',
                  marginBottom: 8
                }}
              >
                No partials available right now
              </p>
              <p style={{ fontSize: 13, color: 'var(--t3)' }}>
                Follow{' '}
                <a
                  href='https://www.instagram.com/the_scent_snob_/'
                  target='_blank'
                  rel='noopener noreferrer'
                  style={{ color: 'var(--gold)' }}
                >
                  @the_scent_snob_
                </a>{' '}
                for drop announcements
              </p>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 24
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 6
                    }}
                  >
                    <div
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: 'var(--gold)'
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        color: 'var(--gold)'
                      }}
                    >
                      Authenticated Partials
                    </span>
                  </div>
                  <p
                    style={{ fontSize: 13, color: 'var(--t3)', maxWidth: 480 }}
                  >
                    Authentic bottles from my personal collection. ₹160 flat
                    shipping on all partials.
                  </p>
                </div>
                <span
                  style={{ fontSize: 12, color: 'var(--t3)', flexShrink: 0 }}
                >
                  {visiblePartials.length} available
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))',
                  gap: 14
                }}
              >
                {visiblePartials.map((p) => (
                  <PartialCard key={p.id} partial={p} onAdd={addToCart} />
                ))}
              </div>
            </>
          )}
        </main>
      )}

      {/* ── ABOUT TAB ── */}
      {!searchQ && tab === 'about' && (
        <main
          style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 4vw 6rem' }}
        >
          <div style={{ marginBottom: '3rem' }}>
            <p
              style={{
                fontSize: 11,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#b09060',
                marginBottom: 12
              }}
            >
              About Us
            </p>
            <h1
              style={{
                fontFamily: 'var(--ff-serif)',
                fontSize: 'clamp(2rem,4vw,2.8rem)',
                fontWeight: 400,
                color: 'rgba(255,255,255,0.92)',
                marginBottom: 16,
                lineHeight: 1.2
              }}
            >
              We believe everyone deserves to smell incredible.
            </h1>
            <p
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.8
              }}
            >
              Scent Snob Decants started as a personal obsession. Niche perfumes
              cost ₹15,000–₹50,000 a bottle — and most people never get to try
              them before committing. We fix that. We source authentic bottles,
              decant them ourselves, and ship them across India so you can
              explore the world of niche fragrance without the financial risk.
            </p>
          </div>
          <div
            style={{
              borderTop: '0.5px solid rgba(255,255,255,0.06)',
              paddingTop: '2.5rem'
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--ff-serif)',
                fontSize: '1.4rem',
                fontWeight: 400,
                color: 'rgba(255,255,255,0.85)',
                marginBottom: '1.5rem'
              }}
            >
              Frequently Asked Questions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                [
                  'How does decanting work?',
                  'We source full bottles of authentic fragrances and decant them into clean glass atomisers. Every decant is from the same bottle — no mixing, no dilution.'
                ],
                [
                  'Are the fragrances authentic?',
                  'Yes. We only source authentic bottles — never counterfeits. Most come from authorised retailers or trusted grey market sources with verified authenticity.'
                ],
                [
                  'What sizes do you offer?',
                  'Standard decants come in 5ml, 10ml, and 20ml glass atomisers. Partials are sold as the remaining volume of the original bottle.'
                ],
                [
                  'How do I order?',
                  'Add items to cart, complete checkout with Razorpay — we accept UPI, cards and netbanking. Order is confirmed automatically after payment.'
                ],
                [
                  'Do you ship PAN India?',
                  'Yes! Free shipping on orders above ₹3,000. Delivery takes 3–7 business days depending on your location.'
                ],
                [
                  'What is your return policy?',
                  'Due to the nature of fragrance products, we do not accept returns. If your order arrives damaged, WhatsApp us with a photo and we will make it right.'
                ],
                [
                  'Do you do custom decants?',
                  "If you want a fragrance we don't currently carry, WhatsApp us. If we can source it, we will."
                ]
              ].map(([q, a]) => (
                <div
                  key={q}
                  style={{
                    borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                    paddingBottom: 16
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.85)',
                      fontWeight: 500,
                      marginBottom: 6
                    }}
                  >
                    {q}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.4)',
                      lineHeight: 1.7
                    }}
                  >
                    {a}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              marginTop: '3rem',
              padding: '1.5rem',
              background: 'rgba(176,144,96,0.05)',
              border: '0.5px solid rgba(176,144,96,0.15)',
              borderRadius: 8,
              textAlign: 'center'
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.6)',
                marginBottom: 10
              }}
            >
              Questions? Just WhatsApp us.
            </p>
            <a
              href='https://wa.me/918754519509'
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 24px',
                background: 'rgba(37,211,102,0.12)',
                border: '0.5px solid rgba(37,211,102,0.35)',
                borderRadius: 6,
                color: '#25d366',
                fontSize: 13,
                fontWeight: 500
              }}
            >
              +91 87545 19509
            </a>
          </div>
        </main>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(176,144,96,0.95)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 6,
            fontSize: 13,
            zIndex: 999,
            whiteSpace: 'nowrap'
          }}
        >
          {toast}
        </div>
      )}

      <CartDrawer
        cart={cart}
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onChange={changeQty}
        subtotal={subtotal}
        shipping={shipping}
        grandTotal={grandTotal}
        hasOnlyPartials={hasOnlyPartials}
        totalQty={cartCount}
      />

      <footer
        style={{
          borderTop: '0.5px solid var(--border)',
          padding: '3rem 4vw 2.5rem',
          background: '#0a0908'
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
            gap: 32
          }}
        >
          <div>
            <p
              style={{
                fontFamily: 'var(--ff-serif)',
                fontSize: '1.2rem',
                color: 'var(--t1)',
                marginBottom: 8
              }}
            >
              Scent Snob <span style={{ color: 'var(--gold)' }}>Decants</span>
            </p>
            <p style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.8 }}>
              India's niche decant house.
              <br />
              Try before you commit.
            </p>
          </div>
          <div>
            <p
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--t3)',
                marginBottom: 12
              }}
            >
              Connect
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a
                href='https://www.instagram.com/the_scent_snob_/'
                target='_blank'
                rel='noopener noreferrer'
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: 13,
                  textDecoration: 'none'
                }}
              >
                <svg
                  width='15'
                  height='15'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <rect x='2' y='2' width='20' height='20' rx='5' />
                  <path d='M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z' />
                  <line x1='17.5' y1='6.5' x2='17.51' y2='6.5' />
                </svg>
                @the_scent_snob_
              </a>
              <a
                href={`https://wa.me/${WA_NUMBER}`}
                target='_blank'
                rel='noopener noreferrer'
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: 13,
                  textDecoration: 'none'
                }}
              >
                💬 +91 87545 19509
              </a>
            </div>
          </div>
          <div>
            <p
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--t3)',
                marginBottom: 12
              }}
            >
              Info
            </p>
            <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 2 }}>
              <div>Free shipping above ₹3,000</div>
              <div>₹160 flat on partials</div>
              <div>PAN India delivery</div>
              <div>UPI: praveenpugazh14@okicici</div>
            </div>
          </div>
        </div>
        <div
          style={{
            maxWidth: 1400,
            margin: '2rem auto 0',
            paddingTop: '1.5rem',
            borderTop: '0.5px solid rgba(255,255,255,0.05)',
            textAlign: 'center',
            fontSize: 11,
            color: 'rgba(255,255,255,0.2)'
          }}
        >
          © 2026 Scent Snob Decants · All rights reserved
        </div>
      </footer>
    </>
  )
}
