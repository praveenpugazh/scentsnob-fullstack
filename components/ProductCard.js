'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatINR } from '@/lib/pricing'
import { createBrowserSupabase } from '@/lib/supabase'

export default function ProductCard({
  product,
  onAdd,
  wishlisted = false,
  onWishlistChange
}) {
  const [hov, setHov] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSize, setSelectedSize] = useState('5ml')
  const [hearted, setHearted] = useState(wishlisted)
  const [heartLoading, setHeartLoading] = useState(false)
  const router = useRouter()
  const supabase = createBrowserSupabase()

  const {
    id,
    brand,
    name,
    notes,
    p5,
    p10,
    p20,
    image_url,
    sold_out,
    category
  } = product
  const catLabel =
    category === 'niche'
      ? 'Niche'
      : category === 'designer'
        ? 'Designer'
        : 'Dupe'
  const catColor =
    category === 'niche'
      ? 'var(--gold-15)'
      : category === 'designer'
        ? 'rgba(100,130,200,0.15)'
        : 'rgba(100,100,100,0.15)'
  const sizePrice = { '5ml': p5, '10ml': p10, '20ml': p20, '30ml': product.p30 }

  const handleAdd = () => {
    const price = sizePrice[selectedSize]
    if (!price) return
    onAdd(product, selectedSize, price)
    setModalOpen(false)
  }

  const toggleWishlist = async (e) => {
    e.stopPropagation()
    setHeartLoading(true)

    // Check session first
    const {
      data: { session }
    } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      setHeartLoading(false)
      return
    }

    const token = session.access_token
    const method = hearted ? 'DELETE' : 'POST'

    const res = await fetch('/api/wishlist', {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ product_id: id })
    })

    if (res.ok) {
      setHearted((h) => !h)
      onWishlistChange && onWishlistChange(id, !hearted)
    }
    setHeartLoading(false)
  }

  return (
    <>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: hov && !sold_out ? 'var(--gold-06)' : 'var(--w02)',
          border: `0.5px solid ${hov && !sold_out ? 'var(--gold-35)' : 'var(--border)'}`,
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all .18s',
          transform: hov && !sold_out ? 'translateY(-2px)' : 'none',
          opacity: sold_out ? 0.45 : 1,
          position: 'relative',
          cursor: sold_out ? 'default' : 'pointer'
        }}
        onClick={() => !sold_out && setModalOpen(true)}
      >
        {sold_out && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.3)'
            }}
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--w50)',
                border: '0.5px solid var(--w20)',
                padding: '3px 10px',
                borderRadius: 2
              }}
            >
              Sold Out
            </span>
          </div>
        )}

        {/* Heart button */}
        <button
          onClick={toggleWishlist}
          disabled={heartLoading}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 20,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: hearted ? 'rgba(220,60,60,0.2)' : 'rgba(0,0,0,0.4)',
            border: `0.5px solid ${hearted ? 'rgba(220,60,60,0.5)' : 'var(--w15)'}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            transition: 'all .2s',
            backdropFilter: 'blur(4px)'
          }}
        >
          {hearted ? '❤️' : '🤍'}
        </button>

        {/* Image */}
        <div
          style={{
            height: 180,
            overflow: 'hidden',
            flexShrink: 0,
            background: 'var(--w02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {image_url ? (
            <img
              src={image_url}
              alt={name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ fontSize: 48, opacity: 0.15 }}>🧴</div>
          )}
        </div>

        <div
          style={{
            padding: '0.85rem 1rem 1rem',
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 5
          }}
        >
          <span
            style={{
              alignSelf: 'flex-start',
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: 3,
              background: catColor,
              color: 'var(--w50)',
              border: '0.5px solid var(--w08)'
            }}
          >
            {catLabel}
          </span>
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--gold)'
            }}
          >
            {brand}
          </div>
          <div
            style={{
              fontFamily: 'var(--ff-serif)',
              fontSize: '0.9rem',
              color: 'var(--t1)',
              lineHeight: 1.3
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)' }}>{notes}</div>
          <div
            style={{
              marginTop: 'auto',
              paddingTop: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                {p5 > 0 && (
                  <div
                    style={{
                      fontSize: 15,
                      color: 'var(--gold)',
                      fontWeight: 500
                    }}
                  >
                    {formatINR(p5)}{' '}
                    <span style={{ fontSize: 11, color: 'var(--t3)' }}>
                      / 5ml
                    </span>
                  </div>
                )}
              </div>
              {product.mrp > 0 && (
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>
                  Full bottle{' '}
                  <span
                    style={{
                      textDecoration: 'line-through',
                      color: 'var(--w25)'
                    }}
                  >
                    {formatINR(product.mrp)}
                  </span>
                </div>
              )}
              {product.p30 > 0 ? (
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                  30ml {formatINR(product.p30)} · Best value
                </div>
              ) : (
                p10 > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                    20ml {formatINR(p20 || Math.round((p10 * 1.8) / 10) * 10)} ·
                    Best value
                  </div>
                )
              )}
            </div>
            {!sold_out && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setModalOpen(true)
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--gold-15)',
                  border: '0.5px solid var(--gold-40)',
                  color: 'var(--gold)',
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1
                }}
              >
                +
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Size picker modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)'
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg3)',
              border: '0.5px solid var(--gold-30)',
              borderRadius: 10,
              padding: '1.5rem',
              width: 320,
              maxWidth: '90vw'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: 10,
                color: 'var(--gold)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 4
              }}
            >
              {brand}
            </div>
            <div
              style={{
                fontFamily: 'var(--ff-serif)',
                fontSize: '1.1rem',
                color: 'var(--t1)',
                marginBottom: 16
              }}
            >
              {name}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginBottom: 20
              }}
            >
              {[
                ['5ml', p5],
                ['10ml', p10],
                ['20ml', p20 || Math.round((p10 * 1.8) / 10) * 10],
                ['30ml', product.p30]
              ].map(
                ([size, price]) =>
                  price > 0 && (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: 6,
                        background:
                          selectedSize === size
                            ? 'var(--gold-12)'
                            : 'var(--w03)',
                        border: `0.5px solid ${selectedSize === size ? 'var(--gold-50)' : 'var(--border)'}`,
                        color:
                          selectedSize === size ? 'var(--gold)' : 'var(--t2)',
                        cursor: 'pointer',
                        fontSize: 13
                      }}
                    >
                      <span>{size}</span>
                      <span>{formatINR(price)}</span>
                    </button>
                  )
              )}
            </div>
            <button
              onClick={handleAdd}
              style={{
                width: '100%',
                padding: '11px',
                background: 'var(--gold-15)',
                border: '0.5px solid var(--gold-40)',
                borderRadius: 6,
                color: 'var(--gold)',
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer'
              }}
            >
              Add to Cart
            </button>
          </div>
        </div>
      )}
    </>
  )
}
