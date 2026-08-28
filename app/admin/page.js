'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { calcPrices, formatINR, DEFAULT_MARGIN } from '@/lib/pricing'
import { createBrowserSupabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'praveenpugazh14@gmail.com'

const S = {
  btn: {
    fontFamily: 'var(--ff-sans)',
    cursor: 'pointer',
    border: 'none',
    borderRadius: 4
  },
  inp: {
    background: 'var(--bg)',
    border: '0.5px solid var(--w15)',
    borderRadius: 4,
    padding: '8px 10px',
    fontFamily: 'var(--ff-sans)',
    fontSize: 13,
    color: 'var(--t1)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  },
  lbl: {
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--w40)',
    display: 'block',
    marginBottom: 4
  },
  card: {
    background: 'var(--bg2)',
    border: '0.5px solid var(--w08)',
    borderRadius: 6,
    padding: '0.85rem 1rem'
  }
}

const STATUS_FLOW = ['Pending', 'Paid', 'Shipped', 'Delivered']

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 16, color = 'var(--gold)' }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `2px solid ${color}33`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
        verticalAlign: 'middle'
      }}
    />
  )
}

// ── SaveToast — small non-blocking feedback strip ─────────────────────────────
function SaveToast({ msg, type = 'success' }) {
  if (!msg) return null
  const bg = type === 'error' ? 'var(--red-bg)' : 'rgba(76,175,125,0.12)'
  const bdr = type === 'error' ? 'var(--red-br)' : 'var(--green-br)'
  const col = type === 'error' ? 'var(--red)' : 'var(--green-txt)'
  const icon = type === 'error' ? '✕' : '✓'
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 500,
        background: bg,
        border: `0.5px solid ${bdr}`,
        borderRadius: 8,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        color: col,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <span style={{ fontWeight: 700 }}>{icon}</span> {msg}
    </div>
  )
}

const STATUS_COLORS = {
  Pending: '#b09060',
  Paid: '#4a9eff',
  Shipped: '#9b59b6',
  Delivered: 'var(--green-txt)',
  Cancelled: '#dc5050'
}

function StatusStepper({ status, onChange }) {
  const color = STATUS_COLORS[status] || '#b09060'
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(status) + 1]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap'
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '3px 10px',
          borderRadius: 20,
          background: `${color}18`,
          color,
          border: `0.5px solid ${color}44`
        }}
      >
        {status}
      </span>
      {nextStatus && (
        <button
          onClick={() => onChange(nextStatus)}
          style={{
            ...S.btn,
            fontSize: 10,
            padding: '3px 9px',
            background: 'var(--bg3)',
            color: 'var(--w40)',
            border: '0.5px solid var(--w12)',
            borderRadius: 20
          }}
        >
          → {nextStatus}
        </button>
      )}
      {status !== 'Cancelled' && (
        <button
          onClick={() => {
            if (window.confirm('Mark this order as Cancelled?')) {
              onChange('Cancelled')
            }
          }}
          title='Cancel order'
          style={{
            ...S.btn,
            fontSize: 10,
            padding: '3px 10px',
            background: 'var(--red-bg)',
            color: '#dc5050',
            border: '0.5px solid var(--red-br)',
            borderRadius: 20,
            fontWeight: 600,
            letterSpacing: '0.06em'
          }}
        >
          Cancel
        </button>
      )}
    </div>
  )
}

