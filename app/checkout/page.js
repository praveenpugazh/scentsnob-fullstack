'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import LuckyWheel from '@/components/LuckyWheel'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase'
import {
  formatINR,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_CHARGE
} from '@/lib/pricing'

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID

function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

function FieldError({ msg }) {
  if (!msg) return null
  return <p style={{ fontSize: 11, color: '#e05a5a', marginTop: 4 }}>{msg}</p>
}

export default function CheckoutPage() {
  const router = useRouter()
  const supabase = createBrowserSupabase()

  // Cart from sessionStorage (set by CartDrawer)
  const [cart, setCart] = useState({})
  const [userId, setUserId] = useState(null)
  const [paying, setPaying] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [couponApplied, setCouponApplied] = useState(null) // { code, discount_amount, message }
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [done, setDone] = useState(null) // confirmed order
  const [wheelPrize, setWheelPrize] = useState(null)
  const [showWheel, setShowWheel] = useState(true) // TEMP for testing — change back to false
  const [products, setProducts] = useState([])

  // Address fields — 4 lines
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [line1, setLine1] = useState('') // Flat/House No, Street
  const [line2, setLine2] = useState('') // Area / Locality
  const [line3, setLine3] = useState('') // City, State
  const [pincode, setPincode] = useState('') // PIN code

  // Validation errors
  const [errors, setErrors] = useState({})
  const [submitErr, setSubmitErr] = useState('')

  // Load products for wheel
  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d : []))
  }, [])

  // Load cart + user on mount — redirect to login if not authenticated
  useEffect(() => {
    // Load cart from localStorage
    try {
      const stored = localStorage.getItem('ssd_cart')
      if (stored) setCart(JSON.parse(stored))
    } catch {}

    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id

      // Not logged in — save intended destination and redirect to login
      if (!uid) {
        sessionStorage.setItem('ssd_checkout_redirect', '1')
        router.replace('/login?next=/checkout')
        return
      }

      setUserId(uid)

      // Pre-fill address from last order
      const { data: last } = await supabase
        .from('orders')
        .select('customer, phone, address')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (last) {
        setName(last.customer || '')
        setPhone(last.phone || '')
        const parts = (last.address || '').split('\n')
        setLine1(parts[0] || '')
        setLine2(parts[1] || '')
        setLine3(parts[2] || '')
        setPincode(parts[3] || '')
      }
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
  const totalQty = items.reduce((a, [, b]) => a + b.qty, 0)

  // Validation
  const validate = () => {
    const e = {}
    if (!name.trim()) e.name = 'Name is required'
    if (!phone.trim()) e.phone = 'Phone number is required'
    else if (phone.replace(/\D/g, '').length !== 10)
      e.phone = 'Must be exactly 10 digits'
    if (!line1.trim()) e.line1 = 'House / flat number and street required'
    if (!line2.trim()) e.line2 = 'Area / locality required'
    if (!line3.trim()) e.line3 = 'City and state required'
    if (!pincode.trim()) e.pincode = 'PIN code required'
    else if (!/^\d{6}$/.test(pincode.trim()))
      e.pincode = 'Must be a 6-digit PIN code'
    return e
  }

  const applyCoupon = async () => {
    if (!coupon.trim()) return
    setCouponLoading(true)
    setCouponError('')
    setCouponApplied(null)
    const res = await fetch(
      `/api/discount?code=${encodeURIComponent(coupon.trim())}&order_value=${grandTotal}${userId ? `&user_id=${userId}` : ''}`
    )
    const data = await res.json()
    setCouponLoading(false)
    if (!res.ok) {
      setCouponError(data.error || 'Invalid code')
      return
    }
    setCouponApplied(data)
  }

  const removeCoupon = () => {
    setCouponApplied(null)
    setCoupon('')
    setCouponError('')
  }

  const discountAmount = couponApplied?.discount_amount || 0
  const finalTotal = Math.max(0, grandTotal - discountAmount)

  const handlePay = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }
    setErrors({})
    setSubmitErr('')
    setPaying(true)

    const loaded = await loadRazorpay()
    if (!loaded) {
      setSubmitErr(
        'Failed to load payment gateway. Check your connection and try again.'
      )
      setPaying(false)
      return
    }

    const orderRes = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: grandTotal,
        receipt: `rcpt_${Date.now()}`
      })
    })
    const orderData = await orderRes.json()
    if (!orderRes.ok || !orderData.order_id) {
      setSubmitErr(
        orderData.error || 'Could not initiate payment. Please try again.'
      )
      setPaying(false)
      return
    }

    const fullAddress = [line1, line2, line3, pincode]
      .map((s) => s.trim())
      .filter(Boolean)
      .join('\n')

    const options = {
      key: RAZORPAY_KEY,
      amount: orderData.amount,
      currency: 'INR',
      name: 'Scent Snob Decants',
      description: `${totalQty} item${totalQty !== 1 ? 's' : ''}`,
      order_id: orderData.order_id,
      prefill: { name: name.trim(), contact: phone.replace(/\D/g, '') },
      theme: { color: '#b09060' },
      modal: {
        ondismiss: () => {
          setPaying(false)
          setSubmitErr('Payment cancelled. Your cart is still saved.')
        }
      },
      handler: async (response) => {
        const verifyRes = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            customer: name.trim(),
            phone: phone.trim(),
            address: fullAddress,
            items: items.map(([, v]) => v),
            subtotal,
            shipping,
            total: finalTotal,
            discount_code: couponApplied?.code || null,
            discount_amount: discountAmount,
            user_id: userId || undefined
          })
        })
        const verifyData = await verifyRes.json()
        setPaying(false)
        if (!verifyRes.ok || !verifyData.success) {
          setSubmitErr(
            'Payment received but order save failed. Screenshot this page and WhatsApp us immediately.'
          )
          return
        }
        // Clear cart
        sessionStorage.removeItem('ssd_cart')
        setDone(verifyData.order)
      }
    }

    new window.Razorpay(options).open()
  }

  const inp = (hasErr) => ({
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    border: `0.5px solid ${hasErr ? '#e05a5a' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: 6,
    padding: '11px 14px',
    fontFamily: 'var(--ff-sans)',
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    outline: 'none',
    transition: 'border-color .2s'
  })

  const lbl = {
    fontSize: 11,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    display: 'block',
    marginBottom: 6
  }

  const handleWheelWin = async (prize) => {
    setWheelPrize(prize)
    // Save prize to order notes
    if (done?.id) {
      await fetch(`/api/orders/${done.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: `Free sample: ${prize.brand} ${prize.name} 2ml`
        })
      })
    }
  }

  // ── ORDER CONFIRMED ──────────────────────────────────────────────────
  if (done) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}
      >
        <div style={{ maxWidth: 480, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'rgba(76,175,125,0.12)',
                border: '0.5px solid rgba(76,175,125,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                margin: '0 auto 20px'
              }}
            >
              ✓
            </div>
            <h1
              style={{
                fontFamily: 'var(--ff-serif)',
                fontSize: '2rem',
                color: 'var(--t1)',
                marginBottom: 8
              }}
            >
              Order Confirmed
            </h1>
            <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.7 }}>
              Payment successful. We'll pack and ship your order within 24
              hours.
            </p>
          </div>

          {/* Order card */}
          <div
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '1.5rem',
              marginBottom: 20
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--t3)',
                    marginBottom: 4
                  }}
                >
                  Order ID
                </div>
                <div
                  style={{
                    fontFamily: 'var(--ff-serif)',
                    fontSize: '1.3rem',
                    color: 'var(--gold)'
                  }}
                >
                  {done.order_ref}
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: 'rgba(76,175,125,0.12)',
                  color: '#4caf7d',
                  border: '0.5px solid rgba(76,175,125,0.3)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}
              >
                Paid ✓
              </div>
            </div>

            {/* Items */}
            <div
              style={{
                borderTop: '0.5px solid rgba(255,255,255,0.06)',
                paddingTop: 14,
                marginBottom: 14
              }}
            >
              {(done.items || []).map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--gold)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase'
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
                      {item.name}{' '}
                      <span style={{ color: 'var(--t3)', fontSize: 11 }}>
                        ({item.size}) ×{item.qty}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--t2)' }}>
                    {formatINR(item.price * item.qty)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div
              style={{
                borderTop: '0.5px solid rgba(255,255,255,0.06)',
                paddingTop: 12
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'var(--t3)',
                  marginBottom: 4
                }}
              >
                <span>Subtotal</span>
                <span>{formatINR(done.subtotal)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'var(--t3)',
                  marginBottom: 10
                }}
              >
                <span>Shipping</span>
                <span
                  style={{
                    color: done.shipping === 0 ? '#4caf7d' : 'var(--t3)'
                  }}
                >
                  {done.shipping === 0 ? 'Free' : formatINR(done.shipping)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--ff-serif)',
                  fontSize: '1.2rem',
                  color: 'var(--t1)'
                }}
              >
                <span>Total Paid</span>
                <span style={{ color: 'var(--gold)' }}>
                  {formatINR(done.total)}
                </span>
              </div>
            </div>

            {/* Delivery address */}
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: '0.5px solid rgba(255,255,255,0.06)',
                fontSize: 12,
                color: 'var(--t3)',
                lineHeight: 1.8
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.25)',
                  marginBottom: 6
                }}
              >
                Delivering to
              </div>
              <div style={{ color: 'var(--t2)' }}>
                {done.customer} · {done.phone}
              </div>
              {(done.address || '').split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 10,
                color: 'rgba(255,255,255,0.18)'
              }}
            >
              Payment ID: {done.payment_id}
            </div>
          </div>

          {showWheel && (
            <LuckyWheel
              products={products}
              onWin={handleWheelWin}
              onClose={() => setShowWheel(false)}
            />
          )}

          {wheelPrize && !showWheel && (
            <div
              style={{
                background: 'rgba(176,144,96,0.08)',
                border: '0.5px solid rgba(176,144,96,0.25)',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--gold)',
                  marginBottom: 4
                }}
              >
                🎁 Your free sample
              </div>
              <div style={{ fontSize: 14, color: 'var(--t1)' }}>
                {wheelPrize.brand} {wheelPrize.name} — 2ml
              </div>
            </div>
          )}

          <Link
            href='/'
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '13px',
              borderRadius: 6,
              background: '#b09060',
              color: '#fff',
              textDecoration: 'none',
              fontFamily: 'var(--ff-sans)',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase'
            }}
          >
            Continue Shopping
          </Link>

          {userId && (
            <p style={{ textAlign: 'center', marginTop: 12 }}>
              <Link
                href='/account'
                style={{
                  fontSize: 12,
                  color: 'var(--t3)',
                  textDecoration: 'underline'
                }}
              >
                View all orders →
              </Link>
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── CHECKOUT FORM ───────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
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
            color: 'rgba(255,255,255,0.9)'
          }}
        >
          Scent Snob <span style={{ color: '#b09060' }}>Decants</span>
        </Link>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--t3)'
          }}
        >
          <span style={{ color: 'var(--gold)' }}>●</span> Secure Checkout
        </div>
      </nav>

      {items.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '6rem 2rem',
            color: 'var(--t3)'
          }}
        >
          <p
            style={{
              fontFamily: 'var(--ff-serif)',
              fontSize: '1.2rem',
              color: 'var(--t2)',
              marginBottom: 16
            }}
          >
            Your cart is empty
          </p>
          <Link
            href='/'
            style={{
              color: 'var(--gold)',
              fontSize: 13,
              textDecoration: 'underline'
            }}
          >
            ← Back to shop
          </Link>
        </div>
      ) : (
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '2rem 4vw 6rem',
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,0.9fr)',
            gap: 40,
            alignItems: 'start'
          }}
          className='checkout-grid'
        >
          {/* ── LEFT: DELIVERY FORM ── */}
          <div>
            <h1
              style={{
                fontFamily: 'var(--ff-serif)',
                fontSize: '1.8rem',
                fontWeight: 400,
                color: 'var(--t1)',
                marginBottom: 8
              }}
            >
              Delivery Details
            </h1>
            <p
              style={{
                fontSize: 13,
                color: 'var(--t3)',
                marginBottom: 32,
                lineHeight: 1.6
              }}
            >
              {userId ? (
                '💾 Your address will be saved for next time.'
              ) : (
                <>
                  <Link href='/login' style={{ color: 'var(--gold)' }}>
                    Sign in
                  </Link>{' '}
                  to save your address for future orders.
                </>
              )}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Name + Phone row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14
                }}
              >
                <div>
                  <label style={lbl}>Full Name</label>
                  <input
                    style={inp(errors.name)}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      setErrors((v) => ({ ...v, name: '' }))
                    }}
                    placeholder='Priya Sharma'
                  />
                  <FieldError msg={errors.name} />
                </div>
                <div>
                  <label style={lbl}>Phone Number</label>
                  <input
                    style={inp(errors.phone)}
                    type='tel'
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setPhone(val)
                      setErrors((v) => ({ ...v, phone: '' }))
                    }}
                    placeholder='9876543210'
                    maxLength={10}
                  />
                  <FieldError msg={errors.phone} />
                </div>
              </div>

              {/* Address line 1 */}
              <div>
                <label style={lbl}>Flat / House No. & Street</label>
                <input
                  style={inp(errors.line1)}
                  value={line1}
                  onChange={(e) => {
                    setLine1(e.target.value)
                    setErrors((v) => ({ ...v, line1: '' }))
                  }}
                  placeholder='12A, MG Road'
                />
                <FieldError msg={errors.line1} />
              </div>

              {/* Address line 2 */}
              <div>
                <label style={lbl}>Area / Locality</label>
                <input
                  style={inp(errors.line2)}
                  value={line2}
                  onChange={(e) => {
                    setLine2(e.target.value)
                    setErrors((v) => ({ ...v, line2: '' }))
                  }}
                  placeholder='Koramangala'
                />
                <FieldError msg={errors.line2} />
              </div>

              {/* City + State + PIN row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14
                }}
              >
                <div>
                  <label style={lbl}>City & State</label>
                  <input
                    style={inp(errors.line3)}
                    value={line3}
                    onChange={(e) => {
                      setLine3(e.target.value)
                      setErrors((v) => ({ ...v, line3: '' }))
                    }}
                    placeholder='Bengaluru, Karnataka'
                  />
                  <FieldError msg={errors.line3} />
                </div>
                <div>
                  <label style={lbl}>PIN Code</label>
                  <input
                    style={inp(errors.pincode)}
                    type='text'
                    inputMode='numeric'
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setPincode(val)
                      setErrors((v) => ({ ...v, pincode: '' }))
                    }}
                    placeholder='560034'
                  />
                  <FieldError msg={errors.pincode} />
                </div>
              </div>
            </div>

            {/* Coupon code */}
            <div style={{ marginTop: 24 }}>
              <label style={lbl}>
                Discount Code{' '}
                <span
                  style={{
                    color: 'rgba(255,255,255,0.25)',
                    fontWeight: 400,
                    textTransform: 'none',
                    letterSpacing: 0
                  }}
                >
                  optional
                </span>
              </label>
              {couponApplied ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    background: 'rgba(76,175,125,0.08)',
                    border: '0.5px solid rgba(76,175,125,0.3)',
                    borderRadius: 6
                  }}
                >
                  <span style={{ fontSize: 12, color: '#4caf7d', flex: 1 }}>
                    ✓ {couponApplied.message} — saving{' '}
                    {formatINR(discountAmount)}
                  </span>
                  <button
                    onClick={removeCoupon}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                      fontSize: 16
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{
                      ...inp(false),
                      flex: 1,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em'
                    }}
                    value={coupon}
                    onChange={(e) => {
                      setCoupon(e.target.value.toUpperCase())
                      setCouponError('')
                    }}
                    placeholder='ENTER CODE'
                    onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                  />
                  <button
                    onClick={applyCoupon}
                    disabled={couponLoading || !coupon.trim()}
                    style={{
                      padding: '11px 16px',
                      borderRadius: 6,
                      background: 'rgba(176,144,96,0.15)',
                      border: '0.5px solid rgba(176,144,96,0.3)',
                      color: 'var(--gold)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 500,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      fontFamily: 'var(--ff-sans)'
                    }}
                  >
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </div>
              )}
              {couponError && (
                <p style={{ fontSize: 12, color: '#e05a5a', marginTop: 6 }}>
                  {couponError}
                </p>
              )}
            </div>

            {/* Pay button */}
            <div style={{ marginTop: 32 }}>
              {submitErr && (
                <div
                  style={{
                    background: 'rgba(220,80,80,0.08)',
                    border: '0.5px solid rgba(220,80,80,0.2)',
                    borderRadius: 6,
                    padding: '10px 14px',
                    marginBottom: 14,
                    fontSize: 13,
                    color: '#e05a5a'
                  }}
                >
                  {submitErr}
                </div>
              )}
              <button
                onClick={handlePay}
                disabled={paying}
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: 6,
                  background: paying ? 'rgba(176,144,96,0.5)' : '#b09060',
                  border: 'none',
                  color: '#fff',
                  fontFamily: 'var(--ff-sans)',
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: paying ? 'not-allowed' : 'pointer',
                  transition: 'all .2s'
                }}
              >
                {paying
                  ? 'Opening Payment Gateway...'
                  : `Pay Securely · ${formatINR(finalTotal)}`}
              </button>
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--t3)',
                  textAlign: 'center',
                  marginTop: 10,
                  lineHeight: 1.6
                }}
              >
                🔒 Secured by Razorpay · UPI · Cards · Netbanking
              </p>
            </div>
          </div>

          {/* ── RIGHT: ORDER SUMMARY ── */}
          <div style={{ position: 'sticky', top: 72 }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '1.5rem'
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--ff-serif)',
                  fontSize: '1.1rem',
                  fontWeight: 400,
                  color: 'var(--t1)',
                  marginBottom: 16
                }}
              >
                Order Summary{' '}
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--t3)',
                    fontFamily: 'var(--ff-sans)'
                  }}
                >
                  ({totalQty} item{totalQty !== 1 ? 's' : ''})
                </span>
              </h2>

              {/* Items */}
              <div style={{ marginBottom: 16 }}>
                {items.map(([key, item]) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      marginBottom: 14,
                      paddingBottom: 14,
                      borderBottom: '0.5px solid rgba(255,255,255,0.05)'
                    }}
                  >
                    {/* Qty badge */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 4,
                        background: 'rgba(176,144,96,0.12)',
                        border: '0.5px solid rgba(176,144,96,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        color: 'var(--gold)',
                        fontWeight: 600,
                        flexShrink: 0
                      }}
                    >
                      {item.qty}
                    </div>
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
                          lineHeight: 1.3,
                          marginBottom: 2
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                        {item.size}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--t2)',
                        flexShrink: 0
                      }}
                    >
                      {formatINR(item.price * item.qty)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Shipping note */}
              {shipping > 0 && !hasOnlyPartials && (
                <div
                  style={{
                    background: 'rgba(176,144,96,0.05)',
                    border: '0.5px solid rgba(176,144,96,0.12)',
                    borderRadius: 4,
                    padding: '8px 12px',
                    marginBottom: 12,
                    fontSize: 11,
                    color: 'var(--t3)'
                  }}
                >
                  Add {formatINR(FREE_SHIPPING_THRESHOLD - subtotal)} more for
                  free shipping
                </div>
              )}
              {hasOnlyPartials && (
                <div
                  style={{
                    background: 'rgba(176,144,96,0.05)',
                    border: '0.5px solid rgba(176,144,96,0.12)',
                    borderRadius: 4,
                    padding: '8px 12px',
                    marginBottom: 12,
                    fontSize: 11,
                    color: 'var(--t3)'
                  }}
                >
                  ₹160 flat shipping on partial bottle orders
                </div>
              )}

              {/* Totals */}
              <div
                style={{
                  borderTop: '0.5px solid rgba(255,255,255,0.07)',
                  paddingTop: 14
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
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
                    fontSize: 13,
                    color: 'var(--t3)',
                    marginBottom: couponApplied ? 6 : 14
                  }}
                >
                  <span>Shipping</span>
                  <span
                    style={{ color: shipping === 0 ? '#4caf7d' : 'var(--t3)' }}
                  >
                    {shipping === 0 ? 'Free 🎉' : formatINR(shipping)}
                  </span>
                </div>
                {couponApplied && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      color: '#4caf7d',
                      marginBottom: 14
                    }}
                  >
                    <span>Discount ({couponApplied.code})</span>
                    <span>− {formatINR(discountAmount)}</span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: 'var(--ff-serif)',
                    fontSize: '1.3rem',
                    color: 'var(--t1)',
                    paddingTop: 10,
                    borderTop: '0.5px solid rgba(255,255,255,0.07)'
                  }}
                >
                  <span>Total</span>
                  <div style={{ textAlign: 'right' }}>
                    {couponApplied && (
                      <div
                        style={{
                          fontSize: '0.9rem',
                          color: 'var(--t3)',
                          textDecoration: 'line-through',
                          marginBottom: 2
                        }}
                      >
                        {formatINR(grandTotal)}
                      </div>
                    )}
                    <span style={{ color: 'var(--gold)' }}>
                      {formatINR(finalTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: '0.5px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                {[
                  '🔒 Razorpay secured payment',
                  '📦 Ships within 24 hours',
                  '🇮🇳 PAN India delivery'
                ].map((t) => (
                  <div key={t} style={{ fontSize: 11, color: 'var(--t3)' }}>
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => router.back()}
              style={{
                width: '100%',
                marginTop: 10,
                padding: '10px',
                borderRadius: 6,
                background: 'none',
                border: '0.5px solid rgba(255,255,255,0.08)',
                color: 'var(--t3)',
                fontFamily: 'var(--ff-sans)',
                fontSize: 12,
                cursor: 'pointer',
                letterSpacing: '0.06em'
              }}
            >
              ← Edit Cart
            </button>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 700px) {
          .checkout-grid {
            grid-template-columns: 1fr !important;
          }
          .checkout-grid > div:last-child {
            order: -1;
          }
        }
      `}</style>
    </div>
  )
}

