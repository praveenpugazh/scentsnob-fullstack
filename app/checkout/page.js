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
  return (
    <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{msg}</p>
  )
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
  const [showWheel, setShowWheel] = useState(false)
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
  const [touched, setTouched] = useState({})
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

  const touch = (field) => {
    setTouched((t) => ({ ...t, [field]: true }))
    const e = validate()
    setErrors((prev) => ({ ...prev, [field]: e[field] || '' }))
  }

  const isFormValid = Object.keys(validate()).length === 0

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

  const handleWhatsApp = () => {
    if (!validate()) return
    const lines = items.map(([, item]) => {
      const label = item.isPartial
        ? `${item.brand} ${item.name} (Partial)`
        : `${item.brand} ${item.name} ${item.size}`
      return `• ${label} × ${item.qty} — ${formatINR(item.price * item.qty)}`
    })
    const fullAddress = [line1, line2, line3, pincode]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(', ')
    let msg = `Hi Scent Snob! I'd like to place an order 🛒\n\n`
    msg += lines.join('\n')
    msg += `\n\nSubtotal: ${formatINR(subtotal)}`
    msg += `\nShipping: ${shipping === 0 ? 'Free' : formatINR(shipping)}`
    if (couponApplied) {
      msg += `\nDiscount (${couponApplied.code}): − ${formatINR(discountAmount)}`
    }
    msg += `\n*Total: ${formatINR(finalTotal)}*`
    msg += `\n\nName: ${name.trim()}`
    msg += `\nPhone: ${phone.trim()}`
    msg += `\nAddress: ${fullAddress}`
    const encoded = encodeURIComponent(msg)
    window.open(`https://wa.me/918754519509?text=${encoded}`, '_blank')
  }

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
        if (finalTotal >= 5000) setShowWheel(true)
      }
    }

    new window.Razorpay(options).open()
  }

  const inp = (hasErr, fieldName) => {
    const isValid =
      fieldName &&
      touched[fieldName] &&
      !hasErr &&
      (fieldName === 'phone'
        ? phone.replace(/\D/g, '').length === 10
        : fieldName === 'pincode'
          ? /^\d{6}$/.test(pincode.trim())
          : fieldName === 'name'
            ? name.trim().length > 0
            : fieldName === 'line1'
              ? line1.trim().length > 0
              : fieldName === 'line2'
                ? line2.trim().length > 0
                : fieldName === 'line3'
                  ? line3.trim().length > 0
                  : false)
    return {
      width: '100%',
      boxSizing: 'border-box',
      background: 'var(--w04)',
      border: `0.5px solid ${hasErr ? 'var(--red)' : isValid ? 'rgba(76,175,125,0.6)' : 'var(--w12)'}`,
      borderRadius: 6,
      padding: '11px 14px',
      fontFamily: 'var(--ff-sans)',
      fontSize: 14,
      color: 'var(--w90)',
      outline: 'none',
      transition: 'border-color .2s'
    }
  }

  const lbl = {
    fontSize: 11,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--w40)',
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
                border: '0.5px solid var(--green-br)',
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
              background: 'var(--w02)',
              border: '0.5px solid var(--w08)',
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
                  color: 'var(--green-txt)',
                  border: '0.5px solid var(--green-br)',
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
                borderTop: '0.5px solid var(--w06)',
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
                borderTop: '0.5px solid var(--w06)',
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
                    color:
                      done.shipping === 0 ? 'var(--green-txt)' : 'var(--t3)'
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
                borderTop: '0.5px solid var(--w06)',
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
                  color: 'var(--w25)',
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
                color: 'var(--w18)'
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
                background: 'var(--gold-08)',
                border: '0.5px solid var(--gold-25)',
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
            color: 'var(--w90)'
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
            padding: '3rem 4vw 6rem',
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,0.9fr)',
            gap: 40,
            alignItems: 'start'
          }}
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
                    style={inp(errors.name, 'name')}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      setErrors((v) => ({ ...v, name: '' }))
                    }}
                    onBlur={() => touch('name')}
                    placeholder='Priya Sharma'
                  />
                  <FieldError msg={errors.name} />
                </div>
                <div>
                  <label style={lbl}>Phone Number</label>
                  <input
                    style={inp(errors.phone, 'phone')}
                    type='tel'
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setPhone(val)
                      setErrors((v) => ({ ...v, phone: '' }))
                    }}
                    onBlur={() => touch('phone')}
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
                  style={inp(errors.line1, 'line1')}
                  value={line1}
                  onChange={(e) => {
                    setLine1(e.target.value)
                    setErrors((v) => ({ ...v, line1: '' }))
                  }}
                  onBlur={() => touch('line1')}
                  placeholder='12A, MG Road'
                />
                <FieldError msg={errors.line1} />
              </div>

              {/* Address line 2 */}
              <div>
                <label style={lbl}>Area / Locality</label>
                <input
                  style={inp(errors.line2, 'line2')}
                  value={line2}
                  onChange={(e) => {
                    setLine2(e.target.value)
                    setErrors((v) => ({ ...v, line2: '' }))
                  }}
                  onBlur={() => touch('line2')}
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
                    style={inp(errors.line3, 'line3')}
                    value={line3}
                    onChange={(e) => {
                      setLine3(e.target.value)
                      setErrors((v) => ({ ...v, line3: '' }))
                    }}
                    onBlur={() => touch('line3')}
                    placeholder='Bengaluru, Karnataka'
                  />
                  <FieldError msg={errors.line3} />
                </div>
                <div>
                  <label style={lbl}>PIN Code</label>
                  <input
                    style={inp(errors.pincode, 'pincode')}
                    type='text'
                    inputMode='numeric'
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setPincode(val)
                      setErrors((v) => ({ ...v, pincode: '' }))
                    }}
                    onBlur={() => touch('pincode')}
                    placeholder='560034'
                  />
                  <FieldError msg={errors.pincode} />
                </div>
              </div>
            </div>

            {/* Form completion hint */}
            {!isFormValid && Object.values(touched).some(Boolean) && (
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--w30)',
                  marginTop: 16,
                  lineHeight: 1.6
                }}
              >
                ↑ Fill in all fields above to enable checkout
              </p>
            )}

            {/* Coupon code */}
            <div style={{ marginTop: 24 }}>
              <label style={lbl}>
                Discount Code{' '}
                <span
                  style={{
                    color: 'var(--w25)',
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
                    background: 'var(--green-bg)',
                    border: '0.5px solid var(--green-br)',
                    borderRadius: 6
                  }}
                >
                  <span
                    style={{ fontSize: 12, color: 'var(--green-txt)', flex: 1 }}
                  >
                    ✓ {couponApplied.message} — saving{' '}
                    {formatINR(discountAmount)}
                  </span>
                  <button
                    onClick={removeCoupon}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--w40)',
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
                      background: 'var(--gold-15)',
                      border: '0.5px solid var(--gold-30)',
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
                <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>
                  {couponError}
                </p>
              )}
            </div>

            {/* Pay button */}
            <div style={{ marginTop: 32 }}>
              {submitErr && (
                <div
                  style={{
                    background: 'var(--red-bg)',
                    border: '0.5px solid var(--red-br)',
                    borderRadius: 6,
                    padding: '10px 14px',
                    marginBottom: 14,
                    fontSize: 13,
                    color: 'var(--red)'
                  }}
                >
                  {submitErr}
                </div>
              )}

              {/* WhatsApp option */}
              <button
                onClick={handleWhatsApp}
                disabled={!isFormValid}
                title={
                  !isFormValid ? 'Please fill in all delivery details' : ''
                }
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: 6,
                  background: isFormValid ? '#25D366' : 'rgba(37,211,102,0.3)',
                  border: 'none',
                  color: '#fff',
                  fontFamily: 'var(--ff-sans)',
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: isFormValid ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 10,
                  transition: 'all .2s'
                }}
              >
                <svg
                  width='18'
                  height='18'
                  viewBox='0 0 24 24'
                  fill='currentColor'
                >
                  <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
                </svg>
                Order via WhatsApp
              </button>

              {/* Divider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 10
                }}
              >
                <div
                  style={{ flex: 1, height: '0.5px', background: 'var(--w08)' }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--t3)',
                    letterSpacing: '0.08em'
                  }}
                >
                  OR PAY ONLINE
                </span>
                <div
                  style={{ flex: 1, height: '0.5px', background: 'var(--w08)' }}
                />
              </div>

              <button
                onClick={handlePay}
                disabled={paying || !isFormValid}
                title={
                  !isFormValid ? 'Please fill in all delivery details' : ''
                }
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: 6,
                  background: !isFormValid
                    ? 'var(--gold-30)'
                    : paying
                      ? 'var(--gold-50)'
                      : '#b09060',
                  border: 'none',
                  color: '#fff',
                  fontFamily: 'var(--ff-sans)',
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: paying || !isFormValid ? 'not-allowed' : 'pointer',
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
                background: 'var(--w02)',
                border: '0.5px solid var(--w08)',
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
                      borderBottom: '0.5px solid var(--w05)'
                    }}
                  >
                    {/* Qty badge */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 4,
                        background: 'var(--gold-12)',
                        border: '0.5px solid var(--gold-20)',
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
                    background: 'var(--gold-05)',
                    border: '0.5px solid var(--gold-12)',
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
                    background: 'var(--gold-05)',
                    border: '0.5px solid var(--gold-12)',
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
                  borderTop: '0.5px solid var(--w07)',
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
                    style={{
                      color: shipping === 0 ? 'var(--green-txt)' : 'var(--t3)'
                    }}
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
                      color: 'var(--green-txt)',
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
                    borderTop: '0.5px solid var(--w07)'
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
                  borderTop: '0.5px solid var(--w05)',
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
                border: '0.5px solid var(--w08)',
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
    </div>
  )
}