// ── ORDERS TAB ───────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  // Manual order state
  const [showManual, setShowManual] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [bulkRows, setBulkRows] = useState([emptyBulkRow()])
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkDone, setBulkDone] = useState(null)
  const [products, setProducts] = useState([])
  const [partials, setPartials] = useState([])
  const [saving, setSaving] = useState(false)
  const [itemSearch, setItemSearch] = useState('')
  const [manualForm, setManualForm] = useState({
    customer: '',
    phone: '',
    line1: '',
    line2: '',
    line3: '',
    pincode: '',
    payment: 'GPay',
    notes: '',
    items: []
  })
  const setMF = (k, v) => setManualForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    fetch('/api/orders')
      .then((r) => r.json())
      .then((d) => {
        setOrders(Array.isArray(d) ? d : [])
        setLoading(false)
      })
  }, [])

  // Load products + partials when manual modal opens
  useEffect(() => {
    if (!showManual || products.length > 0) return
    Promise.all([
      fetch('/api/products?admin=1').then((r) => r.json()),
      fetch('/api/partials').then((r) => r.json())
    ]).then(([p, pa]) => {
      setProducts(Array.isArray(p) ? p : [])
      setPartials(Array.isArray(pa) ? pa : [])
    })
  }, [showManual])

  const addItem = (item) => {
    setManualForm((f) => ({ ...f, items: [...f.items, item] }))
    setItemSearch('')
  }

  const removeItem = (idx) =>
    setManualForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))

  const updateItemQty = (idx, qty) =>
    setManualForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === idx ? { ...it, qty: Math.max(1, Number(qty)) } : it
      )
    }))

  const updateItemPrice = (idx, price) =>
    setManualForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === idx ? { ...it, price: Number(price) } : it
      )
    }))

  // Totals
  const subtotal = manualForm.items.reduce((s, it) => s + it.price * it.qty, 0)
  const shipping = subtotal >= 3000 ? 0 : 160
  const total = subtotal + shipping

  const submitManualOrder = async () => {
    if (
      !manualForm.customer ||
      !manualForm.phone ||
      !manualForm.line1 ||
      !manualForm.pincode
    )
      return
    if (manualForm.items.length === 0) return
    setSaving(true)
    const address = [
      manualForm.line1,
      manualForm.line2,
      manualForm.line3,
      manualForm.pincode
    ]
      .filter(Boolean)
      .join(', ')
    const r = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: manualForm.customer,
        phone: manualForm.phone,
        address,
        items: manualForm.items.map((it) => ({
          name: it.name,
          brand: it.brand,
          size: it.size || '',
          qty: it.qty,
          price: it.price
        })),
        subtotal,
        shipping,
        total,
        status: 'Paid',
        payment_id: `manual_${manualForm.payment}_${Date.now()}`,
        notes:
          manualForm.notes || `Manual order — paid via ${manualForm.payment}`
      })
    })
    const created = await r.json()
    setOrders((o) => [created, ...o])
    setShowManual(false)
    setManualForm({
      customer: '',
      phone: '',
      line1: '',
      line2: '',
      line3: '',
      pincode: '',
      payment: 'GPay',
      notes: '',
      items: []
    })
    setItemSearch('')
    setSaving(false)
  }

  // Item search results
  const itemResults =
    itemSearch.length < 1
      ? []
      : [
          ...products.flatMap((p) => {
            const sizes = ['5ml', '10ml', '20ml', '30ml']
            const prices = [p.p5, p.p10, p.p20, p.p30]
            return sizes
              .map((sz, i) => ({
                key: `${p.id}-${sz}`,
                label: `${p.brand} ${p.name} ${sz}`,
                brand: p.brand,
                name: p.name,
                size: sz,
                price: prices[i] || 0,
                qty: 1,
                type: 'decant'
              }))
              .filter((x) => x.price > 0)
          }),
          ...partials.map((p) => ({
            key: `partial-${p.id}`,
            label: `${p.brand} ${p.name} (Partial ${p.ml_left}ml)`,
            brand: p.brand,
            name: p.name,
            size: `${p.ml_left}ml partial`,
            price: p.price || 0,
            qty: 1,
            type: 'partial'
          }))
        ]
          .filter((x) =>
            x.label.toLowerCase().includes(itemSearch.toLowerCase())
          )
          .slice(0, 8)

  function emptyBulkRow() {
    return {
      customer: '',
      phone: '',
      address: '',
      items: '', // free text e.g. "Khamrah 10ml, Naxos 5ml"
      total: '', // what they paid total
      shipping: '160', // shipping charged (0 if free)
      payment: 'GPay',
      date: new Date().toISOString().slice(0, 10),
      notes: ''
    }
  }

  const addBulkRow = () => setBulkRows((r) => [...r, emptyBulkRow()])
  const removeBulkRow = (i) =>
    setBulkRows((r) => r.filter((_, idx) => idx !== i))
  const setBulkCell = (i, k, v) =>
    setBulkRows((r) =>
      r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row))
    )

  // Parse free-text items like "Khamrah 10ml, Naxos 5ml x2, Black Afgano 5ml"
  const parseItems = (text) => {
    return text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const qtyMatch = s.match(/[xX×](\d+)\s*$/)
        const qty = qtyMatch ? Number(qtyMatch[1]) : 1
        const rest = s.replace(/[xX×]\d+\s*$/, '').trim()
        const sizeMatch = rest.match(/(\d+ml)\s*$/i)
        const size = sizeMatch ? sizeMatch[1] : ''
        const name = rest.replace(/\d+ml\s*$/i, '').trim()
        return { name, size, qty, price: 0, brand: '' }
      })
  }

  const submitBulk = async () => {
    const valid = bulkRows.filter(
      (r) => r.customer && r.phone && r.items && r.total
    )
    if (!valid.length) return
    setBulkSaving(true)
    let created = 0
    for (const row of valid) {
      const items = parseItems(row.items)
      const total = Number(row.total)
      const shipping = Number(row.shipping) || 0
      const subtotal = total - shipping

      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let orderRef = 'SS-'
      for (let i = 0; i < 6; i++)
        orderRef += chars[Math.floor(Math.random() * chars.length)]

      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_ref: orderRef,
          customer: row.customer,
          phone: row.phone,
          address:
            row.address || 'WhatsApp community order — address not captured',
          items,
          subtotal,
          shipping,
          total,
          status: 'Delivered', // already sold and shipped
          payment_id: `bulk_${row.payment}_${Date.now()}_${created}`,
          notes: `WhatsApp community sale · ${row.payment}${row.notes ? ' · ' + row.notes : ''}`,
          created_at: row.date ? new Date(row.date).toISOString() : undefined
        })
      })
      created++
    }
    // Refresh orders
    const fresh = await fetch('/api/orders').then((r) => r.json())
    setOrders(Array.isArray(fresh) ? fresh : [])
    setBulkDone(created)
    setBulkSaving(false)
  }

  const updateStatus = async (id, status, trackingNumber) => {
    const body = { status }
    if (trackingNumber) body.tracking_number = trackingNumber
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    setOrders((o) =>
      o.map((x) =>
        x.id === id
          ? {
              ...x,
              status,
              ...(trackingNumber ? { tracking_number: trackingNumber } : {})
            }
          : x
      )
    )
  }

  const filtered = orders.filter((o) => {
    const matchSearch =
      !search ||
      `${o.customer} ${o.phone} ${o.order_ref}`
        .toLowerCase()
        .includes(search.toLowerCase())
    const matchFilter = filter === 'all' || o.status === filter
    return matchSearch && matchFilter
  })

  const totalRevenue = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((a, o) => a + (o.total || 0), 0)
  const thisMonth = orders
    .filter(
      (o) =>
        new Date(o.created_at).getMonth() === new Date().getMonth() &&
        o.status !== 'Cancelled'
    )
    .reduce((a, o) => a + (o.total || 0), 0)
  const pendingCount = orders.filter((o) => o.status === 'Pending').length

  return (
    <div>
      {/* Bulk Import Modal */}
      {showBulk && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '2rem 1rem',
            overflowY: 'auto'
          }}
          onClick={() => setShowBulk(false)}
        >
          <div
            style={{
              background: 'var(--bg2)',
              border: '0.5px solid var(--gold-25)',
              borderRadius: 10,
              padding: '1.75rem',
              width: '100%',
              maxWidth: 900,
              marginBottom: '2rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 20
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--gold)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    marginBottom: 4
                  }}
                >
                  Bulk Import — WhatsApp / Community Sales
                </div>
                <div
                  style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.7 }}
                >
                  Fill one row per order. All will be saved as{' '}
                  <strong style={{ color: 'var(--green-txt)' }}>
                    Delivered
                  </strong>{' '}
                  since they're already sold and shipped.
                  <br />
                  Items: comma-separated e.g.{' '}
                  <code
                    style={{
                      background: 'var(--bg3)',
                      padding: '1px 5px',
                      borderRadius: 3,
                      color: 'var(--gold)',
                      fontSize: 10
                    }}
                  >
                    Khamrah 10ml, Naxos 5ml x2, Black Afgano 5ml
                  </code>
                </div>
              </div>
              <button
                onClick={() => setShowBulk(false)}
                style={{
                  ...S.btn,
                  background: 'var(--w08)',
                  border: '0.5px solid var(--w12)',
                  color: 'var(--t2)',
                  width: 28,
                  height: 28,
                  padding: 0,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                  flexShrink: 0
                }}
              >
                ×
              </button>
            </div>

            {bulkDone !== null ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                <div
                  style={{ fontSize: 18, color: 'var(--t1)', marginBottom: 8 }}
                >
                  {bulkDone} orders imported
                </div>
                <div
                  style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 24 }}
                >
                  All saved as Delivered. Revenue and stats updated.
                </div>
                <button
                  onClick={() => setShowBulk(false)}
                  style={{
                    ...S.btn,
                    background: 'var(--gold)',
                    color: '#fff',
                    padding: '10px 28px',
                    fontSize: 13
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '1.5fr 1fr 1.5fr 2fr 0.8fr 0.8fr 1fr 1fr auto',
                    gap: 6,
                    marginBottom: 6,
                    padding: '0 4px'
                  }}
                >
                  {[
                    'Customer',
                    'Phone',
                    'Address (optional)',
                    'Items sold',
                    'Total (₹)',
                    'Shipping',
                    'Payment',
                    'Date',
                    ''
                  ].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 9,
                        color: 'var(--t3)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        fontWeight: 600
                      }}
                    >
                      {h}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    marginBottom: 14,
                    maxHeight: 400,
                    overflowY: 'auto'
                  }}
                >
                  {bulkRows.map((row, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          '1.5fr 1fr 1.5fr 2fr 0.8fr 0.8fr 1fr 1fr auto',
                        gap: 6,
                        alignItems: 'center',
                        background: 'var(--bg3)',
                        borderRadius: 6,
                        padding: '8px 10px',
                        border: `0.5px solid ${row.customer && row.phone && row.items && row.total ? 'var(--green-br)' : 'var(--w08)'}`
                      }}
                    >
                      <input
                        style={{ ...S.inp, fontSize: 11, padding: '5px 8px' }}
                        placeholder='Rahul Sharma'
                        value={row.customer}
                        onChange={(e) =>
                          setBulkCell(i, 'customer', e.target.value)
                        }
                      />
                      <input
                        style={{ ...S.inp, fontSize: 11, padding: '5px 8px' }}
                        placeholder='9876543210'
                        value={row.phone}
                        onChange={(e) =>
                          setBulkCell(
                            i,
                            'phone',
                            e.target.value.replace(/\D/g, '').slice(0, 10)
                          )
                        }
                        type='tel'
                      />
                      <input
                        style={{ ...S.inp, fontSize: 11, padding: '5px 8px' }}
                        placeholder='Chennai, Tamil Nadu'
                        value={row.address}
                        onChange={(e) =>
                          setBulkCell(i, 'address', e.target.value)
                        }
                      />
                      <input
                        style={{ ...S.inp, fontSize: 11, padding: '5px 8px' }}
                        placeholder='Khamrah 10ml, Naxos 5ml'
                        value={row.items}
                        onChange={(e) =>
                          setBulkCell(i, 'items', e.target.value)
                        }
                      />
                      <input
                        style={{
                          ...S.inp,
                          fontSize: 11,
                          padding: '5px 8px',
                          color: 'var(--gold)',
                          fontWeight: 600
                        }}
                        placeholder='1450'
                        value={row.total}
                        onChange={(e) =>
                          setBulkCell(i, 'total', e.target.value)
                        }
                        type='number'
                      />
                      <input
                        style={{ ...S.inp, fontSize: 11, padding: '5px 8px' }}
                        placeholder='160'
                        value={row.shipping}
                        onChange={(e) =>
                          setBulkCell(i, 'shipping', e.target.value)
                        }
                        type='number'
                      />
                      <select
                        style={{ ...S.inp, fontSize: 11, padding: '5px 6px' }}
                        value={row.payment}
                        onChange={(e) =>
                          setBulkCell(i, 'payment', e.target.value)
                        }
                      >
                        {[
                          'GPay',
                          'PhonePe',
                          'Paytm',
                          'BHIM UPI',
                          'Cash',
                          'Bank Transfer',
                          'Other'
                        ].map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                      <input
                        style={{ ...S.inp, fontSize: 11, padding: '5px 8px' }}
                        type='date'
                        value={row.date}
                        onChange={(e) => setBulkCell(i, 'date', e.target.value)}
                      />
                      <button
                        onClick={() => removeBulkRow(i)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(220,80,80,0.5)',
                          cursor: 'pointer',
                          fontSize: 16,
                          padding: '0 4px',
                          lineHeight: 1
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add row + submit */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    onClick={addBulkRow}
                    style={{
                      ...S.btn,
                      background: 'var(--w08)',
                      border: '0.5px solid var(--w15)',
                      color: 'var(--t2)',
                      padding: '8px 16px',
                      fontSize: 12
                    }}
                  >
                    + Add Row
                  </button>
                  <div style={{ flex: 1, fontSize: 11, color: 'var(--t3)' }}>
                    {
                      bulkRows.filter(
                        (r) => r.customer && r.phone && r.items && r.total
                      ).length
                    }{' '}
                    of {bulkRows.length} row{bulkRows.length !== 1 ? 's' : ''}{' '}
                    ready
                  </div>
                  <button
                    onClick={submitBulk}
                    disabled={
                      bulkSaving ||
                      !bulkRows.some(
                        (r) => r.customer && r.phone && r.items && r.total
                      )
                    }
                    style={{
                      ...S.btn,
                      background: 'var(--gold)',
                      color: '#fff',
                      padding: '10px 24px',
                      fontSize: 13,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      opacity: bulkRows.some(
                        (r) => r.customer && r.phone && r.items && r.total
                      )
                        ? 1
                        : 0.4
                    }}
                  >
                    {bulkSaving ? 'Saving...' : '✓ Import All'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Manual Order Modal */}
      {showManual && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '2rem 1rem',
            overflowY: 'auto'
          }}
          onClick={() => setShowManual(false)}
        >
          <div
            style={{
              background: 'var(--bg2)',
              border: '0.5px solid var(--gold-25)',
              borderRadius: 10,
              padding: '1.75rem',
              width: '100%',
              maxWidth: 640,
              marginBottom: '2rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--gold)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 600
                  }}
                >
                  Manual Order
                </div>
                <div
                  style={{ fontSize: 11, color: 'var(--w35)', marginTop: 2 }}
                >
                  WhatsApp / GPay / UPI / Cash orders
                </div>
              </div>
              <button
                onClick={() => setShowManual(false)}
                style={{
                  ...S.btn,
                  background: 'var(--bg3)',
                  border: '0.5px solid var(--w12)',
                  color: 'var(--w60)',
                  width: 28,
                  height: 28,
                  padding: 0,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4
                }}
              >
                ×
              </button>
            </div>

            {/* Customer details */}
            <div
              style={{
                fontSize: 10,
                color: 'var(--gold)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 10,
                fontWeight: 600
              }}
            >
              Customer Details
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 10
              }}
            >
              <div>
                <label style={S.lbl}>Full Name</label>
                <input
                  style={S.inp}
                  value={manualForm.customer}
                  onChange={(e) => setMF('customer', e.target.value)}
                  placeholder='Rahul Sharma'
                />
              </div>
              <div>
                <label style={S.lbl}>Phone</label>
                <input
                  style={S.inp}
                  type='tel'
                  value={manualForm.phone}
                  onChange={(e) =>
                    setMF(
                      'phone',
                      e.target.value.replace(/\D/g, '').slice(0, 10)
                    )
                  }
                  placeholder='9876543210'
                  maxLength={10}
                />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={S.lbl}>Flat / House & Street</label>
              <input
                style={S.inp}
                value={manualForm.line1}
                onChange={(e) => setMF('line1', e.target.value)}
                placeholder='12A, MG Road'
              />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                gap: 10,
                marginBottom: 16
              }}
            >
              <div>
                <label style={S.lbl}>Area / Locality</label>
                <input
                  style={S.inp}
                  value={manualForm.line2}
                  onChange={(e) => setMF('line2', e.target.value)}
                  placeholder='Koramangala'
                />
              </div>
              <div>
                <label style={S.lbl}>City & State</label>
                <input
                  style={S.inp}
                  value={manualForm.line3}
                  onChange={(e) => setMF('line3', e.target.value)}
                  placeholder='Bengaluru, KA'
                />
              </div>
              <div>
                <label style={S.lbl}>PIN Code</label>
                <input
                  style={S.inp}
                  value={manualForm.pincode}
                  onChange={(e) =>
                    setMF(
                      'pincode',
                      e.target.value.replace(/\D/g, '').slice(0, 6)
                    )
                  }
                  placeholder='560034'
                />
              </div>
            </div>

            {/* Item search */}
            <div
              style={{
                fontSize: 10,
                color: 'var(--gold)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 10,
                fontWeight: 600
              }}
            >
              Items Ordered
            </div>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <input
                style={{ ...S.inp, paddingRight: 36 }}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder='Search product or partial name + size...'
              />
              {itemSearch && (
                <button
                  onClick={() => setItemSearch('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--w40)',
                    cursor: 'pointer',
                    fontSize: 16
                  }}
                >
                  ×
                </button>
              )}
              {itemResults.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--bg3)',
                    border: '0.5px solid var(--gold-20)',
                    borderRadius: 6,
                    zIndex: 10,
                    maxHeight: 220,
                    overflowY: 'auto',
                    marginTop: 2
                  }}
                >
                  {itemResults.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => addItem(item)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        padding: '8px 12px',
                        background: 'none',
                        border: 'none',
                        borderBottom: '0.5px solid var(--w06)',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 12, color: 'var(--w85)' }}>
                          {item.brand} {item.name}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--w40)',
                            marginLeft: 8
                          }}
                        >
                          {item.size}
                        </span>
                        {item.type === 'partial' && (
                          <span
                            style={{
                              fontSize: 9,
                              color: 'var(--gold)',
                              marginLeft: 6,
                              letterSpacing: '0.08em'
                            }}
                          >
                            PARTIAL
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--gold)',
                          fontWeight: 600
                        }}
                      >
                        ₹{item.price}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom line item */}
            <div
              style={{
                fontSize: 10,
                color: 'var(--w35)',
                marginBottom: 10,
                letterSpacing: '0.06em'
              }}
            >
              Can't find it? Add manually:
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['brand', 'name', 'size', 'price'].map((field, i) => (
                <input
                  key={field}
                  id={`custom-${field}`}
                  style={{ ...S.inp, flex: field === 'name' ? 2 : 1 }}
                  placeholder={['Brand', 'Name', 'Size', '₹Price'][i]}
                  type={field === 'price' ? 'number' : 'text'}
                />
              ))}
              <button
                onClick={() => {
                  const b = document.getElementById('custom-brand').value
                  const n = document.getElementById('custom-name').value
                  const sz = document.getElementById('custom-size').value
                  const pr = Number(
                    document.getElementById('custom-price').value
                  )
                  if (!n || !pr) return
                  addItem({
                    key: `custom-${Date.now()}`,
                    brand: b,
                    name: n,
                    size: sz,
                    price: pr,
                    qty: 1,
                    type: 'custom'
                  })
                  ;['brand', 'name', 'size', 'price'].forEach((f) => {
                    document.getElementById(`custom-${f}`).value = ''
                  })
                }}
                style={{
                  ...S.btn,
                  background: 'var(--gold-20)',
                  border: '0.5px solid var(--gold-35)',
                  color: 'var(--gold)',
                  padding: '0 14px',
                  whiteSpace: 'nowrap',
                  fontSize: 12
                }}
              >
                + Add
              </button>
            </div>

            {/* Items list */}
            {manualForm.items.length > 0 && (
              <div
                style={{
                  background: 'var(--bg3)',
                  border: '0.5px solid var(--w08)',
                  borderRadius: 6,
                  marginBottom: 16,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
                    gap: 8,
                    padding: '6px 12px',
                    borderBottom: '0.5px solid var(--w08)',
                    fontSize: 9,
                    color: 'var(--w35)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                  }}
                >
                  <span>Item</span>
                  <span>Qty</span>
                  <span>Price (₹)</span>
                  <span></span>
                </div>
                {manualForm.items.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto auto',
                      gap: 8,
                      padding: '8px 12px',
                      borderBottom:
                        idx < manualForm.items.length - 1
                          ? '0.5px solid var(--w06)'
                          : 'none',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 12, color: 'var(--w85)' }}>
                        {it.brand} {it.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--w40)',
                          marginLeft: 6
                        }}
                      >
                        {it.size}
                      </span>
                    </div>
                    <input
                      type='number'
                      min='1'
                      value={it.qty}
                      onChange={(e) => updateItemQty(idx, e.target.value)}
                      style={{
                        ...S.inp,
                        width: 48,
                        textAlign: 'center',
                        padding: '4px 6px',
                        fontSize: 12
                      }}
                    />
                    <input
                      type='number'
                      min='0'
                      value={it.price}
                      onChange={(e) => updateItemPrice(idx, e.target.value)}
                      style={{
                        ...S.inp,
                        width: 72,
                        textAlign: 'right',
                        padding: '4px 8px',
                        fontSize: 12
                      }}
                    />
                    <button
                      onClick={() => removeItem(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--red)',
                        cursor: 'pointer',
                        fontSize: 16,
                        padding: '0 4px'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {/* Totals */}
                <div
                  style={{
                    padding: '10px 12px',
                    borderTop: '0.5px solid var(--w08)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: 'var(--w50)',
                      marginBottom: 4
                    }}
                  >
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: 'var(--w50)',
                      marginBottom: 6
                    }}
                  >
                    <span>Shipping</span>
                    <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--gold)',
                      borderTop: '0.5px solid var(--gold-20)',
                      paddingTop: 6
                    }}
                  >
                    <span>Total</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment method + notes */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                gap: 10,
                marginBottom: 20
              }}
            >
              <div>
                <label style={S.lbl}>Payment Method</label>
                <select
                  style={S.inp}
                  value={manualForm.payment}
                  onChange={(e) => setMF('payment', e.target.value)}
                >
                  {[
                    'GPay',
                    'PhonePe',
                    'Paytm',
                    'BHIM UPI',
                    'Direct UPI',
                    'Cash',
                    'Bank Transfer',
                    'Other'
                  ].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.lbl}>
                  Notes <span style={{ color: 'var(--w30)' }}>optional</span>
                </label>
                <input
                  style={S.inp}
                  value={manualForm.notes}
                  onChange={(e) => setMF('notes', e.target.value)}
                  placeholder='e.g. Paid ₹2,450 via GPay, WhatsApp order'
                />
              </div>
            </div>

            {/* Validation hint */}
            {(!manualForm.customer ||
              !manualForm.phone ||
              !manualForm.line1 ||
              !manualForm.pincode ||
              manualForm.items.length === 0) && (
              <div
                style={{ fontSize: 11, color: 'var(--w30)', marginBottom: 14 }}
              >
                {manualForm.items.length === 0
                  ? '↑ Add at least one item'
                  : '↑ Fill in customer name, phone, address & PIN to proceed'}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={submitManualOrder}
                disabled={
                  saving ||
                  !manualForm.customer ||
                  !manualForm.phone ||
                  !manualForm.line1 ||
                  !manualForm.pincode ||
                  manualForm.items.length === 0
                }
                style={{
                  ...S.btn,
                  background: 'var(--gold)',
                  color: '#fff',
                  padding: '11px 0',
                  fontSize: 13,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  flex: 1,
                  opacity:
                    saving ||
                    !manualForm.customer ||
                    !manualForm.phone ||
                    !manualForm.line1 ||
                    manualForm.items.length === 0
                      ? 0.5
                      : 1
                }}
              >
                {saving
                  ? 'Saving...'
                  : `✓ Create Order · ₹${total.toLocaleString('en-IN')}`}
              </button>
              <button
                onClick={() => setShowManual(false)}
                style={{
                  ...S.btn,
                  background: 'var(--bg3)',
                  border: '0.5px solid var(--w12)',
                  color: 'var(--w60)',
                  padding: '11px 20px',
                  fontSize: 13
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats + Manual Order button row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))',
            gap: 12,
            flex: 1
          }}
        >
          {[
            ['Total Orders', orders.length, 'all time'],
            ['Revenue', formatINR(totalRevenue), 'excl. cancelled'],
            ['This Month', formatINR(thisMonth), ''],
            [
              'Pending',
              pendingCount,
              pendingCount > 0 ? '⚠ needs action' : 'all clear'
            ]
          ].map(([label, val, sub]) => (
            <div
              key={label}
              style={{
                ...S.card,
                borderColor:
                  label === 'Pending' && pendingCount > 0
                    ? 'var(--gold-30)'
                    : undefined
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--w35)',
                  marginBottom: 6
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 22,
                  color:
                    label === 'Pending' && pendingCount > 0
                      ? '#b09060'
                      : 'var(--w90)',
                  fontWeight: 300,
                  fontFamily: 'var(--ff-serif)'
                }}
              >
                {val}
              </div>
              {sub && (
                <div
                  style={{
                    fontSize: 10,
                    color:
                      label === 'Pending' && pendingCount > 0
                        ? '#b09060'
                        : 'var(--w25)',
                    marginTop: 2
                  }}
                >
                  {sub}
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowManual(true)}
          style={{
            ...S.btn,
            background: 'var(--gold)',
            color: '#fff',
            padding: '10px 18px',
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            marginLeft: 16,
            alignSelf: 'flex-start'
          }}
        >
          + Manual Order
        </button>
        <button
          onClick={() => {
            setShowBulk(true)
            setBulkRows([emptyBulkRow()])
            setBulkDone(null)
          }}
          style={{
            ...S.btn,
            background: 'var(--w08)',
            border: '0.5px solid var(--w15)',
            color: 'var(--t2)',
            padding: '10px 14px',
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            alignSelf: 'flex-start'
          }}
        >
          ⬆ Bulk Import
        </button>
      </div>

      <div
        style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search by name, phone, order ID...'
          style={{ ...S.inp, maxWidth: 320, flex: 1 }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled'].map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  ...S.btn,
                  fontSize: 10,
                  padding: '6px 12px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  background:
                    filter === f
                      ? STATUS_COLORS[f]
                        ? `${STATUS_COLORS[f]}22`
                        : 'var(--gold-15)'
                      : 'var(--w03)',
                  color:
                    filter === f ? STATUS_COLORS[f] || '#b09060' : 'var(--w35)',
                  border: `0.5px solid ${filter === f ? (STATUS_COLORS[f] ? `${STATUS_COLORS[f]}44` : 'var(--gold-30)') : 'var(--w08)'}`
                }}
              >
                {f}
              </button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--w30)', padding: '2rem' }}>
          Loading orders...
        </div>
      ) : (
        filtered.map((order) => (
          <div
            key={order.id}
            style={{
              background: 'var(--bg2)',
              border: `0.5px solid ${order.status === 'Pending' ? 'var(--gold-25)' : 'var(--w08)'}`,
              borderRadius: 8,
              padding: '0.85rem 1rem',
              marginBottom: 10,
              boxShadow: '0 1px 8px rgba(0,0,0,0.18)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 4
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--gold)',
                      letterSpacing: '0.08em',
                      fontWeight: 600
                    }}
                  >
                    {order.order_ref}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--w25)' }}>
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--w85)',
                    fontWeight: 500
                  }}
                >
                  {order.customer}
                </div>
                <div style={{ fontSize: 12, color: 'var(--w40)' }}>
                  {order.phone}
                </div>
                {order.address && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--w25)',
                      marginTop: 4,
                      maxWidth: 300
                    }}
                  >
                    {order.address}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 8
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    color: 'var(--w90)',
                    fontWeight: 500
                  }}
                >
                  {formatINR(order.total)}
                </div>
                <StatusStepper
                  status={order.status}
                  onChange={(s) => {
                    if (s === 'Shipped') {
                      const tracking = window.prompt(
                        `Enter tracking / AWB number for ${order.order_ref} (optional — press OK to skip):`,
                        order.tracking_number || ''
                      )
                      updateStatus(order.id, s, tracking || undefined)
                    } else {
                      updateStatus(order.id, s)
                    }
                  }}
                />
                {order.tracking_number && (
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--gold)',
                      marginTop: 4,
                      letterSpacing: '0.06em'
                    }}
                  >
                    📦 {order.tracking_number}
                  </div>
                )}
              </div>
            </div>
            {order.items && order.items.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '0.5px solid var(--w06)'
                }}
              >
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      color: 'var(--w40)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 2
                    }}
                  >
                    <span>
                      {item.brand} {item.name} ({item.size}) ×{item.qty}
                    </span>
                    <span style={{ color: 'var(--w55)' }}>
                      {formatINR(item.price * item.qty)}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: '0.5px solid var(--w04)',
                    fontSize: 11,
                    color: 'var(--w25)'
                  }}
                >
                  <span>
                    Shipping:{' '}
                    {order.shipping === 0 ? 'Free' : formatINR(order.shipping)}
                  </span>
                  <span>Subtotal: {formatINR(order.subtotal)}</span>
                </div>
              </div>
            )}
          </div>
        ))
      )}
      {!loading && filtered.length === 0 && (
        <div
          style={{
            color: 'var(--w25)',
            padding: '3rem',
            textAlign: 'center'
          }}
        >
          No orders found
        </div>
      )}
    </div>
  )
}

// ── All fragrance accords ─────────────────────────────────────────
const ACCORDS = [
  'Oud',
  'Woody',
  'Smoky',
  'Leather',
  'Tobacco',
  'Earthy',
  'Mossy',
  'Vetiver',
  'Vanilla',
  'Amber',
  'Caramel',
  'Honey',
  'Gourmand',
  'Sweet',
  'Chocolate',
  'Coffee',
  'Rose',
  'Jasmine',
  'Floral',
  'Iris',
  'Peony',
  'Tuberose',
  'Neroli',
  'Orange Blossom',
  'Citrus',
  'Bergamot',
  'Lemon',
  'Orange',
  'Grapefruit',
  'Lime',
  'Mandarin',
  'Fresh',
  'Aquatic',
  'Marine',
  'Ozonic',
  'Clean',
  'Powdery',
  'Soapy',
  'Spicy',
  'Pepper',
  'Cardamom',
  'Saffron',
  'Cinnamon',
  'Clove',
  'Incense',
  'Sandalwood',
  'Cedar',
  'Pine',
  'Patchouli',
  'Musk',
  'White Musk',
  'Animalic',
  'Fruity',
  'Peach',
  'Berries',
  'Coconut',
  'Tropical',
  'Green',
  'Herbal',
  'Lavender'
]

