'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase'
import { formatINR } from '@/lib/pricing'
import ProductCard from '@/components/ProductCard'

const STATUS_COLORS = {
  Pending: {
    bg: 'var(--gold-12)',
    color: '#b09060',
    border: 'var(--gold-30)'
  },
  Paid: {
    bg: 'rgba(100,160,255,0.1)',
    color: '#6aa0ff',
    border: 'rgba(100,160,255,0.3)'
  },
  Shipped: {
    bg: 'rgba(120,200,120,0.1)',
    color: '#78c878',
    border: 'rgba(120,200,120,0.3)'
  },
  Delivered: {
    bg: 'rgba(37,211,102,0.1)',
    color: '#25d366',
    border: 'rgba(37,211,102,0.3)'
  },
  Cancelled: {
    bg: 'rgba(220,80,80,0.1)',
    color: 'var(--red)',
    border: 'rgba(220,80,80,0.3)'
  }
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS['Pending']
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '3px 9px',
        borderRadius: 20,
        background: s.bg,
        color: s.color,
        border: `0.5px solid ${s.border}`
      }}
    >
      {status}
    </span>
  )
}

export default function AccountPage() {
  const router = useRouter()
  const supabase = createBrowserSupabase()

  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [wishlist, setWishlist] = useState([]) // full product objects
  const [wishlistIds, setWishlistIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('orders')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace('/login')
        return
      }
      const user = data.session.user
      const token = data.session.access_token
      setUser(user)

      // Fetch orders + wishlist in parallel
      const [ordRes, wishRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        fetch('/api/wishlist', {
          headers: { Authorization: `Bearer ${token}` }
        }).then((r) => r.json())
      ])

      setOrders(ordRes.data || [])

      // Get wishlist product IDs then fetch full product data
      const ids = Array.isArray(wishRes) ? wishRes.map((w) => w.product_id) : []
      setWishlistIds(new Set(ids))

      if (ids.length > 0) {
        const { data: prods } = await supabase
          .from('products')
          .select('*')
          .in('id', ids)
        setWishlist(prods || [])
      }

      setLoading(false)
    })
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  const handleWishlistChange = (productId, isWishlisted) => {
    if (!isWishlisted) {
      setWishlist((w) => w.filter((p) => p.id !== productId))
      setWishlistIds((s) => {
        const n = new Set(s)
        n.delete(productId)
        return n
      })
    }
  }

  if (loading)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          color: 'var(--t3)',
          fontSize: 13
        }}
      >
        Loading...
      </div>
    )

  const displayEmail = user?.email || ''
  const initials = displayEmail.slice(0, 2).toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav
        style={{
          borderBottom: '0.5px solid var(--border)',
          padding: '0 4vw',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: 'rgba(10,9,8,0.97)',
          backdropFilter: 'blur(12px)',
          zIndex: 100
        }}
      >
        <Link
          href='/'
          style={{
            fontFamily: 'var(--ff-sans)',
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--w90)'
          }}
        >
          Scent Snob <span style={{ color: '#b09060' }}>Decants</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href='/'
            style={{
              fontSize: 11,
              color: 'var(--t3)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}
          >
            ← Shop
          </Link>
          <button
            onClick={signOut}
            style={{
              fontSize: 11,
              color: 'var(--t3)',
              background: 'none',
              border: '0.5px solid var(--border)',
              borderRadius: 4,
              padding: '5px 12px',
              cursor: 'pointer',
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}
          >
            Sign out
          </button>
        </div>
      </nav>

      <main
        style={{ maxWidth: 860, margin: '0 auto', padding: '3rem 4vw 6rem' }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 32
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--gold-15)',
              border: '0.5px solid var(--gold-30)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--ff-serif)',
              fontSize: '1.1rem',
              color: 'var(--gold)',
              fontWeight: 500
            }}
          >
            {initials}
          </div>
          <div>
            <h1
              style={{
                fontFamily: 'var(--ff-serif)',
                fontSize: '1.6rem',
                fontWeight: 400,
                color: 'var(--t1)',
                marginBottom: 4
              }}
            >
              My Account
            </h1>
            <p style={{ fontSize: 13, color: 'var(--t3)' }}>{displayEmail}</p>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: '0.5px solid var(--border)',
            marginBottom: 28
          }}
        >
          {[
            ['orders', 'Orders', orders.length],
            ['wishlist', 'Wishlist', wishlist.length]
          ].map(([id, label, count]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderBottom:
                  tab === id
                    ? '2px solid var(--gold)'
                    : '2px solid transparent',
                color: tab === id ? 'var(--gold)' : 'var(--t3)',
                padding: '10px 20px',
                fontSize: 12,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: 'var(--ff-sans)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {label}
              {count > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    background: 'var(--gold-20)',
                    color: 'var(--gold)',
                    padding: '1px 7px',
                    borderRadius: 10
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          <div>
            {orders.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '5rem 0',
                  border: '0.5px solid var(--border)',
                  borderRadius: 10
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 16 }}>🧴</div>
                <p
                  style={{
                    fontFamily: 'var(--ff-serif)',
                    fontSize: '1.1rem',
                    color: 'var(--t2)',
                    marginBottom: 8
                  }}
                >
                  No orders yet
                </p>
                <p
                  style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 24 }}
                >
                  Your orders will appear here after you place them
                </p>
                <Link
                  href='/'
                  style={{
                    display: 'inline-block',
                    padding: '10px 24px',
                    background: '#b09060',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 12,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontWeight: 500
                  }}
                >
                  Explore Fragrances
                </Link>
              </div>
            ) : (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                {orders.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      border: '0.5px solid var(--border)',
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.015)'
                    }}
                  >
                    <button
                      onClick={() =>
                        setExpanded(expanded === order.id ? null : order.id)
                      }
                      style={{
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '16px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          flex: 1,
                          minWidth: 0
                        }}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--gold)',
                              letterSpacing: '0.05em',
                              fontFamily: 'var(--ff-serif)'
                            }}
                          >
                            {order.order_ref}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--t3)',
                              marginTop: 2
                            }}
                          >
                            {new Date(order.created_at).toLocaleDateString(
                              'en-IN',
                              {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              }
                            )}
                          </div>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          flexShrink: 0
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--ff-serif)',
                            fontSize: '1.1rem',
                            color: 'var(--t1)'
                          }}
                        >
                          {formatINR(order.total)}
                        </span>
                        <span style={{ color: 'var(--t3)', fontSize: 14 }}>
                          {expanded === order.id ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>
                    {expanded === order.id && (
                      <div
                        style={{
                          borderTop: '0.5px solid var(--border)',
                          padding: '14px 18px 18px',
                          background: 'rgba(0,0,0,0.2)'
                        }}
                      >
                        <div style={{ marginBottom: 14 }}>
                          {(order.items || []).map((item, i) => (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 0',
                                borderBottom:
                                  i < order.items.length - 1
                                    ? '0.5px solid var(--w04)'
                                    : 'none'
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    color: 'var(--gold)',
                                    marginBottom: 2
                                  }}
                                >
                                  {item.brand}
                                </div>
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: 'var(--t1)',
                                    fontFamily: 'var(--ff-serif)'
                                  }}
                                >
                                  {item.name}
                                </div>
                                <div
                                  style={{ fontSize: 11, color: 'var(--t3)' }}
                                >
                                  {item.size} × {item.qty}
                                </div>
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  color: 'var(--t1)',
                                  fontWeight: 500
                                }}
                              >
                                {formatINR(item.price * item.qty)}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div
                          style={{
                            background: 'var(--w02)',
                            borderRadius: 6,
                            padding: '10px 12px',
                            fontSize: 12,
                            color: 'var(--t3)'
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: 4
                            }}
                          >
                            <span>Subtotal</span>
                            <span style={{ color: 'var(--t2)' }}>
                              {formatINR(order.subtotal)}
                            </span>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: 8
                            }}
                          >
                            <span>Shipping</span>
                            <span
                              style={{
                                color:
                                  order.shipping === 0
                                    ? 'var(--gold)'
                                    : 'var(--t2)'
                              }}
                            >
                              {order.shipping === 0
                                ? 'Free'
                                : formatINR(order.shipping)}
                            </span>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              paddingTop: 8,
                              borderTop: '0.5px solid var(--border)',
                              fontWeight: 600
                            }}
                          >
                            <span style={{ color: 'var(--t1)' }}>Total</span>
                            <span
                              style={{
                                fontFamily: 'var(--ff-serif)',
                                fontSize: 15,
                                color: 'var(--t1)'
                              }}
                            >
                              {formatINR(order.total)}
                            </span>
                          </div>
                        </div>
                        {order.address && (
                          <div
                            style={{
                              marginTop: 12,
                              fontSize: 12,
                              color: 'var(--t3)',
                              lineHeight: 1.7
                            }}
                          >
                            <span
                              style={{
                                color: 'var(--t3)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                fontSize: 10
                              }}
                            >
                              Deliver to ·{' '}
                            </span>
                            {order.customer} · {order.phone}
                            <br />
                            {order.address}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── WISHLIST TAB ── */}
        {tab === 'wishlist' && (
          <div>
            {wishlist.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '5rem 0',
                  border: '0.5px solid var(--border)',
                  borderRadius: 10
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 16 }}>🤍</div>
                <p
                  style={{
                    fontFamily: 'var(--ff-serif)',
                    fontSize: '1.1rem',
                    color: 'var(--t2)',
                    marginBottom: 8
                  }}
                >
                  Your wishlist is empty
                </p>
                <p
                  style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 24 }}
                >
                  Tap the heart on any fragrance to save it here
                </p>
                <Link
                  href='/'
                  style={{
                    display: 'inline-block',
                    padding: '10px 24px',
                    background: '#b09060',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 12,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontWeight: 500
                  }}
                >
                  Browse Fragrances
                </Link>
              </div>
            ) : (
              <div>
                <p
                  style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 20 }}
                >
                  {wishlist.length} saved fragrance
                  {wishlist.length !== 1 ? 's' : ''}
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
                    gap: 12
                  }}
                >
                  {wishlist.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onAdd={() => {}} // handled by cart in main page
                      wishlisted={true}
                      onWishlistChange={handleWishlistChange}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
