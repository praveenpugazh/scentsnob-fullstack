'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { calcPrices, formatINR } from '@/lib/pricing'
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
    background: 'rgba(255,255,255,0.06)',
    border: '0.5px solid rgba(255,255,255,0.15)',
    borderRadius: 4,
    padding: '8px 10px',
    fontFamily: 'var(--ff-sans)',
    fontSize: 13,
    color: '#fff',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  },
  lbl: {
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    display: 'block',
    marginBottom: 4
  },
  card: {
    background: 'rgba(255,255,255,0.02)',
    border: '0.5px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    padding: '0.85rem 1rem'
  }
}

const STATUS_FLOW = ['Pending', 'Paid', 'Shipped', 'Delivered']
const STATUS_COLORS = {
  Pending: '#b09060',
  Paid: '#4a9eff',
  Shipped: '#9b59b6',
  Delivered: '#4caf7d',
  Cancelled: '#dc5050'
}

function StatusStepper({ status, onChange }) {
  const color = STATUS_COLORS[status] || '#b09060'
  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(status) + 1]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.4)',
            border: '0.5px solid rgba(255,255,255,0.12)',
            borderRadius: 20
          }}
        >
          → {nextStatus}
        </button>
      )}
      {status !== 'Cancelled' && (
        <button
          onClick={() => onChange('Cancelled')}
          title='Cancel order'
          style={{
            ...S.btn,
            fontSize: 10,
            padding: '3px 7px',
            background: 'rgba(220,80,80,0.08)',
            color: 'rgba(220,80,80,0.5)',
            border: '0.5px solid rgba(220,80,80,0.2)',
            borderRadius: 20
          }}
        >
          ✕
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

  useEffect(() => {
    fetch('/api/orders')
      .then((r) => r.json())
      .then((d) => {
        setOrders(Array.isArray(d) ? d : [])
        setLoading(false)
      })
  }, [])

  const updateStatus = async (id, status) => {
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, status } : x)))
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))',
          gap: 12,
          marginBottom: 24
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
                  ? 'rgba(176,144,96,0.3)'
                  : undefined
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)',
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
                    : 'rgba(255,255,255,0.9)',
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
                      : 'rgba(255,255,255,0.25)',
                  marginTop: 2
                }}
              >
                {sub}
              </div>
            )}
          </div>
        ))}
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
                        : 'rgba(176,144,96,0.15)'
                      : 'rgba(255,255,255,0.03)',
                  color:
                    filter === f
                      ? STATUS_COLORS[f] || '#b09060'
                      : 'rgba(255,255,255,0.35)',
                  border: `0.5px solid ${filter === f ? (STATUS_COLORS[f] ? `${STATUS_COLORS[f]}44` : 'rgba(176,144,96,0.3)') : 'rgba(255,255,255,0.08)'}`
                }}
              >
                {f}
              </button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', padding: '2rem' }}>
          Loading orders...
        </div>
      ) : (
        filtered.map((order) => (
          <div
            key={order.id}
            style={{
              ...S.card,
              marginBottom: 10,
              borderColor:
                order.status === 'Pending' ? 'rgba(176,144,96,0.2)' : undefined
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
                  <span
                    style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}
                  >
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
                    color: 'rgba(255,255,255,0.85)',
                    fontWeight: 500
                  }}
                >
                  {order.customer}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  {order.phone}
                </div>
                {order.address && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.25)',
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
                    color: 'rgba(255,255,255,0.9)',
                    fontWeight: 500
                  }}
                >
                  {formatINR(order.total)}
                </div>
                <StatusStepper
                  status={order.status}
                  onChange={(s) => updateStatus(order.id, s)}
                />
              </div>
            </div>
            {order.items && order.items.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '0.5px solid rgba(255,255,255,0.06)'
                }}
              >
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.4)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 2
                    }}
                  >
                    <span>
                      {item.brand} {item.name} ({item.size}) ×{item.qty}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.55)' }}>
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
                    borderTop: '0.5px solid rgba(255,255,255,0.04)',
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.25)'
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
            color: 'rgba(255,255,255,0.25)',
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
            color: value ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)'
          }}
        >
          {value || 'Select brand...'}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
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
            background: '#1a1714',
            border: '0.5px solid rgba(176,144,96,0.3)',
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
              borderBottom: '0.5px solid rgba(255,255,255,0.06)'
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
                color: 'rgba(255,255,255,0.9)',
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
                  color: '#4caf7d',
                  cursor: 'pointer',
                  borderBottom: '0.5px solid rgba(255,255,255,0.04)',
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
                  color: 'rgba(255,255,255,0.3)',
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
                  color: b === value ? '#b09060' : 'rgba(255,255,255,0.75)',
                  cursor: 'pointer',
                  background: b === value ? 'rgba(176,144,96,0.08)' : 'none'
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    b === value ? 'rgba(176,144,96,0.08)' : 'none')
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
                border: '0.5px solid rgba(176,144,96,0.4)',
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
              color: 'rgba(255,255,255,0.25)',
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
                ? 'rgba(176,144,96,0.2)'
                : 'rgba(255,255,255,0.05)',
              color: selected.includes(a) ? '#b09060' : 'rgba(255,255,255,0.5)',
              outline: selected.includes(a)
                ? '0.5px solid rgba(176,144,96,0.4)'
                : '0.5px solid rgba(255,255,255,0.08)',
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
    background: 'rgba(255,255,255,0.05)',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    padding: '10px 12px',
    fontFamily: 'var(--ff-sans)',
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    outline: 'none'
  }
}