// ── Brand → Category mapping ─────────────────────────────────────
const BRAND_CATEGORY = {
  // Niche
  Amouage: 'niche',
  Xerjoff: 'niche',
  Creed: 'niche',
  'Tom Ford': 'niche',
  'Maison Margiela': 'niche',
  Initio: 'niche',
  'Roja Parfums': 'niche',
  'Parfums de Marly': 'niche',
  "Penhaligon's": 'niche',
  'Memo Paris': 'niche',
  Mancera: 'niche',
  Montale: 'niche',
  Nishane: 'niche',
  'Orto Parisi': 'niche',
  Nasomatto: 'niche',
  'Serge Lutens': 'niche',
  'Maison Crivelli': 'niche',
  'Ramon Monegal': 'niche',
  Sospiro: 'niche',
  Thameen: 'niche',
  Mizensir: 'niche',
  'Matiere Premiere': 'niche',
  'Ormonde Jayne': 'niche',
  'Rosendo Mateu': 'niche',
  'Maison Margiela': 'niche',
  'Maison Margiela Replica': 'niche',
  'Pantheon Roma': 'niche',
  'Mind Games': 'niche',
  'Paris Corner': 'niche',
  'Oman Luxury': 'niche',
  Omanluxury: 'niche',
  'The Spirit of Dubai': 'niche',
  'Marc-Antoine Barrois': 'niche',
  'Marc Antonnie Barrois': 'niche',

  // Designer
  Dior: 'designer',
  Chanel: 'designer',
  YSL: 'designer',
  'Yves Saint Laurent': 'designer',
  Versace: 'designer',
  Prada: 'designer',
  'Giorgio Armani': 'designer',
  Armani: 'designer',
  Gucci: 'designer',
  Burberry: 'designer',
  'Hugo Boss': 'designer',
  'Calvin Klein': 'designer',
  'Dolce & Gabbana': 'designer',
  Givenchy: 'designer',
  Hermes: 'designer',
  Hermès: 'designer',
  Valentino: 'designer',
  Bvlgari: 'designer',
  Bulgari: 'designer',
  Cartier: 'designer',
  Guerlain: 'designer',
  Lancome: 'designer',
  Lancôme: 'designer',
  'Thierry Mugler': 'designer',
  Mugler: 'designer',
  'Jean Paul Gaultier': 'designer',
  'Issey Miyake': 'designer',
  'Narciso Rodriguez': 'designer',
  'Marc Jacobs': 'designer',
  Coach: 'designer',
  'Michael Kors': 'designer',
  'Ralph Lauren': 'designer',
  Polo: 'designer',

  // Middle Eastern / Dupes
  Lattafa: 'dupe',
  Rasasi: 'dupe',
  Armaf: 'dupe',
  Afnan: 'dupe',
  Zimaya: 'dupe',
  'Fragrance World': 'dupe',
  'French Avenue': 'dupe',
  Rayhaan: 'dupe',
  'Al Haramain': 'dupe',
  'Swiss Arabian': 'dupe',
  'Ard Al Zaafaran': 'dupe',
  Ajmal: 'dupe',
  Nabeel: 'dupe',
  Surrati: 'dupe',
  Khadlaj: 'dupe',
  'Maison Alhambra': 'dupe',
  Emper: 'dupe',
  Pendora: 'dupe',
  'Ahmed Al Maghribi': 'dupe',
  Alhambra: 'dupe',
  'Paris Corner': 'dupe',
  Milestone: 'dupe',
  Johnwin: 'dupe',
  Sapil: 'dupe',
  Asdaaf: 'dupe',
  'Al Fares': 'dupe',
  Rio: 'dupe',
  Riiffs: 'dupe',
  Bharara: 'dupe',
  'Fa Paris': 'dupe',
  'Gulf Orchid': 'dupe'
}

