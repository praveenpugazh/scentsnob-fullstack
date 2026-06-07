'use client'
import { useState } from 'react'
import { formatINR, SHIPPING_CHARGE } from '@/lib/pricing'

export default function PartialCard({ partial, onAdd }) {
  const [hov, setHov] = useState(false)
  const [added, setAdded] = useState(false)
  const {
    brand,
    name,
    notes,
    full_ml,
    ml_left,
    price,
    condition,
    image_url,
    sold_out
  } = partial
  const pct = Math.round((ml_left / full_ml) * 100)
  const barColor =
    pct > 50 ? 'var(--green-txt)' : pct > 25 ? '#b09060' : '#dc5050'

  const handleAdd = () => {
    onAdd({ ...partial, isPartial: true }, `${ml_left}ml partial`, price)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
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
        position: 'relative'
      }}
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
            background: 'rgba(0,0,0,0.35)'
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

      {image_url ? (
        <div style={{ height: 200, flexShrink: 0, overflow: 'hidden' }}>
          <img
            src={image_url}
            alt={name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        </div>
      ) : null}

      <div
        style={{
          padding: '0.9rem 1.1rem 1.1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          flexGrow: 1
        }}
      >
        <span
          style={{
            alignSelf: 'flex-start',
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '2px 7px',
            borderRadius: 3,
            background: 'var(--gold-12)',
            border: '0.5px solid var(--gold-35)',
            color: 'var(--gold)'
          }}
        >
          Partial · {ml_left}ml remaining
        </span>

        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            marginTop: 2
          }}
        >
          {brand}
        </div>
        <div
          style={{
            fontFamily: 'var(--ff-serif)',
            fontSize: '0.95rem',
            color: 'var(--t1)',
            lineHeight: 1.3
          }}
        >
          {name?.replace(' (Partial)', '')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--t3)' }}>{notes}</div>

        {/* Fill bar */}
        <div style={{ marginTop: 6 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 4
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--t3)' }}>
              {ml_left}ml of {full_ml}ml
            </span>
            <span style={{ fontSize: 10, color: barColor, fontWeight: 500 }}>
              {pct}%
            </span>
          </div>
          <div style={{ height: 3, background: 'var(--w08)', borderRadius: 2 }}>
            <div
              style={{
                height: '100%',
                borderRadius: 2,
                width: `${pct}%`,
                background: barColor
              }}
            />
          </div>
        </div>

        {condition && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
            {condition}
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 8
            }}
          >
            <span
              style={{ fontSize: 22, color: 'var(--gold)', fontWeight: 500 }}
            >
              {formatINR(price)}
            </span>
            <span style={{ fontSize: 10, color: 'var(--t3)' }}>
              + ₹{SHIPPING_CHARGE} shipping
            </span>
          </div>
          {!sold_out && price > 0 && (
            <button
              onClick={handleAdd}
              style={{
                width: '100%',
                padding: '10px',
                background: added ? 'rgba(76,175,125,0.2)' : 'var(--gold-12)',
                border: `0.5px solid ${added ? 'rgba(76,175,125,0.5)' : 'var(--gold-35)'}`,
                borderRadius: 6,
                color: added ? 'var(--green-txt)' : 'var(--gold)',
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all .2s'
              }}
            >
              {added ? '✓ Added to Cart' : 'Add to Cart'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