// ── PRODUCTS TAB ─────────────────────────────────────────────────────────────
function ProductsTab() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
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

  const recalc = (paid, ml) => {
    if (paid && ml) {
      const { p5, p10, p20 } = calcPrices(Number(paid), Number(ml))
      setForm((f) => ({ ...f, p5, p10, p20, _autoCalc: true }))
    }
  }

  const saveProduct = async () => {
    if (!form.brand || !form.name) return
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
      bottle_ml: form.bottle_ml ? Number(form.bottle_ml) : null
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
        alert('Save failed: ' + (err.error?.message || JSON.stringify(err)))
        return
      }
      const updated = await r.json()
      if (updated && updated.id) {
        setProducts((p) =>
          p.map((x) => (x.id === currentEditId ? { ...x, ...updated } : x))
        )
      }
      setEditId(null)
      setShowAdd(false)
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
    } else {
      const r = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!r.ok) {
        const err = await r.json()
        alert('Create failed: ' + (err.error?.message || JSON.stringify(err)))
        return
      }
      const created = await r.json()
      if (created && created.id) setProducts((p) => [created, ...p])
      setShowAdd(false)
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
    const r = await fetch(`/api/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_new: !p.is_new })
    })
    const updated = await r.json()
    setProducts((ps) =>
      ps.map((x) => (x.id === p.id ? { ...x, ...updated } : x))
    )
  }

  const startEdit = (p) => {
    setForm({
      brand: p.brand || '',
      name: p.name || '',
      notes: p.notes || '',
      category: p.category || 'niche',
      paid_amount: p.paid_amount != null ? String(p.paid_amount) : '',
      bottle_ml: p.bottle_ml != null ? String(p.bottle_ml) : '',
      p5: p.p5 != null ? p.p5 : 0,
      p10: p.p10 != null ? p.p10 : 0,
      p20: p.p20 != null ? p.p20 : 0,
      image_url: p.image_url || '',
      mrp: p.mrp != null ? p.mrp : null
    })
    setEditId(p.id)
    setShowAdd(true)
  }

  const filtered = products.filter(
    (p) =>
      !search ||
      `${p.brand} ${p.name}`.toLowerCase().includes(search.toLowerCase())
  )

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
        <div
          style={{
            display: 'flex',
            gap: 8,
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
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
      </div>

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
              background: '#0e0c0a',
              border: '0.5px solid rgba(176,144,96,0.25)',
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
                  color: 'rgba(255,255,255,0.4)',
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
                gridTemplateColumns: '1fr 1fr 1fr',
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
                    recalc(e.target.value, form.bottle_ml)
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
                    set('bottle_ml', e.target.value)
                    recalc(form.paid_amount, e.target.value)
                  }}
                />
              </div>
            </div>

            {/* Price fields — gold tint, user can override */}
            <div
              style={{
                background: 'rgba(176,144,96,0.04)',
                border: '0.5px solid rgba(176,144,96,0.12)',
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
                  ['p20', '20ml']
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
                  <span
                    style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}
                  >
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
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.5)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  padding: '9px 20px',
                  fontSize: 12
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveProduct}
                style={{
                  ...S.btn,
                  background: '#b09060',
                  color: '#fff',
                  padding: '9px 24px',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}
              >
                {editId ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
          marginBottom: 10
        }}
      >
        {filtered.length} products
      </div>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', padding: '2rem' }}>
          Loading...
        </div>
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
                      color: 'rgba(255,255,255,0.85)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}
                  >
                    ₹{p.p5} / ₹{p.p10} / ₹{p.p20} ·{' '}
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {p.category}
                    </span>
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
                      : 'rgba(255,255,255,0.04)',
                    color: p.is_new ? '#6aa0ff' : 'rgba(255,255,255,0.3)',
                    border: `0.5px solid ${p.is_new ? 'rgba(100,160,255,0.3)' : 'rgba(255,255,255,0.1)'}`
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
                    color: p.sold_out ? '#4caf7d' : '#dc5050',
                    border: `0.5px solid ${p.sold_out ? 'rgba(76,175,125,0.3)' : 'rgba(220,80,80,0.3)'}`
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
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.5)',
                    border: '0.5px solid rgba(255,255,255,0.1)'
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
                    border: '0.5px solid rgba(220,80,80,0.2)'
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
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          <span style={{ color: '#4caf7d' }}>
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
            background: 'rgba(176,144,96,0.05)',
            border: '0.5px solid rgba(176,144,96,0.2)',
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
                color: 'rgba(255,255,255,0.6)',
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
        <div style={{ color: 'rgba(255,255,255,0.3)', padding: '2rem' }}>
          Loading...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {partials.map((p) => {
            const mlLeft = Number(p.ml_left) || 0
            const fullMl = Number(p.full_ml) || 1
            const pct = Math.min(100, Math.round((mlLeft / fullMl) * 100))
            const color =
              pct > 50 ? '#4caf7d' : pct > 25 ? '#b09060' : '#dc5050'
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
                            : 'rgba(255,255,255,0.05)',
                          color: p.visible
                            ? '#4caf7d'
                            : 'rgba(255,255,255,0.3)',
                          border: `0.5px solid ${p.visible ? 'rgba(76,175,125,0.3)' : 'rgba(255,255,255,0.1)'}`
                        }}
                      >
                        {p.visible ? 'LIVE' : 'HIDDEN'}
                      </span>
                    </div>
                    <div
                      style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}
                    >
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
                          background: 'rgba(255,255,255,0.08)',
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
                        color: p.visible ? '#dc5050' : '#4caf7d',
                        border: `0.5px solid ${p.visible ? 'rgba(220,80,80,0.2)' : 'rgba(76,175,125,0.2)'}`
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
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(255,255,255,0.4)',
                        border: '0.5px solid rgba(255,255,255,0.1)'
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
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(255,255,255,0.4)',
                        border: '0.5px solid rgba(255,255,255,0.1)'
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
                        border: '0.5px solid rgba(220,80,80,0.2)'
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

// ── STOCK TAB (with auto sold-out) ───────────────────────────────────────────
const MIN_ML_TO_FULFIL = 7 // 5ml decant + 2ml headroom

function StockTab() {
  const [bottles, setBottles] = useState([])
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    brand: '',
    name: '',
    notes: '',
    start_ml: ''
  })
  const [autoSoldOutLog, setAutoSoldOutLog] = useState([])
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    Promise.all([
      fetch('/api/bottles').then((r) => r.json()),
      fetch('/api/orders').then((r) => r.json()),
      fetch('/api/products?admin=1').then((r) => r.json())
    ]).then(([b, o, p]) => {
      setBottles(Array.isArray(b) ? b : [])
      setOrders(Array.isArray(o) ? o : [])
      setProducts(Array.isArray(p) ? p : [])
      setLoading(false)
    })
  }, [])

  const calcUsed = useCallback(
    (bottleName) => {
      const key = bottleName.toLowerCase().trim()
      let used = 0
      for (const order of orders) {
        if (order.status === 'Cancelled') continue
        for (const item of order.items || []) {
          const itemName = `${item.name || ''}`.toLowerCase()
          if (itemName.includes(key) || key.includes(itemName.slice(0, 8))) {
            const ml = parseInt(item.size) || 0
            used += ml * (item.qty || 1)
          }
        }
      }
      return used
    },
    [orders]
  )

  // Auto sold-out: when remaining drops below MIN_ML_TO_FULFIL, mark matching product sold out
  const runAutoSoldOut = useCallback(
    async (bottlesWithStats) => {
      const log = []
      for (const bottle of bottlesWithStats) {
        if (bottle.remaining < MIN_ML_TO_FULFIL) {
          // Find matching product by name similarity
          const match = products.find((p) => {
            const pname = `${p.brand} ${p.name}`.toLowerCase()
            const bname = `${bottle.brand} ${bottle.name}`.toLowerCase()
            return (
              pname.includes(bottle.name.toLowerCase()) ||
              bname.includes(p.name.toLowerCase())
            )
          })
          if (match && !match.sold_out) {
            await fetch(`/api/products/${match.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sold_out: true })
            })
            setProducts((ps) =>
              ps.map((p) => (p.id === match.id ? { ...p, sold_out: true } : p))
            )
            log.push(
              `${match.brand} ${match.name} marked sold out (${bottle.remaining.toFixed(0)}ml left)`
            )
          }
        }
      }
      if (log.length > 0) setAutoSoldOutLog(log)
    },
    [products]
  )

  const addBottle = async () => {
    const r = await fetch('/api/bottles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: form.brand,
        name: form.name,
        start_ml: Number(form.start_ml),
        notes: form.notes
      })
    })
    const created = await r.json()
    setBottles((b) => [...b, created])
    setForm({ brand: '', name: '', notes: '', start_ml: '' })
    setShowAdd(false)
  }

  const deleteBottle = async (id) => {
    if (!confirm('Remove bottle from tracker?')) return
    await fetch(`/api/bottles/${id}`, { method: 'DELETE' })
    setBottles((b) => b.filter((x) => x.id !== id))
  }

  const bottlesWithStats = bottles
    .map((b) => {
      const used = calcUsed(b.name)
      const remaining = Math.max(0, b.start_ml - used)
      const pct = Math.round((remaining / b.start_ml) * 100)
      const canFulfil = remaining >= MIN_ML_TO_FULFIL
      const status = !canFulfil
        ? 'empty'
        : pct <= 15
          ? 'critical'
          : pct <= 35
            ? 'low'
            : 'good'
      const color = {
        empty: '#666',
        critical: '#dc5050',
        low: '#b09060',
        good: '#4caf7d'
      }[status]
      return { ...b, used, remaining, pct, status, color, canFulfil }
    })
    .sort((a, b) => a.pct - b.pct)

  // Run auto sold-out check whenever data loads
  useEffect(() => {
    if (!loading && bottlesWithStats.length > 0 && products.length > 0) {
      runAutoSoldOut(bottlesWithStats)
    }
  }, [loading])

  const critical = bottlesWithStats.filter(
    (b) => b.status === 'critical' || b.status === 'empty'
  ).length

  return (
    <div>
      {autoSoldOutLog.length > 0 && (
        <div
          style={{
            background: 'rgba(176,144,96,0.08)',
            border: '0.5px solid rgba(176,144,96,0.25)',
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
          {autoSoldOutLog.map((msg, i) => (
            <div
              key={i}
              style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}
            >
              • {msg}
            </div>
          ))}
        </div>
      )}

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
              fontSize: 18,
              color: 'rgba(255,255,255,0.9)',
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
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.3)',
              marginTop: 4
            }}
          >
            Products auto-mark sold out when bottle drops below{' '}
            {MIN_ML_TO_FULFIL}ml
          </div>
        </div>
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
          {showAdd ? 'Cancel' : '+ Add Bottle'}
        </button>
      </div>

      {showAdd && (
        <div
          style={{
            background: 'rgba(176,144,96,0.05)',
            border: '0.5px solid rgba(176,144,96,0.2)',
            borderRadius: 8,
            padding: '1.25rem',
            marginBottom: 20
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr 1fr',
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
            <div>
              <label style={S.lbl}>Bottle Size (ml)</label>
              <input
                style={S.inp}
                type='number'
                value={form.start_ml}
                onChange={(e) => set('start_ml', e.target.value)}
                placeholder='150'
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={S.lbl}>Notes (optional)</label>
            <input
              style={S.inp}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder='Bought Apr 2026, Scentoria'
            />
          </div>
          <button
            onClick={addBottle}
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
            Save Bottle
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', padding: '2rem' }}>
          Loading...
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))',
            gap: 12
          }}
        >
          {bottlesWithStats.map((b) => (
            <div
              key={b.id}
              style={{
                ...S.card,
                opacity: b.status === 'empty' ? 0.6 : 1,
                border: `0.5px solid ${b.status === 'critical' || b.status === 'empty' ? 'rgba(220,80,80,0.25)' : 'rgba(255,255,255,0.08)'}`
              }}
            >
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
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: 'var(--ff-serif)',
                  marginBottom: 10
                }}
              >
                {b.name}
              </div>
              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 4
                  }}
                >
                  <span
                    style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}
                  >
                    {b.remaining.toFixed(0)}ml left of {b.start_ml}ml
                  </span>
                  <span
                    style={{ fontSize: 11, color: b.color, fontWeight: 600 }}
                  >
                    {b.pct}%
                  </span>
                </div>
                <div
                  style={{
                    height: 5,
                    background: 'rgba(255,255,255,0.07)',
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
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <span
                    style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}
                  >
                    Used: {b.used}ml{' '}
                    {b.used > 0
                      ? `(~${Math.floor(b.used / 5)} × 5ml decants)`
                      : ''}
                  </span>
                  {!b.canFulfil && (
                    <div
                      style={{
                        fontSize: 9,
                        color: '#dc5050',
                        marginTop: 2,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase'
                      }}
                    >
                      ⚡ Too low to fulfil — product auto-marked sold out
                    </div>
                  )}
                </div>
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
              {b.notes && (
                <div
                  style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.2)',
                    marginTop: 6
                  }}
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

// ── PRICING TAB ──────────────────────────────────────────────────────────────
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
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12
          }}
        >
          {[
            ['5ml', result.p5],
            ['10ml', result.p10],
            ['20ml', result.p20]
          ].map(([size, price]) => (
            <div key={size} style={{ ...S.card, textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
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
            background: '#0e0c0a',
            border: '0.5px solid rgba(176,144,96,0.2)',
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
                    color: '#e05a5a',
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
                    color: '#e05a5a',
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
                  background:
                    otp.length < 6 ? 'rgba(176,144,96,0.4)' : '#b09060',
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
          background: '#0e0c0a',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
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
              color: 'rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.04)',
              padding: '5px 12px',
              border: '0.5px solid rgba(255,255,255,0.1)'
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
            ['stock', 'Stock'],
            ['pricing', 'Pricing']
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
                color: tab === id ? '#b09060' : 'rgba(255,255,255,0.4)',
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
        {tab === 'stock' && <StockTab />}
        {tab === 'pricing' && <PricingTab />}
      </div>
    </div>
  )
}