// Searchable brand dropdown with add-new
function BrandSelect({ value, onChange, allBrands, onCategoryChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [brands, setBrands] = useState(allBrands)
  const ref = React.useRef(null)

  // Sync external brands list
  React.useEffect(() => {
    setBrands(allBrands)
  }, [allBrands])

  // Close on outside click
  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = brands.filter((b) =>
    b.toLowerCase().includes(query.toLowerCase())
  )
  const canAdd =
    query.trim() &&
    !brands.find((b) => b.toLowerCase() === query.trim().toLowerCase())

  const select = (brand) => {
    onChange(brand)
    // Auto-set category based on brand
    const cat = BRAND_CATEGORY[brand]
    if (cat && onCategoryChange) onCategoryChange(cat)
    setQuery('')
    setOpen(false)
  }
  const addNew = () => {
    const newBrand = query.trim()
    setBrands((prev) => [...new Set([...prev, newBrand])].sort())
    select(newBrand) // will default to niche if not in map
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => {
          setOpen((o) => !o)
          setQuery('')
        }}
        style={{
          ...S_modal.inp,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <span
          style={{
            color: value ? 'var(--w90)' : 'var(--w30)'
          }}
        >
          {value || 'Select brand...'}
        </span>
        <span style={{ color: 'var(--w30)', fontSize: 10 }}>
          {open ? '▲' : '▼'}
        </span>
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 400,
            background: 'var(--bg4)',
            border: '0.5px solid var(--gold-30)',
            borderRadius: 6,
            marginTop: 4,
            maxHeight: 240,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div
            style={{
              padding: '8px 10px',
              borderBottom: '0.5px solid var(--w06)'
            }}
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search or type new brand...'
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--w90)',
                fontSize: 13,
                fontFamily: 'var(--ff-sans)'
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {canAdd && (
              <div
                onClick={addNew}
                style={{
                  padding: '9px 12px',
                  fontSize: 12,
                  color: 'var(--green-txt)',
                  cursor: 'pointer',
                  borderBottom: '0.5px solid var(--w04)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>+</span> Add "{query.trim()}"
              </div>
            )}
            {filtered.length === 0 && !canAdd && (
              <div
                style={{
                  padding: '12px',
                  fontSize: 12,
                  color: 'var(--w30)',
                  textAlign: 'center'
                }}
              >
                No brands found
              </div>
            )}
            {filtered.map((b) => (
              <div
                key={b}
                onClick={() => select(b)}
                style={{
                  padding: '9px 12px',
                  fontSize: 13,
                  color: b === value ? '#b09060' : 'var(--w75)',
                  cursor: 'pointer',
                  background: b === value ? 'var(--gold-08)' : 'none'
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--w05)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    b === value ? 'var(--gold-08)' : 'none')
                }
              >
                {b}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Multi-select notes/accords picker
function NotesSelect({ value, onChange }) {
  // value is a string like "Fresh · Ozonic · Vibrant"
  const selected = value ? value.split(' · ').filter(Boolean) : []
  const [search, setSearch] = useState('')

  const toggle = (accord) => {
    const newSelected = selected.includes(accord)
      ? selected.filter((a) => a !== accord)
      : [...selected, accord]
    onChange(newSelected.join(' · '))
  }

  const filtered = ACCORDS.filter((a) =>
    a.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Selected pills */}
      {selected.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 10
          }}
        >
          {selected.map((a) => (
            <span
              key={a}
              onClick={() => toggle(a)}
              style={{
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 20,
                background: 'rgba(176,144,96,0.18)',
                border: '0.5px solid var(--gold-40)',
                color: '#b09060',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              {a} <span style={{ fontSize: 10, opacity: 0.7 }}>×</span>
            </span>
          ))}
          <span
            style={{
              fontSize: 11,
              color: 'var(--w25)',
              padding: '3px 0',
              alignSelf: 'center'
            }}
          >
            → {value}
          </span>
        </div>
      )}
      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder='Search accords...'
        style={{ ...S_modal.inp, marginBottom: 8, fontSize: 12 }}
      />
      {/* Grid of accords */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 5,
          maxHeight: 140,
          overflowY: 'auto',
          padding: '2px 0'
        }}
      >
        {filtered.map((a) => (
          <button
            key={a}
            onClick={() => toggle(a)}
            style={{
              fontSize: 11,
              padding: '4px 10px',
              borderRadius: 20,
              cursor: 'pointer',
              border: 'none',
              background: selected.includes(a)
                ? 'var(--gold-20)'
                : 'var(--w05)',
              color: selected.includes(a) ? '#b09060' : 'var(--w50)',
              outline: selected.includes(a)
                ? '0.5px solid var(--gold-40)'
                : '0.5px solid var(--w08)',
              fontFamily: 'var(--ff-sans)'
            }}
          >
            {a}
          </button>
        ))}
      </div>
    </div>
  )
}

const S_modal = {
  inp: {
    width: '100%',
    boxSizing: 'border-box',
    background: 'var(--bg3)',
    border: '0.5px solid var(--w12)',
    borderRadius: 6,
    padding: '10px 12px',
    fontFamily: 'var(--ff-sans)',
    fontSize: 13,
    color: 'var(--w90)',
    outline: 'none'
  }
}

// ── PRODUCTS TAB ─────────────────────────────────────────────────────────────
function ProductsTab() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState([]) // parsed preview rows
  const [importErrors, setImportErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(null) // { created, skipped }
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }
  const [form, setForm] = useState({
    brand: '',
    name: '',
    notes: '',
    category: 'niche',
    paid_amount: '',
    bottle_ml: '',
    ml_remaining: '',
    margin: Math.round(DEFAULT_MARGIN * 100),
    p5: 0,
    p10: 0,
    p20: 0,
    p30: 0,
    image_url: '',
    mrp: null
  })
  const [editId, setEditId] = useState(null)
  const [allBrands, setAllBrands] = useState([])
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    fetch('/api/products?admin=1')
      .then((r) => r.json())
      .then((d) => {
        const prods = Array.isArray(d) ? d : []
        setProducts(prods)
        setAllBrands([...new Set(prods.map((p) => p.brand))].sort())
        setLoading(false)
      })
  }, [])

  const recalc = (paid, ml, marginPct) => {
    const m = marginPct !== undefined ? marginPct : form.margin
    if (paid && ml) {
      const { p5, p10, p20, p30 } = calcPrices(
        Number(paid),
        Number(ml),
        Number(m) / 100
      )
      setForm((f) => ({ ...f, p5, p10, p20, p30, _autoCalc: true }))
    }
  }

  const saveProduct = async () => {
    if (!form.brand || !form.name) return
    setSaving(true)
    const payload = {
      brand: form.brand,
      name: form.name,
      notes: form.notes || '',
      category: form.category || 'niche',
      p5: Number(form.p5) || 0,
      p10: Number(form.p10) || 0,
      p20: Number(form.p20) || 0,
      image_url: form.image_url || null,
      paid_amount: form.paid_amount ? Number(form.paid_amount) : null,
      bottle_ml: form.bottle_ml ? Number(form.bottle_ml) : null,
      ml_remaining:
        form.ml_remaining !== '' && form.ml_remaining !== null
          ? Number(form.ml_remaining)
          : form.bottle_ml
            ? Math.max(0, Number(form.bottle_ml) - 10)
            : null
    }
    if (editId) {
      const currentEditId = editId // capture before any state change
      const r = await fetch(`/api/products/${currentEditId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!r.ok) {
        const err = await r.json()
        setSaving(false)
        showToast(
          'Save failed: ' + (err.error?.message || JSON.stringify(err)),
          'error'
        )
        return
      }
      const updated = await r.json()
      if (updated && updated.id) {
        setProducts((p) =>
          p.map((x) => (x.id === currentEditId ? { ...x, ...updated } : x))
        )
      }
      setSaving(false)
      showToast(`${form.brand} ${form.name} updated`)
      setEditId(null)
      setShowAdd(false)
      setForm({
        brand: '',
        name: '',
        notes: '',
        category: 'niche',
        paid_amount: '',
        bottle_ml: '',
        margin: 3,
        p5: 0,
        p10: 0,
        p20: 0,
        p30: 0,
        image_url: '',
        mrp: null
      })
    } else {
      const r = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!r.ok) {
        const err = await r.json()
        setSaving(false)
        showToast(
          'Create failed: ' + (err.error?.message || JSON.stringify(err)),
          'error'
        )
        return
      }
      const created = await r.json()
      if (created && created.id) setProducts((p) => [created, ...p])
      setSaving(false)
      showToast(`${form.brand} ${form.name} added`)
      setShowAdd(false)
      setForm({
        brand: '',
        name: '',
        notes: '',
        category: 'niche',
        paid_amount: '',
        bottle_ml: '',
        margin: 3,
        p5: 0,
        p10: 0,
        p20: 0,
        p30: 0,
        image_url: '',
        mrp: null
      })
    }
  }

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    setProducts((p) => p.filter((x) => x.id !== id))
  }

  const toggleSoldOut = async (p) => {
    const r = await fetch(`/api/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sold_out: !p.sold_out })
    })
    const updated = await r.json()
    setProducts((ps) =>
      ps.map((x) => (x.id === p.id ? { ...x, ...updated } : x))
    )
  }

  const toggleIsNew = async (p) => {
    const markingNew = !p.is_new
    // If marking as new, also make visible — can't show in New Arrivals if hidden
    const patch = { is_new: markingNew }
    if (markingNew && !p.visible) patch.visible = true

    const r = await fetch(`/api/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    })
    const updated = await r.json()
    setProducts((ps) =>
      ps.map((x) => (x.id === p.id ? { ...x, ...updated } : x))
    )
    if (markingNew && !p.visible) {
      showToast(`${p.brand} ${p.name} marked New + made visible`)
    }
  }

  const startEdit = (p) => {
    setForm({
      brand: p.brand || '',
      name: p.name || '',
      notes: p.notes || '',
      category: p.category || 'niche',
      paid_amount: p.paid_amount != null ? String(p.paid_amount) : '',
      bottle_ml: p.bottle_ml != null ? String(p.bottle_ml) : '',
      ml_remaining: p.ml_remaining != null ? String(p.ml_remaining) : '',
      p5: p.p5 != null ? p.p5 : 0,
      p10: p.p10 != null ? p.p10 : 0,
      p20: p.p20 != null ? p.p20 : 0,
      p30: p.p30 != null ? p.p30 : 0,
      margin: p.margin != null ? p.margin : 3,
      image_url: p.image_url || '',
      mrp: p.mrp != null ? p.mrp : null
    })
    setEditId(p.id)
    setShowAdd(true)
  }

  // ── Excel Import ──────────────────────────────────────────────────
  const downloadTemplate = () => {
    // CSV template with headers + one example row
    const headers = [
      'brand',
      'name',
      'category',
      'notes',
      'paid_amount',
      'bottle_ml',
      'ml_remaining',
      'margin_pct',
      'p5',
      'p10',
      'p20',
      'p30',
      'mrp'
    ]
    const example = [
      'Xerjoff',
      'Naxos',
      'niche',
      'Tobacco Vanilla Honey',
      '18000',
      '100',
      '90',
      '5',
      '',
      '',
      '',
      '',
      '35000'
    ]
    const hint = [
      '# Brand name',
      '# Fragrance name',
      '# niche / designer / dupe',
      '# Main notes (comma separated)',
      '# What you paid for the bottle (₹)',
      '# Bottle size in ml',
      '# How much is left to sell (leave blank = bottle_ml - 10)',
      '# Your margin % (leave blank = 3)',
      '# 5ml price (leave blank to auto-calc)',
      '# 10ml price',
      '# 20ml price',
      '# 30ml price',
      '# Full bottle MRP (optional)'
    ]
    const csv = [hint.join(','), headers.join(','), example.join(',')].join(
      '\r\n'
    )
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'scent_snob_products_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const parseFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const lines = text
        .split(/\r?\n/)
        .filter((l) => l.trim() && !l.trim().startsWith('#'))
      if (lines.length < 2) {
        setImportErrors(['File appears empty or has no data rows'])
        return
      }

      const headers = lines[0]
        .split(',')
        .map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
      const rows = []
      const errs = []

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim())
        if (cols.every((c) => !c)) continue // skip blank lines
        const row = {}
        headers.forEach((h, idx) => {
          row[h] = cols[idx] || ''
        })

        // Validate mandatory fields
        const rowErrs = []
        if (!row.brand) rowErrs.push('brand required')
        if (!row.name) rowErrs.push('name required')
        if (!row.ml_remaining && !row.bottle_ml)
          rowErrs.push('either ml_remaining or bottle_ml required')
        if (!row.p5 && !row.p10 && !row.paid_amount)
          rowErrs.push(
            'either prices (p5/p10) or paid_amount needed to calculate prices'
          )

        if (rowErrs.length) {
          errs.push(
            `Row ${i + 1} (${row.brand} ${row.name}): ${rowErrs.join(', ')}`
          )
          continue
        }

        // Build product payload
        const paidAmt = Number(row.paid_amount) || 0
        const bottleMl = Number(row.bottle_ml) || 0
        const marginPct =
          row.margin_pct !== '' ? Number(row.margin_pct) / 100 : 0.03

        let { p5, p10, p20, p30 } = { p5: 0, p10: 0, p20: 0, p30: 0 }
        if (paidAmt && bottleMl) {
          const calc = calcPrices(paidAmt, bottleMl, marginPct)
          p5 = calc.p5
          p10 = calc.p10
          p20 = calc.p20
          p30 = calc.p30
        }
        // Manual overrides
        if (row.p5) p5 = Number(row.p5)
        if (row.p10) p10 = Number(row.p10)
        if (row.p20) p20 = Number(row.p20)
        if (row.p30) p30 = Number(row.p30)

        const mlRemaining =
          row.ml_remaining !== ''
            ? Number(row.ml_remaining)
            : bottleMl
              ? Math.max(0, bottleMl - 10)
              : null

        rows.push({
          brand: row.brand,
          name: row.name,
          category: row.category || 'niche',
          notes: row.notes || '',
          paid_amount: paidAmt || null,
          bottle_ml: bottleMl || null,
          ml_remaining: mlRemaining,
          p5,
          p10,
          p20,
          p30,
          mrp: row.mrp ? Number(row.mrp) : null,
          visible: false // start hidden, you decide when to publish
        })
      }

      setImportRows(rows)
      setImportErrors(errs)
      setImportDone(null)
    }
    reader.readAsText(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) parseFile(file)
  }

  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })

  const runImport = async () => {
    if (!importRows.length) return
    setImporting(true)

    const toImport = importRows.filter(
      (row) =>
        !products.some(
          (p) =>
            p.brand.toLowerCase() === row.brand.toLowerCase() &&
            p.name.toLowerCase() === row.name.toLowerCase()
        )
    )
    const skipped = importRows.length - toImport.length
    setImportProgress({ done: 0, total: toImport.length })

    // Batch in groups of 5 parallel, 8s timeout each
    const BATCH = 5
    let created = 0
    const newProducts = []

    for (let i = 0; i < toImport.length; i += BATCH) {
      const batch = toImport.slice(i, i + BATCH)
      const results = await Promise.allSettled(
        batch.map((row) =>
          Promise.race([
            fetch('/api/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(row)
            }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 8000)
            )
          ])
        )
      )
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value?.id) {
          newProducts.push(result.value)
          created++
        }
      }
      setImportProgress({
        done: Math.min(i + BATCH, toImport.length),
        total: toImport.length
      })
    }

    if (newProducts.length) setProducts((ps) => [...ps, ...newProducts])
    setImportDone({ created, skipped })
    setImporting(false)
    setImportRows([])
    setImportProgress({ done: 0, total: 0 })
  }
  // ── End Excel Import ──────────────────────────────────────────────

  const [sortBy, setSortBy] = useState('brand') // brand | name | p10 | ml_remaining | status
  const [sortDir, setSortDir] = useState('asc')

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(key)
      setSortDir('asc')
    }
  }

  const filtered = products
    .filter(
      (p) =>
        !search ||
        `${p.brand} ${p.name}`.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let av, bv
      switch (sortBy) {
        case 'brand':
          av = `${a.brand} ${a.name}`
          bv = `${b.brand} ${b.name}`
          break
        case 'name':
          av = a.name
          bv = b.name
          break
        case 'p10':
          av = a.p10 || 0
          bv = b.p10 || 0
          break
        case 'ml_remaining':
          av = a.ml_remaining ?? 9999
          bv = b.ml_remaining ?? 9999
          break
        case 'status':
          av = a.sold_out ? 1 : 0
          bv = b.sold_out ? 1 : 0
          break
        case 'category':
          av = a.category || ''
          bv = b.category || ''
          break
        default:
          av = a.brand
          bv = b.brand
      }
      if (typeof av === 'string')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? av - bv : bv - av
    })

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          gap: 10
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search products...'
          style={{ ...S.inp, maxWidth: 300 }}
        />

        {/* Sort controls */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          {[
            { key: 'brand', label: 'Brand' },
            { key: 'name', label: 'Name' },
            { key: 'category', label: 'Type' },
            { key: 'p10', label: '10ml ₹' },
            { key: 'ml_remaining', label: 'Stock' },
            { key: 'status', label: 'Status' }
          ].map(({ key, label }) => {
            const active = sortBy === key
            return (
              <button
                key={key}
                onClick={() => toggleSort(key)}
                style={{
                  ...S.btn,
                  fontSize: 10,
                  padding: '3px 9px',
                  background: active ? 'var(--gold-12)' : 'var(--w06)',
                  border: `0.5px solid ${active ? 'var(--gold-30)' : 'var(--w10)'}`,
                  color: active ? 'var(--gold)' : 'var(--t3)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3
                }}
              >
                {label}
                {active && (
                  <span style={{ fontSize: 9 }}>
                    {sortDir === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            fontSize: 11,
            color: 'var(--w30)',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <span>{products.filter((p) => !p.sold_out).length} live</span>
          <span style={{ color: 'rgba(220,80,80,0.6)' }}>
            {products.filter((p) => p.sold_out).length} sold out
          </span>
        </div>
        <button
          onClick={() => {
            setShowAdd((s) => !s)
            setEditId(null)
            setForm({
              brand: '',
              name: '',
              notes: '',
              category: 'niche',
              paid_amount: '',
              bottle_ml: '',
              p5: 0,
              p10: 0,
              p20: 0,
              image_url: '',
              mrp: null
            })
          }}
          style={{
            ...S.btn,
            background: '#b09060',
            color: '#fff',
            padding: '8px 18px',
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            flexShrink: 0
          }}
        >
          {showAdd ? 'Cancel' : '+ Add Product'}
        </button>
        <button
          onClick={() => {
            setShowImport(true)
            setImportRows([])
            setImportErrors([])
            setImportDone(null)
          }}
          style={{
            ...S.btn,
            background: 'var(--w08)',
            border: '0.5px solid var(--w15)',
            color: 'var(--t2)',
            padding: '8px 16px',
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            flexShrink: 0
          }}
        >
          ⬆ Import Excel
        </button>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '2rem 1rem',
            overflowY: 'auto'
          }}
          onClick={() => setShowImport(false)}
        >
          <div
            style={{
              background: 'var(--bg2)',
              border: '0.5px solid var(--gold-25)',
              borderRadius: 10,
              padding: '1.75rem',
              width: '100%',
              maxWidth: 660,
              marginBottom: '2rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 20
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--gold)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    marginBottom: 4
                  }}
                >
                  Import Products from CSV / Excel
                </div>
                <div
                  style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.6 }}
                >
                  Upload a .csv file. New products are added as hidden — you
                  decide when to make them visible.
                  <br />
                  Duplicates (same brand + name) are skipped automatically.
                </div>
              </div>
              <button
                onClick={() => setShowImport(false)}
                style={{
                  ...S.btn,
                  background: 'var(--w08)',
                  border: '0.5px solid var(--w12)',
                  color: 'var(--t2)',
                  width: 28,
                  height: 28,
                  padding: 0,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                  flexShrink: 0
                }}
              >
                ×
              </button>
            </div>

            {/* Template download */}
            <div
              style={{
                background: 'var(--gold-05)',
                border: '0.5px solid var(--gold-15)',
                borderRadius: 6,
                padding: '12px 14px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--gold)',
                    fontWeight: 600,
                    marginBottom: 2
                  }}
                >
                  📋 Download Template
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                  CSV with all fields + example row + column hints
                </div>
              </div>
              <button
                onClick={downloadTemplate}
                style={{
                  ...S.btn,
                  background: 'var(--gold)',
                  color: '#fff',
                  padding: '7px 16px',
                  fontSize: 12,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  flexShrink: 0
                }}
              >
                Download
              </button>
            </div>

            {/* Required fields callout */}
            <div
              style={{
                background: 'var(--bg3)',
                border: '0.5px solid var(--w10)',
                borderRadius: 6,
                padding: '12px 14px',
                marginBottom: 16
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--gold)',
                  fontWeight: 600,
                  marginBottom: 8,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}
              >
                Mandatory columns
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { col: 'brand', desc: 'Brand name e.g. Xerjoff' },
                  { col: 'name', desc: 'Fragrance name e.g. Naxos' },
                  {
                    col: 'bottle_ml OR ml_remaining',
                    desc: 'How much liquid you have'
                  },
                  {
                    col: 'paid_amount OR p5+p10',
                    desc: 'Either what you paid (auto-calculates prices) or manual prices'
                  }
                ].map(({ col, desc }) => (
                  <div
                    key={col}
                    style={{
                      background: 'var(--w06)',
                      border: '0.5px solid var(--gold-15)',
                      borderRadius: 4,
                      padding: '4px 10px'
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--gold)',
                        fontWeight: 600,
                        fontFamily: 'monospace'
                      }}
                    >
                      {col}
                    </div>
                    <div
                      style={{ fontSize: 10, color: 'var(--t3)', marginTop: 1 }}
                    >
                      {desc}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--t3)',
                  marginTop: 10,
                  lineHeight: 1.7
                }}
              >
                <strong style={{ color: 'var(--t2)' }}>Optional:</strong>{' '}
                category (niche/designer/dupe), notes, margin_pct, p5, p10, p20,
                p30, mrp
                <br />
                <strong style={{ color: 'var(--t2)' }}>
                  category default:
                </strong>{' '}
                niche &nbsp;|&nbsp;{' '}
                <strong style={{ color: 'var(--t2)' }}>
                  margin_pct default:
                </strong>{' '}
                3 &nbsp;|&nbsp;{' '}
                <strong style={{ color: 'var(--t2)' }}>
                  ml_remaining default:
                </strong>{' '}
                bottle_ml − 10
              </div>
            </div>

            {/* Drop zone */}
            {!importRows.length && !importDone && (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--gold)' : 'var(--w15)'}`,
                  borderRadius: 8,
                  padding: '2.5rem',
                  textAlign: 'center',
                  background: dragOver ? 'var(--gold-04)' : 'var(--bg3)',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  marginBottom: 16
                }}
                onClick={() => document.getElementById('excel-upload').click()}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                <div
                  style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 4 }}
                >
                  Drag & drop your CSV here
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                  or click to browse
                </div>
                <input
                  id='excel-upload'
                  type='file'
                  accept='.csv,.xlsx,.xls'
                  style={{ display: 'none' }}
                  onChange={handleFileInput}
                />
              </div>
            )}

            {/* Validation errors */}
            {importErrors.length > 0 && (
              <div
                style={{
                  background: 'var(--red-bg)',
                  border: '0.5px solid var(--red-br)',
                  borderRadius: 6,
                  padding: '10px 14px',
                  marginBottom: 14
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--red)',
                    fontWeight: 600,
                    marginBottom: 6
                  }}
                >
                  ⚠ {importErrors.length} row
                  {importErrors.length > 1 ? 's' : ''} had issues and will be
                  skipped:
                </div>
                {importErrors.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 11,
                      color: 'var(--red)',
                      marginBottom: 2
                    }}
                  >
                    • {e}
                  </div>
                ))}
              </div>
            )}

            {/* Preview table */}
            {importRows.length > 0 && !importDone && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--gold)',
                    fontWeight: 600,
                    marginBottom: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase'
                  }}
                >
                  Preview — {importRows.length} product
                  {importRows.length > 1 ? 's' : ''} ready to import
                </div>
                <div
                  style={{
                    border: '0.5px solid var(--w10)',
                    borderRadius: 6,
                    overflow: 'hidden',
                    maxHeight: 280,
                    overflowY: 'auto'
                  }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 11
                    }}
                  >
                    <thead>
                      <tr style={{ background: 'var(--bg4)' }}>
                        {[
                          'Brand',
                          'Name',
                          'Category',
                          'ml Left',
                          '5ml',
                          '10ml',
                          '20ml',
                          'Visible'
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: '6px 10px',
                              textAlign: 'left',
                              color: 'var(--t3)',
                              fontWeight: 600,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              fontSize: 9,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((row, i) => {
                        const exists = products.some(
                          (p) =>
                            p.brand.toLowerCase() === row.brand.toLowerCase() &&
                            p.name.toLowerCase() === row.name.toLowerCase()
                        )
                        return (
                          <tr
                            key={i}
                            style={{
                              borderBottom: '0.5px solid var(--w06)',
                              background: exists
                                ? 'var(--red-bg)'
                                : 'transparent'
                            }}
                          >
                            <td
                              style={{
                                padding: '6px 10px',
                                color: 'var(--gold)',
                                fontWeight: 600
                              }}
                            >
                              {row.brand}
                            </td>
                            <td
                              style={{
                                padding: '6px 10px',
                                color: 'var(--t1)'
                              }}
                            >
                              {row.name}{' '}
                              {exists && (
                                <span
                                  style={{ fontSize: 9, color: 'var(--red)' }}
                                >
                                  (exists — will skip)
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                padding: '6px 10px',
                                color: 'var(--t3)'
                              }}
                            >
                              {row.category}
                            </td>
                            <td
                              style={{
                                padding: '6px 10px',
                                color:
                                  row.ml_remaining <= 15
                                    ? 'var(--red)'
                                    : 'var(--t2)'
                              }}
                            >
                              {row.ml_remaining ?? '—'}ml
                            </td>
                            <td
                              style={{
                                padding: '6px 10px',
                                color: 'var(--t2)'
                              }}
                            >
                              ₹{row.p5 || '—'}
                            </td>
                            <td
                              style={{
                                padding: '6px 10px',
                                color: 'var(--t2)'
                              }}
                            >
                              ₹{row.p10 || '—'}
                            </td>
                            <td
                              style={{
                                padding: '6px 10px',
                                color: 'var(--t2)'
                              }}
                            >
                              ₹{row.p20 || '—'}
                            </td>
                            <td
                              style={{
                                padding: '6px 10px',
                                color: 'var(--t3)'
                              }}
                            >
                              Hidden
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {importing && importProgress.total > 0 && (
                  <div style={{ marginTop: 12, marginBottom: 4 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 10,
                        color: 'var(--t3)',
                        marginBottom: 5,
                        letterSpacing: '0.06em'
                      }}
                    >
                      <span>Importing in batches of 5...</span>
                      <span>
                        {importProgress.done} / {importProgress.total}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: 'var(--w08)',
                        borderRadius: 2
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 2,
                          background: 'var(--gold)',
                          width: `${Math.round((importProgress.done / importProgress.total) * 100)}%`,
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button
                    onClick={runImport}
                    disabled={importing}
                    style={{
                      ...S.btn,
                      background: importing
                        ? 'rgba(176,144,96,0.6)'
                        : 'var(--gold)',
                      color: '#fff',
                      padding: '10px 0',
                      fontSize: 13,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      flex: 1,
                      cursor: importing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    {importing ? (
                      <>
                        <Spinner size={14} color='#fff' />
                        {importProgress.total > 0
                          ? `${importProgress.done} / ${importProgress.total} done...`
                          : 'Starting...'}
                      </>
                    ) : (
                      `✓ Import ${importRows.filter((r) => !products.some((p) => p.brand.toLowerCase() === r.brand.toLowerCase() && p.name.toLowerCase() === r.name.toLowerCase())).length} Products`
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setImportRows([])
                      setImportErrors([])
                    }}
                    style={{
                      ...S.btn,
                      background: 'var(--w08)',
                      border: '0.5px solid var(--w15)',
                      color: 'var(--t2)',
                      padding: '10px 20px',
                      fontSize: 13
                    }}
                  >
                    Re-upload
                  </button>
                </div>
              </div>
            )}

            {/* Success */}
            {importDone && (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                <div
                  style={{ fontSize: 16, color: 'var(--t1)', marginBottom: 6 }}
                >
                  Import complete
                </div>
                <div
                  style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 20 }}
                >
                  {importDone.created} product
                  {importDone.created !== 1 ? 's' : ''} added ·{' '}
                  {importDone.skipped} skipped
                </div>
                <div
                  style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 20 }}
                >
                  All imported products are hidden — go to Products list to
                  review and make them visible.
                </div>
                <button
                  onClick={() => setShowImport(false)}
                  style={{
                    ...S.btn,
                    background: 'var(--gold)',
                    color: '#fff',
                    padding: '10px 28px',
                    fontSize: 13
                  }}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showAdd && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: 'var(--bg2)',
              border: '0.5px solid var(--gold-25)',
              borderRadius: 10,
              padding: '1.75rem',
              width: '100%',
              maxWidth: 680,
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--gold)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 600
                }}
              >
                {editId ? 'Edit Product' : 'New Product'}
              </div>
              <button
                onClick={() => {
                  setShowAdd(false)
                  setEditId(null)
                  setForm({
                    brand: '',
                    name: '',
                    notes: '',
                    category: 'niche',
                    paid_amount: '',
                    bottle_ml: '',
                    p5: 0,
                    p10: 0,
                    p20: 0,
                    image_url: '',
                    mrp: null
                  })
                }}
                style={{
                  ...S.btn,
                  background: 'none',
                  color: 'var(--w40)',
                  fontSize: 20,
                  padding: '0 4px',
                  border: 'none'
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                gap: 12,
                marginBottom: 12
              }}
            >
              <div>
                <label style={S.lbl}>Brand</label>
                <BrandSelect
                  value={form.brand}
                  onChange={(v) => set('brand', v)}
                  allBrands={allBrands}
                  onCategoryChange={(v) => set('category', v)}
                />
              </div>
              <div>
                <label style={S.lbl}>Name</label>
                <input
                  style={S.inp}
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder='Naxos EDP'
                />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={S.lbl}>Notes / Accords</label>
              <NotesSelect
                value={form.notes}
                onChange={(v) => set('notes', v)}
              />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                gap: 12,
                marginBottom: 12
              }}
            >
              <div>
                <label style={S.lbl}>Category</label>
                <select
                  style={S.inp}
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                >
                  <option value='niche'>Niche</option>
                  <option value='designer'>Designer</option>
                  <option value='dupe'>Dupe / Middle Eastern</option>
                </select>
              </div>
              <div>
                <label style={S.lbl}>Amount Paid (₹)</label>
                <input
                  style={S.inp}
                  type='number'
                  value={form.paid_amount}
                  placeholder='5500'
                  onChange={(e) => {
                    set('paid_amount', e.target.value)
                    recalc(e.target.value, form.bottle_ml, form.margin)
                  }}
                />
              </div>
              <div>
                <label style={S.lbl}>Bottle Size (ml)</label>
                <input
                  style={S.inp}
                  type='number'
                  value={form.bottle_ml}
                  placeholder='50'
                  onChange={(e) => {
                    const ml = e.target.value
                    set('bottle_ml', ml)
                    // Auto-set sellable ml = bottle - 10 (reserve for yourself)
                    if (ml && !form.ml_remaining) {
                      set('ml_remaining', Math.max(0, Number(ml) - 10))
                    }
                    recalc(form.paid_amount, ml, form.margin)
                  }}
                />
              </div>
              <div>
                <label style={S.lbl}>
                  Margin %
                  <span
                    style={{
                      color: 'var(--gold)',
                      fontWeight: 600,
                      marginLeft: 4
                    }}
                  >
                    {form.margin}%
                  </span>
                </label>
                <input
                  style={{ ...S.inp, color: 'var(--gold)', fontWeight: 600 }}
                  type='number'
                  min='0'
                  max='80'
                  step='1'
                  value={form.margin}
                  onChange={(e) => {
                    const m = Number(e.target.value)
                    set('margin', m)
                    recalc(form.paid_amount, form.bottle_ml, m)
                  }}
                />
              </div>
            </div>

            {/* ML Remaining */}
            {form.bottle_ml && (
              <div
                style={{
                  marginBottom: 12,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  alignItems: 'end'
                }}
              >
                <div>
                  <label style={S.lbl}>
                    ML Remaining (sellable)
                    <span
                      style={{
                        color: 'var(--w35)',
                        fontWeight: 400,
                        marginLeft: 6,
                        fontSize: 10
                      }}
                    >
                      you keep 10ml — edit if already used some
                    </span>
                  </label>
                  <input
                    style={{
                      ...S.inp,
                      color:
                        Number(form.ml_remaining) <= 10
                          ? '#dc5050'
                          : Number(form.ml_remaining) <= 30
                            ? 'var(--gold)'
                            : 'var(--green-txt)',
                      fontWeight: 600
                    }}
                    type='number'
                    min='0'
                    max={form.bottle_ml}
                    step='1'
                    value={form.ml_remaining}
                    onChange={(e) => set('ml_remaining', e.target.value)}
                    placeholder={
                      form.bottle_ml
                        ? String(Math.max(0, Number(form.bottle_ml) - 10))
                        : ''
                    }
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--w35)',
                    paddingBottom: 10,
                    lineHeight: 1.6
                  }}
                >
                  {form.bottle_ml &&
                    form.ml_remaining !== '' &&
                    (() => {
                      const ml = Number(form.ml_remaining)
                      const f5 = Math.floor(ml / 5)
                      const f10 = Math.floor(ml / 10)
                      const f20 = Math.floor(ml / 20)
                      return (
                        <span>
                          Can fill:{' '}
                          <span style={{ color: 'var(--gold)' }}>
                            {f5}×5ml · {f10}×10ml · {f20}×20ml
                          </span>
                        </span>
                      )
                    })()}
                </div>
              </div>
            )}

            {/* Price fields — gold tint, user can override */}
            <div
              style={{
                background: 'var(--gold-04)',
                border: '0.5px solid var(--gold-12)',
                borderRadius: 6,
                padding: '12px',
                marginBottom: 12
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--gold)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 10
                }}
              >
                Selling Prices — auto-calculated, override if needed
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 12
                }}
              >
                {[
                  ['p5', '5ml'],
                  ['p10', '10ml'],
                  ['p20', '20ml'],
                  ['p30', '30ml']
                ].map(([k, l]) => (
                  <div key={k}>
                    <label style={S.lbl}>{l} Price (₹)</label>
                    <input
                      style={{ ...S.inp, color: '#b09060', fontWeight: 500 }}
                      type='number'
                      value={form[k]}
                      onChange={(e) => set(k, Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 12
              }}
            >
              <div>
                <label style={S.lbl}>
                  MRP — Full Bottle (₹){' '}
                  <span style={{ color: 'var(--w25)', fontWeight: 400 }}>
                    optional
                  </span>
                </label>
                <input
                  style={S.inp}
                  type='number'
                  value={form.mrp || ''}
                  onChange={(e) =>
                    set('mrp', e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder='e.g. 31999'
                />
              </div>
              <div>
                <label style={S.lbl}>Image URL (Cloudinary)</label>
                <input
                  style={S.inp}
                  value={form.image_url}
                  onChange={(e) => set('image_url', e.target.value)}
                  placeholder='https://res.cloudinary.com/...'
                />
              </div>
            </div>

            <div
              style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}
            >
              <button
                onClick={() => {
                  setShowAdd(false)
                  setEditId(null)
                  setForm({
                    brand: '',
                    name: '',
                    notes: '',
                    category: 'niche',
                    paid_amount: '',
                    bottle_ml: '',
                    p5: 0,
                    p10: 0,
                    p20: 0,
                    image_url: '',
                    mrp: null
                  })
                }}
                style={{
                  ...S.btn,
                  background: 'var(--bg3)',
                  color: 'var(--w50)',
                  border: '0.5px solid var(--w10)',
                  padding: '9px 20px',
                  fontSize: 12
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveProduct}
                disabled={saving}
                style={{
                  ...S.btn,
                  background: saving ? 'rgba(176,144,96,0.5)' : '#b09060',
                  color: '#fff',
                  padding: '9px 24px',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {saving && <Spinner size={13} color='#fff' />}
                {saving ? 'Saving...' : editId ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SaveToast msg={toast?.msg} type={toast?.type} />

      <div
        style={{
          fontSize: 11,
          color: 'var(--w30)',
          marginBottom: 10
        }}
      >
        {filtered.length} products
      </div>

      {loading ? (
        <div style={{ color: 'var(--w30)', padding: '2rem' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((p) => (
            <div
              key={p.id}
              style={{
                ...S.card,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                opacity: p.sold_out ? 0.5 : 1
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  flex: 1,
                  minWidth: 0
                }}
              >
                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    style={{
                      width: 40,
                      height: 40,
                      objectFit: 'cover',
                      borderRadius: 4,
                      flexShrink: 0
                    }}
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--gold)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase'
                    }}
                  >
                    {p.brand}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--w85)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--w35)' }}>
                    ₹{p.p5} / ₹{p.p10} / ₹{p.p20} ·{' '}
                    <span style={{ color: 'var(--w20)' }}>{p.category}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {p.sold_out && (
                  <span
                    style={{
                      fontSize: 9,
                      color: '#dc5050',
                      border: '0.5px solid rgba(220,80,80,0.3)',
                      borderRadius: 3,
                      padding: '2px 6px',
                      letterSpacing: '0.08em'
                    }}
                  >
                    SOLD OUT
                  </span>
                )}
                {!p.sold_out &&
                  p.ml_remaining != null &&
                  p.ml_remaining <= 30 && (
                    <span
                      style={{
                        fontSize: 9,
                        color: p.ml_remaining <= 10 ? '#dc5050' : 'var(--gold)',
                        border: `0.5px solid ${p.ml_remaining <= 10 ? 'rgba(220,80,80,0.3)' : 'var(--gold-30)'}`,
                        borderRadius: 3,
                        padding: '2px 6px',
                        letterSpacing: '0.08em'
                      }}
                    >
                      {p.ml_remaining <= 10
                        ? `⚠ ${p.ml_remaining}ml left`
                        : `🟡 ${p.ml_remaining}ml left`}
                    </span>
                  )}
                {p.is_new && !p.visible && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: 'rgba(220,80,80,0.08)',
                      border: '0.5px solid rgba(220,80,80,0.25)',
                      color: '#dc5050',
                      letterSpacing: '0.06em'
                    }}
                  >
                    ⚠ Marked New but Hidden — won't show on site
                  </span>
                )}
                <button
                  onClick={() => toggleIsNew(p)}
                  title={
                    p.is_new
                      ? 'Remove from New Arrivals'
                      : 'Mark as New Arrival'
                  }
                  style={{
                    ...S.btn,
                    fontSize: 10,
                    padding: '4px 8px',
                    background: p.is_new
                      ? 'rgba(100,160,255,0.15)'
                      : 'var(--w04)',
                    color: p.is_new ? '#6aa0ff' : 'var(--w30)',
                    border: `0.5px solid ${p.is_new ? 'rgba(100,160,255,0.3)' : 'var(--w10)'}`
                  }}
                >
                  {p.is_new ? '★ New' : '☆ New'}
                </button>
                <button
                  onClick={() => toggleSoldOut(p)}
                  style={{
                    ...S.btn,
                    fontSize: 10,
                    padding: '4px 8px',
                    background: p.sold_out
                      ? 'rgba(76,175,125,0.15)'
                      : 'rgba(220,80,80,0.15)',
                    color: p.sold_out ? 'var(--green-txt)' : '#dc5050',
                    border: `0.5px solid ${p.sold_out ? 'var(--green-br)' : 'rgba(220,80,80,0.3)'}`
                  }}
                >
                  {p.sold_out ? 'Unmark' : 'Sold Out'}
                </button>
                <button
                  onClick={() => startEdit(p)}
                  style={{
                    ...S.btn,
                    fontSize: 10,
                    padding: '4px 8px',
                    background: 'var(--bg3)',
                    color: 'var(--w50)',
                    border: '0.5px solid var(--w10)'
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteProduct(p.id)}
                  style={{
                    ...S.btn,
                    fontSize: 10,
                    padding: '4px 8px',
                    background: 'rgba(220,80,80,0.1)',
                    color: '#dc5050',
                    border: '0.5px solid var(--red-br)'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── PARTIALS TAB ─────────────────────────────────────────────────────────────
function PartialsTab() {
  const [partials, setPartials] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    brand: '',
    name: '',
    notes: '',
    full_ml: '',
    ml_left: '',
    price: '',
    condition: '',
    image_url: '',
    visible: false
  })
  const [editId, setEditId] = useState(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    fetch('/api/partials')
      .then((r) => r.json())
      .then((d) => {
        setPartials(Array.isArray(d) ? d : [])
        setLoading(false)
      })
  }, [])

  const savePartial = async () => {
    if (!form.brand || !form.name) return

    // Build payload carefully — only include fields that have valid values
    const payload = {
      brand: form.brand,
      name: form.name,
      notes: form.notes || '',
      condition: form.condition || '',
      image_url: form.image_url || null,
      visible: form.visible
    }

    // Only include numeric fields if they are valid numbers
    if (form.full_ml !== '' && !isNaN(Number(form.full_ml)))
      payload.full_ml = Number(form.full_ml)
    if (form.ml_left !== '' && !isNaN(Number(form.ml_left)))
      payload.ml_left = Number(form.ml_left)
    if (form.price !== '' && !isNaN(Number(form.price)))
      payload.price = Number(form.price)

    if (editId) {
      const r = await fetch(`/api/partials/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const updated = await r.json()
      if (updated && updated.id) {
        // Merge updated fields with existing record so nothing goes missing
        setPartials((p) =>
          p.map((x) => (x.id === editId ? { ...x, ...updated } : x))
        )
      }
      setEditId(null)
    } else {
      const r = await fetch('/api/partials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, sold_out: false })
      })
      const created = await r.json()
      if (created && created.id) setPartials((p) => [...p, created])
    }
    setForm({
      brand: '',
      name: '',
      notes: '',
      full_ml: '',
      ml_left: '',
      price: '',
      condition: '',
      image_url: '',
      visible: false
    })
    setShowAdd(false)
  }

  const toggle = async (p, field) => {
    const r = await fetch(`/api/partials/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !p[field] })
    })
    const updated = await r.json()
    setPartials((ps) => ps.map((x) => (x.id === p.id ? updated : x)))
  }

  const deletePartial = async (id) => {
    if (!confirm('Delete this partial?')) return
    await fetch(`/api/partials/${id}`, { method: 'DELETE' })
    setPartials((p) => p.filter((x) => x.id !== id))
  }

  const startEdit = (p) => {
    setForm({
      brand: p.brand || '',
      name: p.name || '',
      notes: p.notes || '',
      full_ml: p.full_ml != null ? String(p.full_ml) : '',
      ml_left: p.ml_left != null ? String(p.ml_left) : '',
      price: p.price != null ? String(p.price) : '',
      condition: p.condition || '',
      image_url: p.image_url || '',
      visible: p.visible ?? false
    })
    setEditId(p.id)
    setShowAdd(true)
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--w50)' }}>
          <span style={{ color: 'var(--green-txt)' }}>
            {partials.filter((p) => p.visible).length} live
          </span>
          {' · '}
          <span>{partials.filter((p) => !p.visible).length} hidden</span>
        </div>
        <button
          onClick={() => {
            setShowAdd((s) => !s)
            setEditId(null)
            setForm({
              brand: '',
              name: '',
              notes: '',
              full_ml: '',
              ml_left: '',
              price: '',
              condition: '',
              image_url: '',
              visible: false
            })
          }}
          style={{
            ...S.btn,
            background: '#b09060',
            color: '#fff',
            padding: '8px 18px',
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase'
          }}
        >
          {showAdd ? 'Cancel' : '+ Add Partial'}
        </button>
      </div>

      {showAdd && (
        <div
          style={{
            background: 'var(--gold-05)',
            border: '0.5px solid var(--gold-20)',
            borderRadius: 8,
            padding: '1.25rem',
            marginBottom: 20
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: 'var(--gold)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 14
            }}
          >
            {editId ? 'Edit Partial' : 'New Partial'}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr',
              gap: 10,
              marginBottom: 10
            }}
          >
            <div>
              <label style={S.lbl}>Brand</label>
              <input
                style={S.inp}
                value={form.brand}
                onChange={(e) => set('brand', e.target.value)}
              />
            </div>
            <div>
              <label style={S.lbl}>Name</label>
              <input
                style={S.inp}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={S.lbl}>Notes</label>
            <input
              style={S.inp}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 10,
              marginBottom: 10
            }}
          >
            <div>
              <label style={S.lbl}>Full Bottle (ml)</label>
              <input
                style={S.inp}
                type='number'
                value={form.full_ml}
                onChange={(e) => set('full_ml', e.target.value)}
              />
            </div>
            <div>
              <label style={S.lbl}>ml Remaining</label>
              <input
                style={S.inp}
                type='number'
                value={form.ml_left}
                onChange={(e) => set('ml_left', e.target.value)}
              />
            </div>
            <div>
              <label style={S.lbl}>Price (₹)</label>
              <input
                style={S.inp}
                type='number'
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={S.lbl}>Condition note</label>
            <input
              style={S.inp}
              value={form.condition}
              onChange={(e) => set('condition', e.target.value)}
              placeholder='Good condition — 40ml remaining'
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={S.lbl}>Image URL</label>
            <input
              style={S.inp}
              value={form.image_url}
              onChange={(e) => set('image_url', e.target.value)}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14
            }}
          >
            <input
              type='checkbox'
              id='vis'
              checked={form.visible}
              onChange={(e) => set('visible', e.target.checked)}
            />
            <label
              htmlFor='vis'
              style={{
                fontSize: 12,
                color: 'var(--w60)',
                cursor: 'pointer'
              }}
            >
              Make visible on site immediately
            </label>
          </div>
          <button
            onClick={savePartial}
            style={{
              ...S.btn,
              background: '#b09060',
              color: '#fff',
              padding: '9px 20px',
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}
          >
            {editId ? 'Save Changes' : 'Add Partial'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--w30)', padding: '2rem' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {partials.map((p) => {
            const mlLeft = Number(p.ml_left) || 0
            const fullMl = Number(p.full_ml) || 1
            const pct = Math.min(100, Math.round((mlLeft / fullMl) * 100))
            const color =
              pct > 50 ? 'var(--green-txt)' : pct > 25 ? '#b09060' : '#dc5050'
            return (
              <div
                key={p.id}
                style={{ ...S.card, opacity: p.sold_out ? 0.5 : 1 }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        marginBottom: 4
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--gold)',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase'
                        }}
                      >
                        {p.brand}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          padding: '1px 6px',
                          borderRadius: 2,
                          background: p.visible
                            ? 'rgba(76,175,125,0.15)'
                            : 'var(--w05)',
                          color: p.visible ? 'var(--green-txt)' : 'var(--w30)',
                          border: `0.5px solid ${p.visible ? 'var(--green-br)' : 'var(--w10)'}`
                        }}
                      >
                        {p.visible ? 'LIVE' : 'HIDDEN'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--w85)' }}>
                      {p.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 6
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: 3,
                          background: 'var(--w08)',
                          borderRadius: 2
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: color,
                            borderRadius: 2
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 10, color, fontWeight: 500 }}>
                        {mlLeft}ml ({pct}%)
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--gold)',
                          fontWeight: 500
                        }}
                      >
                        {formatINR(Number(p.price) || 0)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => toggle(p, 'visible')}
                      style={{
                        ...S.btn,
                        fontSize: 10,
                        padding: '4px 8px',
                        background: p.visible
                          ? 'rgba(220,80,80,0.1)'
                          : 'rgba(76,175,125,0.1)',
                        color: p.visible ? '#dc5050' : 'var(--green-txt)',
                        border: `0.5px solid ${p.visible ? 'var(--red-br)' : 'rgba(76,175,125,0.2)'}`
                      }}
                    >
                      {p.visible ? 'Hide' : 'Go Live'}
                    </button>
                    <button
                      onClick={() => toggle(p, 'sold_out')}
                      style={{
                        ...S.btn,
                        fontSize: 10,
                        padding: '4px 8px',
                        background: 'var(--bg3)',
                        color: 'var(--w40)',
                        border: '0.5px solid var(--w10)'
                      }}
                    >
                      {p.sold_out ? 'Unmark' : 'Sold Out'}
                    </button>
                    <button
                      onClick={() => startEdit(p)}
                      style={{
                        ...S.btn,
                        fontSize: 10,
                        padding: '4px 8px',
                        background: 'var(--bg3)',
                        color: 'var(--w40)',
                        border: '0.5px solid var(--w10)'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deletePartial(p.id)}
                      style={{
                        ...S.btn,
                        fontSize: 10,
                        padding: '4px 8px',
                        background: 'rgba(220,80,80,0.1)',
                        color: '#dc5050',
                        border: '0.5px solid var(--red-br)'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── STOCK TAB — Liquid Inventory ─────────────────────────────────────────────
const MIN_ML_TO_FULFIL = 7 // 5ml decant + 2ml headroom
const FILL_LOSS = 0.92 // 8% dead volume / spillage factor per fill

function canFill(remainingMl) {
  return {
    f5: Math.floor((remainingMl * FILL_LOSS) / 5),
    f10: Math.floor((remainingMl * FILL_LOSS) / 10),
    f20: Math.floor((remainingMl * FILL_LOSS) / 20),
    f30: Math.floor((remainingMl * FILL_LOSS) / 30)
  }
}

function StockTab() {
  const [bottles, setBottles] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editBottle, setEditBottle] = useState(null) // bottle being edited
  const [adjBottle, setAdjBottle] = useState(null) // bottle for adj modal
  const [adjType, setAdjType] = useState('use') // use | topup | spill | test | gift
  const [adjMl, setAdjMl] = useState('')
  const [adjNote, setAdjNote] = useState('')
  const [adjLog, setAdjLog] = useState([])
  const [autoLog, setAutoLog] = useState([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    brand: '',
    name: '',
    notes: '',
    start_ml: '',
    product_id: ''
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    Promise.all([
      fetch('/api/bottles').then((r) => r.json()),
      fetch('/api/products?admin=1').then((r) => r.json())
    ]).then(([b, p]) => {
      setBottles(Array.isArray(b) ? b : [])
      setProducts(Array.isArray(p) ? p : [])
      setLoading(false)
    })
  }, [])

  // Compute remaining ml from start_ml + adjustments stored on bottle
  const bottlesWithStats = bottles
    .map((b) => {
      const adjs = Array.isArray(b.adjustments) ? b.adjustments : []
      const totalAdj = adjs.reduce((sum, a) => sum + (Number(a.delta) || 0), 0)
      const remaining = Math.max(0, b.start_ml + totalAdj)
      const pct =
        b.start_ml > 0 ? Math.round((remaining / b.start_ml) * 100) : 0
      const fills = canFill(remaining)
      const canFulfil = remaining >= MIN_ML_TO_FULFIL
      const status = !canFulfil
        ? 'empty'
        : pct <= 15
          ? 'critical'
          : pct <= 35
            ? 'low'
            : 'good'
      const color = {
        empty: 'var(--w30)',
        critical: '#dc5050',
        low: 'var(--gold)',
        good: 'var(--green-txt)'
      }[status]
      const linkedProduct = products.find((p) => p.id === b.product_id)
      return {
        ...b,
        remaining,
        pct,
        fills,
        canFulfil,
        status,
        color,
        adjs,
        linkedProduct
      }
    })
    .sort((a, b) => a.pct - b.pct)

  const critical = bottlesWithStats.filter(
    (b) => b.status === 'critical' || b.status === 'empty'
  ).length

  // Auto sold-out check
  useEffect(() => {
    if (loading) return
    const log = []
    bottlesWithStats.forEach(async (b) => {
      if (!b.canFulfil && b.linkedProduct && !b.linkedProduct.sold_out) {
        await fetch(`/api/products/${b.linkedProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sold_out: true })
        })
        setProducts((ps) =>
          ps.map((p) =>
            p.id === b.linkedProduct.id ? { ...p, sold_out: true } : p
          )
        )
        log.push(
          `${b.brand} ${b.name} auto-marked sold out (${b.remaining.toFixed(0)}ml left)`
        )
      }
    })
    if (log.length) setAutoLog(log)
  }, [loading])

  const addBottle = async () => {
    if (!form.brand || !form.name || !form.start_ml) return
    setSaving(true)
    const r = await fetch('/api/bottles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: form.brand,
        name: form.name,
        notes: form.notes,
        start_ml: Number(form.start_ml),
        product_id: form.product_id || null,
        adjustments: []
      })
    })
    const created = await r.json()
    setBottles((b) => [...b, created])
    setForm({ brand: '', name: '', notes: '', start_ml: '', product_id: '' })
    setShowAdd(false)
    setSaving(false)
  }

  const deleteBottle = async (id) => {
    if (!confirm('Remove bottle from tracker?')) return
    await fetch(`/api/bottles/${id}`, { method: 'DELETE' })
    setBottles((b) => b.filter((x) => x.id !== id))
  }

  const saveAdj = async () => {
    if (!adjMl || !adjBottle) return
    const ml = Number(adjMl)
    if (isNaN(ml) || ml <= 0) return
    setSaving(true)
    const delta = adjType === 'topup' ? ml : -ml
    const entry = {
      type: adjType,
      delta,
      ml,
      note: adjNote || '',
      at: new Date().toISOString()
    }
    const bottle = bottles.find((b) => b.id === adjBottle.id)
    const adjs = [
      ...(Array.isArray(bottle.adjustments) ? bottle.adjustments : []),
      entry
    ]
    const r = await fetch(`/api/bottles/${adjBottle.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustments: adjs })
    })
    const updated = await r.json()
    setBottles((bs) => bs.map((b) => (b.id === adjBottle.id ? updated : b)))
    setAdjBottle(null)
    setAdjMl('')
    setAdjNote('')
    setAdjType('use')
    setSaving(false)
  }

  const adjTypeLabels = {
    use: {
      label: '📦 Manual Use',
      hint: 'Filled decants manually outside of orders',
      sign: '-'
    },
    topup: {
      label: '➕ Top Up',
      hint: 'Added more ml (bought new bottle of same)',
      sign: '+'
    },
    spill: {
      label: '💧 Spill/Loss',
      hint: 'Accidental loss during decanting',
      sign: '-'
    },
    test: {
      label: '🧪 Testing',
      hint: 'Used for your own testing/wearing',
      sign: '-'
    },
    gift: {
      label: '🎁 Gifted/Sample',
      hint: 'Gave away as sample or gift',
      sign: '-'
    }
  }

  return (
    <div>
      {/* Auto sold-out notice */}
      {autoLog.length > 0 && (
        <div
          style={{
            background: 'var(--gold-08)',
            border: '0.5px solid var(--gold-25)',
            borderRadius: 6,
            padding: '10px 14px',
            marginBottom: 20
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: 'var(--gold)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 6
            }}
          >
            ⚡ Auto sold-out triggered
          </div>
          {autoLog.map((msg, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--w60)' }}>
              • {msg}
            </div>
          ))}
        </div>
      )}

      {/* Header row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20
        }}
      >
        <div>
          <div
            style={{
              fontSize: 18,
              color: 'var(--w90)',
              fontFamily: 'var(--ff-serif)'
            }}
          >
            {bottles.length} bottles tracked
            {critical > 0 && (
              <span style={{ fontSize: 13, color: '#dc5050', marginLeft: 12 }}>
                ⚠ {critical} running low
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--w30)', marginTop: 4 }}>
            Auto-marks product sold out when bottle drops below{' '}
            {MIN_ML_TO_FULFIL}ml · {Math.round((1 - FILL_LOSS) * 100)}% fill
            loss factored in
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            ...S.btn,
            background: 'var(--gold)',
            color: '#fff',
            padding: '8px 18px',
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase'
          }}
        >
          + Add Bottle
        </button>
      </div>

      {/* Summary stats row */}
      {!loading &&
        bottlesWithStats.length > 0 &&
        (() => {
          const totalMl = bottlesWithStats.reduce((s, b) => s + b.remaining, 0)
          const totalF5 = bottlesWithStats.reduce((s, b) => s + b.fills.f5, 0)
          return (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4,1fr)',
                gap: 10,
                marginBottom: 20
              }}
            >
              {[
                {
                  label: 'Total ml remaining',
                  value: `${totalMl.toFixed(0)}ml`
                },
                { label: 'Can fill (5ml)', value: `${totalF5} decants` },
                {
                  label: 'Low / Critical',
                  value: `${critical} bottles`,
                  alert: critical > 0
                },
                { label: 'Fragrance lines', value: `${bottles.length}` }
              ].map(({ label, value, alert }) => (
                <div
                  key={label}
                  style={{
                    background: 'var(--bg3)',
                    border: `0.5px solid ${alert ? 'rgba(220,80,80,0.3)' : 'var(--w08)'}`,
                    borderRadius: 6,
                    padding: '10px 14px'
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: alert ? '#dc5050' : 'var(--w35)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: 4
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontFamily: 'var(--ff-serif)',
                      color: alert ? '#dc5050' : 'var(--gold)'
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

      {/* Add Bottle Modal */}
      {showAdd && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setShowAdd(false)}
        >
          <div
            style={{
              background: 'var(--bg2)',
              border: '0.5px solid var(--gold-25)',
              borderRadius: 10,
              padding: '1.75rem',
              width: '100%',
              maxWidth: 540
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--gold)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 600
                }}
              >
                Add Bottle to Inventory
              </div>
              <button
                onClick={() => setShowAdd(false)}
                style={{
                  ...S.btn,
                  background: 'var(--bg3)',
                  border: '0.5px solid var(--w12)',
                  color: 'var(--w60)',
                  width: 28,
                  height: 28,
                  padding: 0,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                gap: 10,
                marginBottom: 10
              }}
            >
              <div>
                <label style={S.lbl}>Brand</label>
                <input
                  style={S.inp}
                  value={form.brand}
                  onChange={(e) => set('brand', e.target.value)}
                  placeholder='Rasasi'
                />
              </div>
              <div>
                <label style={S.lbl}>Fragrance Name</label>
                <input
                  style={S.inp}
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder='Hawas Ice'
                />
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 10
              }}
            >
              <div>
                <label style={S.lbl}>Bottle Size (ml)</label>
                <input
                  style={S.inp}
                  type='number'
                  value={form.start_ml}
                  onChange={(e) => set('start_ml', e.target.value)}
                  placeholder='100'
                />
              </div>
              <div>
                <label style={S.lbl}>
                  Link to Product{' '}
                  <span style={{ color: 'var(--w30)' }}>optional</span>
                </label>
                <select
                  style={S.inp}
                  value={form.product_id}
                  onChange={(e) => set('product_id', e.target.value)}
                >
                  <option value=''>— none —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand} {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={S.lbl}>
                Notes <span style={{ color: 'var(--w30)' }}>optional</span>
              </label>
              <input
                style={S.inp}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder='Bought Apr 2026, Scentoria, ₹12,000'
              />
            </div>
            <button
              onClick={addBottle}
              disabled={saving}
              style={{
                ...S.btn,
                background: 'var(--gold)',
                color: '#fff',
                padding: '10px 24px',
                fontSize: 12,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                width: '100%'
              }}
            >
              {saving ? 'Saving...' : 'Add to Inventory'}
            </button>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {adjBottle && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => {
            setAdjBottle(null)
            setAdjMl('')
            setAdjNote('')
          }}
        >
          <div
            style={{
              background: 'var(--bg2)',
              border: '0.5px solid var(--gold-25)',
              borderRadius: 10,
              padding: '1.75rem',
              width: '100%',
              maxWidth: 460
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--gold)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 600
                }}
              >
                Adjust Inventory
              </div>
              <button
                onClick={() => setAdjBottle(null)}
                style={{
                  ...S.btn,
                  background: 'var(--bg3)',
                  border: '0.5px solid var(--w12)',
                  color: 'var(--w60)',
                  width: 28,
                  height: 28,
                  padding: 0,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--w85)',
                fontFamily: 'var(--ff-serif)',
                marginBottom: 2
              }}
            >
              {adjBottle.brand} {adjBottle.name}
            </div>
            <div
              style={{ fontSize: 11, color: 'var(--w35)', marginBottom: 18 }}
            >
              {adjBottle.remaining?.toFixed(0)}ml currently remaining
            </div>

            {/* Type selector */}
            <div style={{ marginBottom: 14 }}>
              <label style={S.lbl}>Adjustment Type</label>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginTop: 6
                }}
              >
                {Object.entries(adjTypeLabels).map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => setAdjType(key)}
                    style={{
                      ...S.btn,
                      padding: '5px 10px',
                      fontSize: 11,
                      background:
                        adjType === key ? 'var(--gold-20)' : 'var(--w06)',
                      border: `0.5px solid ${adjType === key ? 'var(--gold-50)' : 'var(--w12)'}`,
                      color: adjType === key ? 'var(--gold)' : 'var(--w60)'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--w30)', marginTop: 6 }}>
                {adjTypeLabels[adjType].hint}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                gap: 10,
                marginBottom: 16
              }}
            >
              <div>
                <label style={S.lbl}>{adjTypeLabels[adjType].sign} ml</label>
                <input
                  style={{
                    ...S.inp,
                    color: adjType === 'topup' ? 'var(--green-txt)' : '#dc5050',
                    fontWeight: 600
                  }}
                  type='number'
                  min='0.5'
                  step='0.5'
                  value={adjMl}
                  onChange={(e) => setAdjMl(e.target.value)}
                  placeholder='10'
                  autoFocus
                />
              </div>
              <div>
                <label style={S.lbl}>
                  Note <span style={{ color: 'var(--w30)' }}>optional</span>
                </label>
                <input
                  style={S.inp}
                  value={adjNote}
                  onChange={(e) => setAdjNote(e.target.value)}
                  placeholder='e.g. Filled 2 bottles for order #SS-012'
                />
              </div>
            </div>

            {adjMl && (
              <div
                style={{
                  background: 'var(--bg3)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  marginBottom: 14,
                  fontSize: 12
                }}
              >
                <span style={{ color: 'var(--w50)' }}>After adjustment: </span>
                <span
                  style={{
                    color:
                      adjType === 'topup' ? 'var(--green-txt)' : 'var(--gold)',
                    fontWeight: 600
                  }}
                >
                  {(
                    adjBottle.remaining +
                    (adjType === 'topup' ? Number(adjMl) : -Number(adjMl))
                  ).toFixed(0)}
                  ml remaining
                </span>
              </div>
            )}

            <button
              onClick={saveAdj}
              disabled={saving || !adjMl}
              style={{
                ...S.btn,
                background:
                  adjType === 'topup' ? 'var(--green-txt)' : 'var(--gold)',
                color: '#fff',
                padding: '10px 24px',
                fontSize: 12,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                width: '100%',
                opacity: !adjMl ? 0.5 : 1
              }}
            >
              {saving
                ? 'Saving...'
                : `${adjTypeLabels[adjType].sign}${adjMl || '?'}ml — ${adjTypeLabels[adjType].label}`}
            </button>
          </div>
        </div>
      )}

      {/* Bottles grid */}
      {loading ? (
        <div style={{ color: 'var(--w30)', padding: '2rem' }}>Loading...</div>
      ) : bottlesWithStats.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 0',
            color: 'var(--w30)'
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🍶</div>
          <div style={{ fontSize: 14 }}>
            No bottles tracked yet. Add one above.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
            gap: 12
          }}
        >
          {bottlesWithStats.map((b) => (
            <div
              key={b.id}
              style={{
                ...S.card,
                opacity: b.status === 'empty' ? 0.6 : 1,
                border: `0.5px solid ${b.status === 'critical' || b.status === 'empty' ? 'rgba(220,80,80,0.25)' : 'var(--w08)'}`
              }}
            >
              {/* Brand / Name */}
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--gold)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: 2
                }}
              >
                {b.brand}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 8
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--w90)',
                    fontFamily: 'var(--ff-serif)'
                  }}
                >
                  {b.name}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setAdjBottle(b)}
                    style={{
                      ...S.btn,
                      fontSize: 10,
                      background: 'var(--gold-08)',
                      border: '0.5px solid var(--gold-20)',
                      color: 'var(--gold)',
                      padding: '2px 8px',
                      borderRadius: 3
                    }}
                  >
                    Adjust
                  </button>
                  <button
                    onClick={() => deleteBottle(b.id)}
                    style={{
                      ...S.btn,
                      fontSize: 10,
                      color: 'rgba(220,80,80,0.5)',
                      background: 'none',
                      padding: '2px 6px',
                      border: 'none'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 10 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 4
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--w40)' }}>
                    {b.remaining.toFixed(0)}ml of {b.start_ml}ml
                  </span>
                  <span
                    style={{ fontSize: 11, color: b.color, fontWeight: 600 }}
                  >
                    {b.pct}%
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: 'var(--bg3)',
                    borderRadius: 3
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 3,
                      width: `${b.pct}%`,
                      background: b.color,
                      transition: 'width .4s'
                    }}
                  />
                </div>
              </div>

              {/* Decant capacity */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4,1fr)',
                  gap: 4,
                  marginBottom: 10
                }}
              >
                {[
                  ['5ml', b.fills.f5],
                  ['10ml', b.fills.f10],
                  ['20ml', b.fills.f20],
                  ['30ml', b.fills.f30]
                ].map(([sz, n]) => (
                  <div
                    key={sz}
                    style={{
                      textAlign: 'center',
                      background: n > 0 ? 'var(--gold-05)' : 'var(--w04)',
                      border: `0.5px solid ${n > 0 ? 'var(--gold-15)' : 'var(--w06)'}`,
                      borderRadius: 4,
                      padding: '4px 2px'
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: n > 0 ? 'var(--gold)' : 'var(--w20)'
                      }}
                    >
                      {n}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: 'var(--w30)',
                        letterSpacing: '0.06em'
                      }}
                    >
                      {sz}
                    </div>
                  </div>
                ))}
              </div>

              {/* Linked product */}
              {b.linkedProduct && (
                <div
                  style={{ fontSize: 10, color: 'var(--w35)', marginBottom: 4 }}
                >
                  🔗 {b.linkedProduct.brand} {b.linkedProduct.name}
                  {b.linkedProduct.sold_out && (
                    <span style={{ color: '#dc5050', marginLeft: 6 }}>
                      SOLD OUT
                    </span>
                  )}
                </div>
              )}

              {/* Adj log (last 3) */}
              {b.adjs.length > 0 && (
                <div
                  style={{
                    borderTop: '0.5px solid var(--w06)',
                    marginTop: 8,
                    paddingTop: 8
                  }}
                >
                  {b.adjs
                    .slice(-3)
                    .reverse()
                    .map((a, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 10,
                          color: 'var(--w30)',
                          marginBottom: 2
                        }}
                      >
                        <span>
                          {adjTypeLabels[a.type]?.label || a.type}{' '}
                          {a.note ? `· ${a.note}` : ''}
                        </span>
                        <span
                          style={{
                            color: a.delta > 0 ? 'var(--green-txt)' : '#dc5050',
                            fontWeight: 600
                          }}
                        >
                          {a.delta > 0 ? '+' : ''}
                          {a.delta}ml
                        </span>
                      </div>
                    ))}
                  {b.adjs.length > 3 && (
                    <div style={{ fontSize: 10, color: 'var(--w20)' }}>
                      +{b.adjs.length - 3} more adjustments
                    </div>
                  )}
                </div>
              )}

              {!b.canFulfil && (
                <div
                  style={{
                    fontSize: 9,
                    color: '#dc5050',
                    marginTop: 6,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase'
                  }}
                >
                  ⚡ Too low — product auto-marked sold out
                </div>
              )}
              {b.notes && (
                <div
                  style={{ fontSize: 10, color: 'var(--w20)', marginTop: 6 }}
                >
                  {b.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── COMBOS TAB ───────────────────────────────────────────────────────────────
function CombosTab() {
  const [combos, setCombos] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editCombo, setEditCombo] = useState(null) // combo being edited
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [itemSearch, setItemSearch] = useState('')

  const blankCombo = {
    slug: '',
    label: '',
    emoji: '🧴',
    tag: 'Starter Pack',
    tagline: '',
    color: '#b09060',
    discount_pct: 10,
    items: [],
    active: true
  }
  const [form, setForm] = useState(blankCombo)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    Promise.all([
      fetch('/api/combos').then((r) => r.json()),
      fetch('/api/products?admin=1').then((r) => r.json())
    ]).then(([c, p]) => {
      setCombos(Array.isArray(c) ? c : [])
      setProducts(Array.isArray(p) ? p : [])
      setLoading(false)
    })
  }, [])

  const openEdit = (combo) => {
    setForm({
      slug: combo.slug,
      label: combo.label,
      emoji: combo.emoji || '🧴',
      tag: combo.tag || 'Starter Pack',
      tagline: combo.tagline || '',
      color: combo.color || '#b09060',
      discount_pct: combo.discount_pct ?? 10,
      items: combo.items || [],
      active: combo.active ?? true
    })
    setEditCombo(combo)
    setShowAdd(true)
  }

  const openNew = () => {
    setForm(blankCombo)
    setEditCombo(null)
    setShowAdd(true)
  }

  const close = () => {
    setShowAdd(false)
    setEditCombo(null)
    setItemSearch('')
  }

  const addItem = (item) => {
    setForm((f) => ({ ...f, items: [...f.items, { ...item, qty: 1 }] }))
    setItemSearch('')
  }

  const removeItem = (idx) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))

  const updateItem = (idx, key, val) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, [key]: val } : it))
    }))

  const save = async () => {
    if (!form.label || form.items.length === 0) return
    setSaving(true)
    const payload = {
      slug:
        form.slug ||
        form.label
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, ''),
      label: form.label,
      emoji: form.emoji,
      tag: form.tag,
      tagline: form.tagline,
      color: form.color,
      discount_pct: Number(form.discount_pct),
      items: form.items,
      active: form.active
    }
    if (editCombo) {
      const r = await fetch(`/api/combos/${editCombo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const updated = await r.json()
      setCombos((cs) => cs.map((c) => (c.id === editCombo.id ? updated : c)))
    } else {
      const r = await fetch('/api/combos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const created = await r.json()
      setCombos((cs) => [...cs, created])
    }
    setSaving(false)
    close()
  }

  const deleteCombo = async (id) => {
    if (!confirm('Delete this combo?')) return
    await fetch(`/api/combos/${id}`, { method: 'DELETE' })
    setCombos((cs) => cs.filter((c) => c.id !== id))
  }

  const toggleActive = async (combo) => {
    const r = await fetch(`/api/combos/${combo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !combo.active })
    })
    const updated = await r.json()
    setCombos((cs) => cs.map((c) => (c.id === combo.id ? updated : c)))
  }

  // Search your actual products for item picker
  const itemResults =
    itemSearch.length < 1
      ? []
      : [
          ...products.flatMap((p) => {
            const typeMap = { niche: 'niche', designer: 'designer', dupe: 'me' }
            const type = typeMap[p.category] || 'me'
            return ['5ml', '10ml', '20ml', '30ml']
              .map((size, i) => {
                const prices = [p.p5, p.p10, p.p20, p.p30]
                const price = prices[i]
                if (!price) return null
                return {
                  brand: p.brand,
                  name: p.name,
                  size,
                  price,
                  type,
                  label: `${p.brand} ${p.name} ${size}`
                }
              })
              .filter(Boolean)
          })
        ]
          .filter((x) =>
            x.label.toLowerCase().includes(itemSearch.toLowerCase())
          )
          .slice(0, 8)

  const subtotal = (items) => items.reduce((s, it) => s + Number(it.price), 0)
  const discounted = (items, pct) =>
    Math.round((subtotal(items) * (1 - pct / 100)) / 10) * 10

  return (
    <div>
      {/* Modal */}
      {showAdd && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '2rem 1rem',
            overflowY: 'auto'
          }}
          onClick={close}
        >
          <div
            style={{
              background: 'var(--bg2)',
              border: '0.5px solid var(--gold-25)',
              borderRadius: 10,
              padding: '1.75rem',
              width: '100%',
              maxWidth: 620,
              marginBottom: '2rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--gold)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 600
                }}
              >
                {editCombo ? 'Edit Combo' : 'New Combo'}
              </div>
              <button
                onClick={close}
                style={{
                  ...S.btn,
                  background: 'var(--w06)',
                  border: '0.5px solid var(--w12)',
                  color: 'var(--w60)',
                  width: 28,
                  height: 28,
                  padding: 0,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4
                }}
              >
                ×
              </button>
            </div>

            {/* Basic info */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 1fr',
                gap: 10,
                marginBottom: 10
              }}
            >
              <div>
                <label style={S.lbl}>Emoji</label>
                <input
                  style={{ ...S.inp, textAlign: 'center', fontSize: 20 }}
                  value={form.emoji}
                  onChange={(e) => setF('emoji', e.target.value)}
                />
              </div>
              <div>
                <label style={S.lbl}>Combo Name</label>
                <input
                  style={S.inp}
                  value={form.label}
                  onChange={(e) => setF('label', e.target.value)}
                  placeholder='The Day Pack'
                />
              </div>
              <div>
                <label style={S.lbl}>Tag Label</label>
                <input
                  style={S.inp}
                  value={form.tag}
                  onChange={(e) => setF('tag', e.target.value)}
                  placeholder='Starter Pack'
                />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={S.lbl}>Tagline</label>
              <input
                style={S.inp}
                value={form.tagline}
                onChange={(e) => setF('tagline', e.target.value)}
                placeholder='Fresh scents for everyday wear...'
              />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 80px',
                gap: 10,
                marginBottom: 16
              }}
            >
              <div>
                <label style={S.lbl}>Card Colour</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type='color'
                    value={form.color}
                    onChange={(e) => setF('color', e.target.value)}
                    style={{
                      width: 36,
                      height: 32,
                      border: '0.5px solid var(--w12)',
                      borderRadius: 4,
                      background: 'none',
                      cursor: 'pointer',
                      padding: 2
                    }}
                  />
                  <input
                    style={{
                      ...S.inp,
                      flex: 1,
                      fontFamily: 'monospace',
                      fontSize: 12
                    }}
                    value={form.color}
                    onChange={(e) => setF('color', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label style={S.lbl}>Discount %</label>
                <input
                  style={{ ...S.inp, color: 'var(--gold)', fontWeight: 600 }}
                  type='number'
                  min='0'
                  max='50'
                  value={form.discount_pct}
                  onChange={(e) => setF('discount_pct', e.target.value)}
                />
              </div>
              <div>
                <label style={S.lbl}>Active</label>
                <div
                  style={{ display: 'flex', alignItems: 'center', height: 38 }}
                >
                  <input
                    type='checkbox'
                    checked={form.active}
                    onChange={(e) => setF('active', e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>

            {/* Item picker — searches your actual products */}
            <div
              style={{
                fontSize: 10,
                color: 'var(--gold)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 8,
                fontWeight: 600
              }}
            >
              Items{' '}
              <span style={{ color: 'var(--w30)', fontWeight: 400 }}>
                — search from your products
              </span>
            </div>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <input
                style={S.inp}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder='Type brand or name to search your products...'
              />
              {itemResults.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--bg3)',
                    border: '0.5px solid var(--gold-20)',
                    borderRadius: 6,
                    zIndex: 10,
                    maxHeight: 200,
                    overflowY: 'auto',
                    marginTop: 2
                  }}
                >
                  {itemResults.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => addItem(item)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        padding: '7px 12px',
                        background: 'none',
                        border: 'none',
                        borderBottom: '0.5px solid var(--w06)',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <span
                          style={{
                            fontSize: 8,
                            padding: '1px 5px',
                            borderRadius: 2,
                            background:
                              item.type === 'niche'
                                ? 'var(--gold-12)'
                                : item.type === 'designer'
                                  ? 'rgba(100,130,200,0.15)'
                                  : 'var(--w08)',
                            color:
                              item.type === 'niche'
                                ? 'var(--gold)'
                                : item.type === 'designer'
                                  ? 'rgba(140,170,255,0.8)'
                                  : 'var(--w50)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em'
                          }}
                        >
                          {item.type === 'niche'
                            ? 'Niche'
                            : item.type === 'designer'
                              ? 'Designer'
                              : 'ME'}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--w85)' }}>
                          {item.brand} {item.name}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--w40)' }}>
                          {item.size}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--gold)',
                          fontWeight: 600
                        }}
                      >
                        ₹{item.price}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items list */}
            {form.items.length > 0 && (
              <div
                style={{
                  background: 'var(--w04)',
                  border: '0.5px solid var(--w08)',
                  borderRadius: 6,
                  marginBottom: 16,
                  overflow: 'hidden'
                }}
              >
                {form.items.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr 70px 80px auto',
                      gap: 8,
                      padding: '8px 10px',
                      borderBottom:
                        idx < form.items.length - 1
                          ? '0.5px solid var(--w06)'
                          : 'none',
                      alignItems: 'center'
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        padding: '1px 5px',
                        borderRadius: 2,
                        background:
                          it.type === 'niche'
                            ? 'var(--gold-12)'
                            : it.type === 'designer'
                              ? 'rgba(100,130,200,0.15)'
                              : 'var(--w08)',
                        color:
                          it.type === 'niche'
                            ? 'var(--gold)'
                            : it.type === 'designer'
                              ? 'rgba(140,170,255,0.8)'
                              : 'var(--w50)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em'
                      }}
                    >
                      {it.type === 'niche'
                        ? 'N'
                        : it.type === 'designer'
                          ? 'D'
                          : 'ME'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--w85)' }}>
                      {it.brand} {it.name}{' '}
                      <span style={{ color: 'var(--w40)' }}>{it.size}</span>
                    </span>
                    <select
                      value={it.size}
                      onChange={(e) => updateItem(idx, 'size', e.target.value)}
                      style={{ ...S.inp, padding: '4px 6px', fontSize: 11 }}
                    >
                      {['5ml', '10ml', '20ml', '30ml'].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <input
                      type='number'
                      value={it.price}
                      onChange={(e) =>
                        updateItem(idx, 'price', Number(e.target.value))
                      }
                      style={{
                        ...S.inp,
                        padding: '4px 8px',
                        fontSize: 12,
                        textAlign: 'right'
                      }}
                    />
                    <button
                      onClick={() => removeItem(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--red)',
                        cursor: 'pointer',
                        fontSize: 16,
                        padding: '0 4px'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div
                  style={{
                    padding: '8px 12px',
                    borderTop: '0.5px solid var(--w08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11
                  }}
                >
                  <span style={{ color: 'var(--w40)' }}>
                    Original: ₹{subtotal(form.items).toLocaleString('en-IN')}
                  </span>
                  <span style={{ color: 'var(--gold)', fontWeight: 600 }}>
                    After {form.discount_pct}% off: ₹
                    {discounted(form.items, form.discount_pct).toLocaleString(
                      'en-IN'
                    )}
                  </span>
                </div>
              </div>
            )}

            {(!form.label || form.items.length === 0) && (
              <div
                style={{ fontSize: 11, color: 'var(--w30)', marginBottom: 12 }}
              >
                {form.items.length === 0
                  ? '↑ Search and add at least one item'
                  : '↑ Add a combo name to save'}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={save}
                disabled={saving || !form.label || form.items.length === 0}
                style={{
                  ...S.btn,
                  background: 'var(--gold)',
                  color: '#fff',
                  padding: '11px 0',
                  fontSize: 13,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  flex: 1,
                  opacity: !form.label || form.items.length === 0 ? 0.5 : 1
                }}
              >
                {saving
                  ? 'Saving...'
                  : editCombo
                    ? 'Save Changes'
                    : 'Create Combo'}
              </button>
              <button
                onClick={close}
                style={{
                  ...S.btn,
                  background: 'var(--w06)',
                  border: '0.5px solid var(--w12)',
                  color: 'var(--w60)',
                  padding: '11px 20px',
                  fontSize: 13
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}
      >
        <div>
          <div
            style={{
              fontSize: 16,
              color: 'var(--w90)',
              fontFamily: 'var(--ff-serif)'
            }}
          >
            Combo Deals
          </div>
          <div style={{ fontSize: 11, color: 'var(--w35)', marginTop: 2 }}>
            Items are pulled from your actual products — prices stay accurate
          </div>
        </div>
        <button
          onClick={openNew}
          style={{
            ...S.btn,
            background: 'var(--gold)',
            color: '#fff',
            padding: '8px 18px',
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase'
          }}
        >
          + New Combo
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--w30)', padding: '2rem' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {combos.map((combo) => {
            const orig = subtotal(combo.items || [])
            const disc = discounted(combo.items || [], combo.discount_pct)
            return (
              <div
                key={combo.id}
                style={{
                  ...S.card,
                  opacity: combo.active ? 1 : 0.5,
                  border: `0.5px solid ${combo.active ? 'var(--gold-15)' : 'var(--w08)'}`
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 10
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <span style={{ fontSize: 22 }}>{combo.emoji}</span>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          color: 'var(--w90)',
                          fontFamily: 'var(--ff-serif)'
                        }}
                      >
                        {combo.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--w35)',
                          marginTop: 2
                        }}
                      >
                        {combo.tagline}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: combo.active ? 'var(--green-txt)' : 'var(--w30)',
                        padding: '2px 8px',
                        border: `0.5px solid ${combo.active ? 'var(--green-br)' : 'var(--w10)'}`,
                        borderRadius: 3
                      }}
                    >
                      {combo.active ? 'Live' : 'Hidden'}
                    </span>
                    <button
                      onClick={() => toggleActive(combo)}
                      style={{
                        ...S.btn,
                        fontSize: 10,
                        padding: '3px 8px',
                        background: 'var(--w06)',
                        border: '0.5px solid var(--w12)',
                        color: 'var(--w60)'
                      }}
                    >
                      {combo.active ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => openEdit(combo)}
                      style={{
                        ...S.btn,
                        fontSize: 10,
                        padding: '3px 10px',
                        background: 'var(--gold-08)',
                        border: '0.5px solid var(--gold-20)',
                        color: 'var(--gold)'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCombo(combo.id)}
                      style={{
                        ...S.btn,
                        fontSize: 10,
                        padding: '3px 8px',
                        background: 'none',
                        border: 'none',
                        color: 'rgba(220,80,80,0.5)'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    marginBottom: 10
                  }}
                >
                  {(combo.items || []).map((it, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 11,
                        color: 'var(--w50)',
                        background: 'var(--w04)',
                        border: '0.5px solid var(--w08)',
                        borderRadius: 3,
                        padding: '3px 8px'
                      }}
                    >
                      {it.brand} {it.name} {it.size} · ₹{it.price}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                  <span style={{ color: 'var(--w35)' }}>
                    Original ₹{orig.toLocaleString('en-IN')}
                  </span>
                  <span style={{ color: 'var(--gold)', fontWeight: 600 }}>
                    After {combo.discount_pct}% → ₹
                    {disc.toLocaleString('en-IN')}
                  </span>
                  <span style={{ color: 'var(--w30)' }}>
                    Save ₹{(orig - disc).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )
          })}
          {combos.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 0',
                color: 'var(--w30)'
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>🧴</div>
              <div style={{ fontSize: 14 }}>
                No combos yet. Create one above.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PricingTab() {
  const [paid, setPaid] = useState('')
  const [ml, setMl] = useState('')
  const [result, setResult] = useState(null)
  const calc = () => {
    if (!paid || !ml) return
    setResult(calcPrices(Number(paid), Number(ml)))
  }
  return (
    <div style={{ maxWidth: 500 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 16
        }}
      >
        <div>
          <label style={S.lbl}>Amount Paid (₹)</label>
          <input
            style={S.inp}
            type='number'
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            placeholder='5500'
          />
        </div>
        <div>
          <label style={S.lbl}>Bottle Size (ml)</label>
          <input
            style={S.inp}
            type='number'
            value={ml}
            onChange={(e) => setMl(e.target.value)}
            placeholder='50'
          />
        </div>
      </div>
      <button
        onClick={calc}
        style={{
          ...S.btn,
          background: '#b09060',
          color: '#fff',
          padding: '10px 24px',
          fontSize: 12,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 20
        }}
      >
        Calculate
      </button>
      {result && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: 12
          }}
        >
          {[
            ['5ml', result.p5],
            ['10ml', result.p10],
            ['20ml', result.p20],
            ['30ml', result.p30]
          ].map(([size, price]) => (
            <div key={size} style={{ ...S.card, textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--w40)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 4
                }}
              >
                {size}
              </div>
              <div
                style={{
                  fontSize: 22,
                  color: 'var(--gold)',
                  fontFamily: 'var(--ff-serif)'
                }}
              >
                {formatINR(price)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── DISCOUNTS TAB ─────────────────────────────────────────────────────────────
function DiscountsTab() {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    code: '',
    type: 'percent',
    value: '',
    min_order: '',
    max_uses: '',
    expires_at: ''
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    fetch('/api/discounts')
      .then((r) => r.json())
      .then((d) => {
        setCodes(Array.isArray(d) ? d : [])
        setLoading(false)
      })
  }, [])

  const [createError, setCreateError] = useState('')

  const createCode = async () => {
    if (!form.code || !form.value) return
    setCreateError('')
    const r = await fetch('/api/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const created = await r.json()
    if (!r.ok) {
      setCreateError(
        created.error?.message || created.error || 'Failed to create code'
      )
      return
    }
    if (created && created.id) {
      setCodes((c) => [created, ...c])
      setForm({
        code: '',
        type: 'percent',
        value: '',
        min_order: '',
        max_uses: '',
        expires_at: ''
      })
      setShowAdd(false)
      setCreateError('')
    }
  }

  const toggleActive = async (dc) => {
    const r = await fetch(`/api/discount/${dc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !dc.active })
    })
    const updated = await r.json()
    if (updated?.id)
      setCodes((c) => c.map((x) => (x.id === dc.id ? updated : x)))
  }

  const deleteCode = async (id) => {
    if (!confirm('Delete this discount code?')) return
    await fetch(`/api/discount/${id}`, { method: 'DELETE' })
    setCodes((c) => c.filter((x) => x.id !== id))
  }

  const activeCodes = codes.filter((c) => c.active).length

  return (
    <div>
      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))',
          gap: 12,
          marginBottom: 24
        }}
      >
        {[
          ['Total Codes', codes.length],
          ['Active', activeCodes],
          ['Inactive', codes.length - activeCodes]
        ].map(([label, val]) => (
          <div key={label} style={{ ...S.card }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--w35)',
                marginBottom: 6
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: 22,
                color: 'var(--w90)',
                fontWeight: 300,
                fontFamily: 'var(--ff-serif)'
              }}
            >
              {val}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 16
        }}
      >
        <button
          onClick={() => setShowAdd((s) => !s)}
          style={{
            ...S.btn,
            background: '#b09060',
            color: '#fff',
            padding: '8px 18px',
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase'
          }}
        >
          {showAdd ? 'Cancel' : '+ New Code'}
        </button>
      </div>

      {/* Create form */}
      {showAdd && (
        <div
          style={{
            background: 'var(--gold-05)',
            border: '0.5px solid var(--gold-20)',
            borderRadius: 8,
            padding: '1.25rem',
            marginBottom: 20
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: 'var(--gold)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 14
            }}
          >
            New Discount Code
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12,
              marginBottom: 12
            }}
          >
            <div>
              <label style={S.lbl}>Code</label>
              <input
                style={S.inp}
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder='LAUNCH10'
              />
            </div>
            <div>
              <label style={S.lbl}>Type</label>
              <select
                style={S.inp}
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
              >
                <option value='percent'>Percent (%)</option>
                <option value='fixed'>Fixed (₹)</option>
              </select>
            </div>
            <div>
              <label style={S.lbl}>
                {form.type === 'percent' ? 'Discount %' : 'Discount ₹'}
              </label>
              <input
                style={S.inp}
                type='number'
                value={form.value}
                onChange={(e) => set('value', e.target.value)}
                placeholder={form.type === 'percent' ? '10' : '500'}
              />
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12,
              marginBottom: 12
            }}
          >
            <div>
              <label style={S.lbl}>
                Min Order (₹){' '}
                <span style={{ color: 'var(--w25)' }}>optional</span>
              </label>
              <input
                style={S.inp}
                type='number'
                value={form.min_order}
                onChange={(e) => set('min_order', e.target.value)}
                placeholder='0'
              />
            </div>
            <div>
              <label style={S.lbl}>
                Max Uses <span style={{ color: 'var(--w25)' }}>optional</span>
              </label>
              <input
                style={S.inp}
                type='number'
                value={form.max_uses}
                onChange={(e) => set('max_uses', e.target.value)}
                placeholder='Unlimited'
              />
            </div>
            <div>
              <label style={S.lbl}>
                Expires <span style={{ color: 'var(--w25)' }}>optional</span>
              </label>
              <input
                style={{ ...S.inp, colorScheme: 'dark' }}
                type='date'
                value={form.expires_at}
                onChange={(e) => set('expires_at', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          {createError && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>
              {createError}
            </div>
          )}
          <button
            onClick={createCode}
            style={{
              ...S.btn,
              background: '#b09060',
              color: '#fff',
              padding: '9px 20px',
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}
          >
            Create Code
          </button>
        </div>
      )}

      {/* Codes list */}
      {loading ? (
        <div style={{ color: 'var(--w30)', padding: '2rem' }}>Loading...</div>
      ) : codes.length === 0 ? (
        <div
          style={{ textAlign: 'center', padding: '3rem', color: 'var(--t3)' }}
        >
          No discount codes yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {codes.map((dc) => {
            const expired =
              dc.expires_at && new Date(dc.expires_at) < new Date()
            const maxed = dc.max_uses !== null && dc.used_count >= dc.max_uses
            const statusColor = !dc.active
              ? '#555'
              : expired || maxed
                ? '#dc5050'
                : 'var(--green-txt)'
            const statusLabel = !dc.active
              ? 'Inactive'
              : expired
                ? 'Expired'
                : maxed
                  ? 'Maxed out'
                  : 'Active'
            return (
              <div
                key={dc.id}
                style={{
                  ...S.card,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                  opacity: !dc.active ? 0.6 : 1
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 4
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--ff-serif)',
                        fontSize: '1.1rem',
                        color: 'var(--gold)',
                        letterSpacing: '0.08em'
                      }}
                    >
                      {dc.code}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        padding: '2px 8px',
                        borderRadius: 3,
                        background: `${statusColor}18`,
                        color: statusColor,
                        border: `0.5px solid ${statusColor}44`,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase'
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--w50)',
                      display: 'flex',
                      gap: 16,
                      flexWrap: 'wrap'
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--w80)',
                        fontWeight: 500
                      }}
                    >
                      {dc.type === 'percent'
                        ? `${dc.value}% off`
                        : `₹${dc.value} off`}
                    </span>
                    {dc.min_order > 0 && <span>Min: ₹{dc.min_order}</span>}
                    <span>
                      Used: {dc.used_count}
                      {dc.max_uses ? ` / ${dc.max_uses}` : ''}
                    </span>
                    {dc.expires_at && (
                      <span>
                        Expires:{' '}
                        {new Date(dc.expires_at).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => toggleActive(dc)}
                    style={{
                      ...S.btn,
                      fontSize: 10,
                      padding: '4px 10px',
                      background: dc.active
                        ? 'rgba(220,80,80,0.1)'
                        : 'rgba(76,175,125,0.1)',
                      color: dc.active ? '#dc5050' : 'var(--green-txt)',
                      border: `0.5px solid ${dc.active ? 'var(--red-br)' : 'rgba(76,175,125,0.2)'}`
                    }}
                  >
                    {dc.active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => deleteCode(dc.id)}
                    style={{
                      ...S.btn,
                      fontSize: 10,
                      padding: '4px 8px',
                      background: 'rgba(220,80,80,0.1)',
                      color: '#dc5050',
                      border: '0.5px solid var(--red-br)'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── ADMIN AUTH + SHELL ────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const supabase = createBrowserSupabase()

  const [authState, setAuthState] = useState('loading') // loading | otp_sent | authed | denied
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [tab, setTab] = useState('orders')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const userEmail = data.session?.user?.email
      if (userEmail === ADMIN_EMAIL) setAuthState('authed')
      else if (userEmail) setAuthState('denied')
      else setAuthState('idle')
    })
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_, session) => {
      const userEmail = session?.user?.email
      if (userEmail === ADMIN_EMAIL) setAuthState('authed')
      else if (userEmail) setAuthState('denied')
      else if (authState !== 'otp_sent') setAuthState('idle')
    })
    return () => subscription.unsubscribe()
  }, [])

  const sendOTP = async () => {
    setSending(true)
    setError('')
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL })
    })
    const data = await res.json()
    setSending(false)
    if (!res.ok) {
      setError(data.error || 'Failed to send code.')
      return
    }
    setAuthState('otp_sent')
  }

  const verifyOTP = async () => {
    setSending(true)
    setError('')
    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, otp: otp.trim() })
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Invalid or expired code.')
      setSending(false)
      return
    }

    // Establish session via magic link
    if (data.action_link) {
      const url = new URL(data.action_link)
      const tokenHash =
        url.searchParams.get('token_hash') || url.searchParams.get('token')
      const { error: sessionErr } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'magiclink'
      })
      if (sessionErr) {
        setError('Sign in failed. Try again.')
        setSending(false)
        return
      }
    }
    setSending(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setAuthState('idle')
    setOtp('')
  }

  // ── Loading
  if (authState === 'loading')
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

  // ── Denied (logged in but not your email)
  if (authState === 'denied')
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)'
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🚫</div>
          <p style={{ color: 'var(--t2)', marginBottom: 16 }}>
            You don't have admin access.
          </p>
          <button
            onClick={signOut}
            style={{
              ...S.btn,
              background: '#b09060',
              color: '#fff',
              padding: '8px 20px',
              fontSize: 12
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    )

  // ── Login gate
  if (authState !== 'authed')
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)'
        }}
      >
        <div
          style={{
            background: 'var(--bg2)',
            border: '0.5px solid var(--gold-20)',
            borderRadius: 10,
            padding: '2rem',
            width: 340
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--ff-serif)',
              color: 'var(--t1)',
              marginBottom: 6,
              textAlign: 'center'
            }}
          >
            Scent Snob <span style={{ color: 'var(--gold)' }}>Admin</span>
          </h2>
          <p
            style={{
              fontSize: 12,
              color: 'var(--t3)',
              textAlign: 'center',
              marginBottom: 24
            }}
          >
            {authState === 'otp_sent'
              ? `Code sent to ${ADMIN_EMAIL}`
              : 'Admin access only'}
          </p>

          {authState === 'idle' && (
            <>
              {error && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--red)',
                    marginBottom: 10,
                    textAlign: 'center'
                  }}
                >
                  {error}
                </div>
              )}
              <button
                onClick={sendOTP}
                disabled={sending}
                style={{
                  ...S.btn,
                  width: '100%',
                  padding: '12px',
                  background: '#b09060',
                  color: '#fff',
                  fontSize: 13,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}
              >
                {sending ? 'Sending...' : 'Send Login Code'}
              </button>
            </>
          )}

          {authState === 'otp_sent' && (
            <>
              <input
                type='text'
                inputMode='numeric'
                maxLength={6}
                placeholder='6-digit code'
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                  setError('')
                }}
                autoFocus
                style={{
                  ...S.inp,
                  marginBottom: 10,
                  fontSize: 20,
                  textAlign: 'center',
                  letterSpacing: '0.3em'
                }}
              />
              {error && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--red)',
                    marginBottom: 10,
                    textAlign: 'center'
                  }}
                >
                  {error}
                </div>
              )}
              <button
                onClick={verifyOTP}
                disabled={sending || otp.length < 6}
                style={{
                  ...S.btn,
                  width: '100%',
                  padding: '12px',
                  background: otp.length < 6 ? 'var(--gold-40)' : '#b09060',
                  color: '#fff',
                  fontSize: 13,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 10
                }}
              >
                {sending ? 'Verifying...' : 'Verify & Enter'}
              </button>
              <button
                onClick={sendOTP}
                style={{
                  ...S.btn,
                  width: '100%',
                  padding: '8px',
                  background: 'none',
                  color: 'var(--t3)',
                  fontSize: 11,
                  border: '0.5px solid var(--border)',
                  borderRadius: 4
                }}
              >
                Resend code
              </button>
            </>
          )}
        </div>
      </div>
    )

  // ── Admin shell
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div
        style={{
          background: 'var(--bg2)',
          borderBottom: '0.5px solid var(--w06)',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--ff-serif)',
            fontSize: '1.1rem',
            color: 'var(--t1)'
          }}
        >
          Scent Snob <span style={{ color: 'var(--gold)' }}>Admin</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--t3)' }}>
            {ADMIN_EMAIL}
          </span>
          <button
            onClick={signOut}
            style={{
              ...S.btn,
              fontSize: 11,
              color: 'var(--w40)',
              background: 'var(--bg3)',
              padding: '5px 12px',
              border: '0.5px solid var(--w10)'
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 2rem' }}>
        <div
          style={{
            display: 'flex',
            gap: 4,
            borderBottom: '0.5px solid var(--border)',
            marginBottom: 24
          }}
        >
          {[
            ['orders', 'Orders'],
            ['products', 'Products'],
            ['partials', 'Partials'],
            ['combos', 'Combos'],
            ['stock', 'Stock'],
            ['pricing', 'Pricing'],
            ['discounts', 'Discounts']
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                ...S.btn,
                background: 'none',
                borderBottom:
                  tab === id ? '2px solid #b09060' : '2px solid transparent',
                borderRadius: 0,
                color: tab === id ? '#b09060' : 'var(--w40)',
                padding: '10px 18px',
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'orders' && <OrdersTab />}
        {tab === 'products' && <ProductsTab />}
        {tab === 'partials' && <PartialsTab />}
        {tab === 'combos' && <CombosTab />}
        {tab === 'stock' && <StockTab />}
        {tab === 'pricing' && <PricingTab />}
        {tab === 'discounts' && <DiscountsTab />}
      </div>
    </div>
  )
}
