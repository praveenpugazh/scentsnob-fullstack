'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  formatINR,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_CHARGE
} from '@/lib/pricing'

export default function CartDrawer({
  cart,
  isOpen,
  onClose,
  onChange,
  subtotal,
  shipping,
  grandTotal,
  hasOnlyPartials,
  totalQty
}) {
  const router = useRouter()
  const items = Object.entries(cart)

  const handleCheckout = () => {
    // Cart is already in localStorage via page.js useEffect
    onClose()
    router.push('/checkout')
  }

  const overlay = {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    background: isOpen ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
    backdropFilter: isOpen ? 'blur(4px)' : 'none',
    transition: 'all .3s',
    pointerEvents: isOpen ? 'all' : 'none'
  }

  const drawer = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    maxWidth: 420,
    background: '#0e0c0a',
    borderLeft: '0.5px solid rgba(255,255,255,0.08)',
    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
    zIndex: 201,
    display: 'flex',
    flexDirection: 'column'
  }

  return (
    <>
      <div style={overlay} onClick={onClose} />
      <div style={drawer}>
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '0.5px solid rgba(255,255,255,0.07)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <div
            style={{
              fontFamily: 'var(--ff-serif)',
              fontSize: '1.1rem',
              color: 'var(--t1)'
            }}
          >
            Your Cart{totalQty > 0 ? ` (${totalQty})` : ''}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--t3)',
              cursor: 'pointer',
              fontSize: 22
            }}
          >
            ×
          </button>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--t3)',
              gap: 12
            }}
          >
            <div style={{ fontSize: 36 }}>🧴</div>
            <p
              style={{
                fontFamily: 'var(--ff-serif)',
                fontSize: '1.1rem',
                color: 'var(--t2)'
              }}
            >
              Your cart is empty
            </p>
            <button
              onClick={onClose}
              style={{
                fontSize: 12,
                color: 'var(--gold)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                letterSpacing: '0.08em'
              }}
            >
              Browse fragrances →
            </button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
              {items.map(([key, item]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '0.5px solid rgba(255,255,255,0.05)'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--gold)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        marginBottom: 2
                      }}
                    >
                      {item.brand}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--t1)',
                        fontFamily: 'var(--ff-serif)',
                        marginBottom: 2
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                      {item.size} · {formatINR(item.price)} each
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginLeft: 12,
                      flexShrink: 0
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <button
                        onClick={() => onChange(key, -1)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.06)',
                          border: '0.5px solid rgba(255,255,255,0.1)',
                          color: 'var(--t2)',
                          cursor: 'pointer',
                          fontSize: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        −
                      </button>
                      <span
                        style={{
                          fontSize: 13,
                          color: 'var(--t1)',
                          minWidth: 16,
                          textAlign: 'center'
                        }}
                      >
                        {item.qty}
                      </span>
                      <button
                        onClick={() => onChange(key, 1)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.06)',
                          border: '0.5px solid rgba(255,255,255,0.1)',
                          color: 'var(--t2)',
                          cursor: 'pointer',
                          fontSize: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        +
                      </button>
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        color: 'var(--t1)',
                        fontWeight: 500,
                        minWidth: 54,
                        textAlign: 'right'
                      }}
                    >
                      {formatINR(item.price * item.qty)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '0.5px solid rgba(255,255,255,0.07)',
                flexShrink: 0
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'var(--t3)',
                  marginBottom: 6
                }}
              >
                <span>Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'var(--t3)',
                  marginBottom: 4
                }}
              >
                <span>Shipping</span>
                <span
                  style={{ color: shipping === 0 ? '#4caf7d' : 'var(--t3)' }}
                >
                  {shipping === 0 ? 'Free' : formatINR(shipping)}
                </span>
              </div>
              {shipping > 0 && !hasOnlyPartials && (
                <p
                  style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}
                >
                  Add {formatINR(FREE_SHIPPING_THRESHOLD - subtotal)} more for
                  free shipping
                </p>
              )}
              {hasOnlyPartials && (
                <p
                  style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}
                >
                  ₹160 flat shipping on partial bottle orders
                </p>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--ff-serif)',
                  fontSize: '1.1rem',
                  color: 'var(--t1)',
                  marginBottom: 16,
                  paddingTop: 10,
                  borderTop: '0.5px solid rgba(255,255,255,0.07)'
                }}
              >
                <span>Total</span>
                <span style={{ color: 'var(--gold)' }}>
                  {formatINR(grandTotal)}
                </span>
              </div>
              <button
                onClick={handleCheckout}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 6,
                  background: '#b09060',
                  border: 'none',
                  color: '#fff',
                  fontFamily: 'var(--ff-sans)',
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                Checkout · {formatINR(grandTotal)} →
              </button>
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--t3)',
                  textAlign: 'center',
                  marginTop: 8
                }}
              >
                🔒 Secured by Razorpay
              </p>
            </div>
          </>
        )}
      </div>
    </>
  )
}
