'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Nav from '@/components/Nav';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import PartialCard from '@/components/PartialCard';
import { UPI_ID, UPI_NAME, WA_NUMBER, FREE_SHIPPING_THRESHOLD, SHIPPING_CHARGE, formatINR } from '@/lib/pricing';

const COMBOS = [
  {
    id: 'summer-escape', label: 'Summer Escape', emoji: '☀️', tag: 'Summer Combo',
    tagline: 'Four fresh, aquatic and citrus scents built for Indian summers. Cool, clean, and office-safe.',
    color: '#7ec8e3', discountPct: 10,
    items: [
      { brand: 'Rasasi',        name: 'Hawas Ice',       size: '5ml', price: 379 },
      { brand: 'French Avenue', name: 'Frostbite',       size: '5ml', price: 349 },
      { brand: 'Rayhaan',       name: 'Aquatica',        size: '5ml', price: 209 },
      { brand: 'Afnan',         name: 'Turathi Blue',    size: '5ml', price: 229 },
    ],
  },
  {
    id: 'starter-pack', label: 'The Starter Pack', emoji: '🎯', tag: 'Starter Combo',
    tagline: 'New to fragrance? Four crowd-pleasing picks across amber, sweet, aquatic and leather.',
    color: '#4caf7d', discountPct: 10,
    items: [
      { brand: 'Lattafa', name: 'Asad Elixir',    size: '5ml', price: 179 },
      { brand: 'Afnan',   name: '9pm Elixir',     size: '5ml', price: 219 },
      { brand: 'Rayhaan', name: 'Aquatica',        size: '5ml', price: 209 },
      { brand: 'Armaf',   name: 'Odyssey Spectre', size: '5ml', price: 159 },
    ],
  },
];

function comboPrice(combo) {
  const original = combo.items.reduce((s, i) => s + i.price, 0);
  const discounted = Math.round(original * (1 - combo.discountPct / 100) / 10) * 10;
  return { original, discounted, saving: original - discounted };
}

function addComboToCart(combo, addToCart) {
  const { discounted } = comboPrice(combo);
  // Add each combo item to cart with discounted price split proportionally
  const original = combo.items.reduce((s, i) => s + i.price, 0);
  combo.items.forEach(item => {
    const discountedPrice = Math.round((item.price / original) * discounted / 10) * 10;
    addToCart(
      { id: `combo-${combo.id}-${item.name}`, brand: item.brand, name: item.name, isPartial: false },
      item.size,
      discountedPrice
    );
  });
}

const TABS = [
  { id: 'niche',     label: 'Niche' },
  { id: 'designer',  label: 'Designer' },
  { id: 'dupe',      label: 'Middle Eastern' },
  { id: 'brands',    label: 'Brands' },
  { id: 'partials',  label: 'Partials' },
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [partials, setPartials] = useState([]);
  const [cart, setCart]         = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('niche');
  const [search, setSearch]     = useState('');
  const [toast, setToast]       = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const catalogRef = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/partials').then(r => r.json()),
    ]).then(([prods, parts]) => {
      setProducts(Array.isArray(prods) ? prods : []);
      setPartials(Array.isArray(parts) ? parts : []);
      setLoading(false);
    });
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  const addToCart = useCallback((product, size, price) => {
    const key = `${product.id}-${size}`;
    setCart(c => ({
      ...c,
      [key]: c[key]
        ? { ...c[key], qty: c[key].qty + 1 }
        : { id: product.id, brand: product.brand, name: product.name, size, price, qty: 1, isPartial: !!product.isPartial }
    }));
    showToast(`${product.name} added`);
  }, []);

  const changeQty = useCallback((key, delta) => {
    setCart(c => {
      const item = c[key];
      if (!item) return c;
      if (item.qty + delta <= 0) { const { [key]: _, ...rest } = c; return rest; }
      return { ...c, [key]: { ...item, qty: item.qty + delta } };
    });
  }, []);

  const items         = Object.entries(cart);
  const subtotal      = items.reduce((a, [, b]) => a + b.price * b.qty, 0);
  const hasOnlyPartials = items.length > 0 && items.every(([, b]) => b.isPartial);
  const shipping      = (subtotal >= FREE_SHIPPING_THRESHOLD && !hasOnlyPartials) ? 0 : SHIPPING_CHARGE;
  const grandTotal    = subtotal + shipping;
  const cartCount     = items.reduce((a, [, b]) => a + b.qty, 0);

  const visiblePartials = partials.filter(p => p.visible && !p.sold_out);
  const searchQ = search.trim().toLowerCase();

  const allBrands  = [...new Set(products.map(p => p.brand))].sort();
  const newArrivals = [...products].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);

  // Products shown in catalogue grid
  const filtered = searchQ
    ? products.filter(p => `${p.brand} ${p.name} ${p.notes || ''}`.toLowerCase().includes(searchQ))
    : selectedBrand
      ? products.filter(p => p.brand === selectedBrand)
      : (tab === 'brands' || tab === 'partials')
        ? []
        : products.filter(p => p.category === tab);

  const filteredPartials = searchQ
    ? visiblePartials.filter(p => `${p.brand} ${p.name} ${p.notes || ''}`.toLowerCase().includes(searchQ))
    : tab === 'partials' ? visiblePartials : [];

  const scrollToCatalog = () => catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const switchTab = (id) => { setTab(id); setSelectedBrand(null); setSearch(''); };

  return (
    <>
      <Nav cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />

      {/* Announcement bar */}
      <div style={{ background:'#0e0c0a', borderBottom:'0.5px solid rgba(255,255,255,0.05)', padding:'7px 0', textAlign:'center', fontSize:11, color:'var(--t3)', letterSpacing:'0.1em' }}>
        Free shipping above ₹3,000 · PAN India · Free 2ml niche sample on orders above ₹4,999
      </div>

      {/* ── HERO ── */}
      <section style={{ position:'relative', overflow:'hidden', minHeight:'88vh', display:'flex', alignItems:'center' }}>
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          <img src="/hero.jpg" alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top', filter:'brightness(0.55) saturate(0.85)' }} />
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(105deg, rgba(10,9,8,0.98) 38%, rgba(10,9,8,0.7) 60%, rgba(10,9,8,0.15) 100%)' }} />
          <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundRepeat:'repeat', backgroundSize:'128px' }} />
        </div>
        <div style={{ position:'relative', zIndex:1, maxWidth:1400, margin:'0 auto', padding:'6rem 4vw 5rem', width:'100%' }}>
          <div style={{ maxWidth:620 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:28 }}>
              <div style={{ width:28, height:'0.5px', background:'var(--gold)', opacity:0.6 }} />
              <span style={{ fontSize:10, letterSpacing:'0.32em', textTransform:'uppercase', color:'var(--gold)', opacity:0.85 }}>India's Niche Decant House</span>
            </div>
            <h1 style={{ fontFamily:'var(--ff-serif)', fontSize:'clamp(2.6rem,5.5vw,4.4rem)', fontWeight:400, color:'rgba(255,255,255,0.95)', lineHeight:1.12, marginBottom:22, letterSpacing:'-0.01em' }}>
              Scent is the one<br />
              luxury <span style={{ color:'var(--gold)', position:'relative' }}>
                everyone
                <span style={{ position:'absolute', bottom:-4, left:0, right:0, height:'0.5px', background:'rgba(176,144,96,0.4)' }} />
              </span><br />
              deserves.
            </h1>
            <p style={{ fontSize:15, color:'rgba(255,255,255,0.45)', maxWidth:440, lineHeight:1.75, marginBottom:36 }}>
              Authentic decants from bottles we personally source.<br />Try before you commit to a full bottle.
            </p>
            <div style={{ display:'flex', gap:32, marginBottom:40 }}>
              {[[products.length || '247','Fragrances'],['5ml','Starting from'],['PAN India','Delivery']].map(([val, label]) => (
                <div key={label}>
                  <div style={{ fontFamily:'var(--ff-serif)', fontSize:'1.5rem', color:'rgba(255,255,255,0.85)', fontWeight:400 }}>{val}</div>
                  <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <button onClick={scrollToCatalog} style={{ padding:'13px 28px', borderRadius:4, background:'#b09060', border:'none', color:'#fff', fontFamily:'var(--ff-sans)', fontSize:12, fontWeight:500, letterSpacing:'0.12em', textTransform:'uppercase', cursor:'pointer' }}>
                Shop All Fragrances
              </button>
              <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer" style={{ padding:'13px 28px', borderRadius:4, background:'none', border:'0.5px solid rgba(255,255,255,0.2)', color:'rgba(255,255,255,0.65)', fontFamily:'var(--ff-sans)', fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:8 }}>
                💬 Ask on WhatsApp
              </a>
            </div>
          </div>
        </div>
        <div style={{ position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, opacity:0.35 }}>
          <span style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'#fff' }}>Scroll</span>
          <div style={{ width:0.5, height:32, background:'rgba(255,255,255,0.4)' }} />
        </div>
      </section>

      <main style={{ maxWidth:1400, margin:'0 auto', padding:'0 4vw 6rem' }}>

        {/* ── NEW ARRIVALS ── */}
        {!loading && newArrivals.length > 0 && (
          <section style={{ marginTop:'5rem', marginBottom:'5rem' }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:'1.5rem' }}>
              <div>
                <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ width:4, height:4, borderRadius:'50%', background:'var(--gold)' }} />
                  <span style={{ fontSize:10, letterSpacing:'0.24em', textTransform:'uppercase', color:'var(--gold)' }}>Just In</span>
                </div>
                <h2 style={{ fontFamily:'var(--ff-serif)', fontSize:'clamp(1.5rem,2.5vw,2rem)', fontWeight:400, color:'var(--t1)' }}>New Arrivals</h2>
              </div>
              <button onClick={scrollToCatalog} style={{ background:'none', border:'none', fontSize:12, color:'var(--t3)', cursor:'pointer', letterSpacing:'0.08em', textTransform:'uppercase' }}>View all →</button>
            </div>
            <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:12, scrollbarWidth:'none' }}>
              {newArrivals.map(p => (
                <div key={p.id} style={{ flexShrink:0, width:200 }}>
                  <ProductCard product={p} onAdd={addToCart} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── COMBOS ── */}
        <section style={{ marginBottom:'5rem', paddingTop:'5rem', borderTop:'0.5px solid var(--border)' }}>
          <div style={{ marginBottom:'2rem' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ width:4, height:4, borderRadius:'50%', background:'var(--gold)' }} />
              <span style={{ fontSize:10, letterSpacing:'0.24em', textTransform:'uppercase', color:'var(--gold)' }}>Curated Sets</span>
            </div>
            <h2 style={{ fontFamily:'var(--ff-serif)', fontSize:'clamp(1.5rem,2.5vw,2rem)', fontWeight:400, color:'var(--t1)', marginBottom:6 }}>
              Combo <span style={{ color:'var(--gold)' }}>Deals</span>
            </h2>
            <p style={{ fontSize:13, color:'var(--t3)', maxWidth:480 }}>Handpicked sets at {COMBOS[0]?.discountPct}% off. Perfect for gifting or exploring a new scent family.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:20 }}>
            {COMBOS.map(combo => {
              const { original, discounted, saving } = comboPrice(combo);
              return (
                <div key={combo.id} style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid var(--border)', borderRadius:10, padding:'1.5rem', display:'flex', flexDirection:'column', transition:'all .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(176,144,96,0.35)'; e.currentTarget.style.background='rgba(176,144,96,0.05)'; e.currentTarget.style.transform='translateY(-3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='rgba(255,255,255,0.02)'; e.currentTarget.style.transform='none'; }}
                >
                  <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(176,144,96,0.12)', border:'0.5px solid rgba(176,144,96,0.2)', borderRadius:4, padding:'4px 12px', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.7)', marginBottom:'1rem', alignSelf:'flex-start' }}>
                    {combo.emoji} {combo.tag}
                  </div>
                  <div style={{ fontFamily:'var(--ff-serif)', fontSize:'1.4rem', color:'var(--t1)', marginBottom:6 }}>{combo.label}</div>
                  <div style={{ fontSize:13, color:'var(--t3)', lineHeight:1.7, marginBottom:'1.25rem' }}>{combo.tagline}</div>
                  <div style={{ borderTop:'0.5px solid var(--border)', paddingTop:'1rem', marginBottom:'1.25rem' }}>
                    {combo.items.map((item, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom: i < combo.items.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <div>
                          <span style={{ fontSize:10, color:'var(--gold)', letterSpacing:'0.1em', textTransform:'uppercase' }}>{item.brand}</span>
                          <span style={{ fontSize:13, color:'var(--t1)', fontFamily:'var(--ff-serif)', marginLeft:8 }}>{item.name}</span>
                          <span style={{ fontSize:11, color:'var(--t3)', marginLeft:6 }}>({item.size})</span>
                        </div>
                        <span style={{ fontSize:13, color:'var(--t2)' }}>₹{item.price}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:'1rem' }}>
                    <div style={{ fontFamily:'var(--ff-serif)', fontSize:'1.8rem', fontWeight:300, color:'var(--gold)' }}>₹{discounted}</div>
                    <div style={{ fontSize:13, color:'var(--t3)', textDecoration:'line-through' }}>₹{original}</div>
                    <div style={{ fontSize:11, color:'#4caf7d', background:'rgba(76,175,125,0.1)', border:'0.5px solid rgba(76,175,125,0.2)', padding:'2px 8px', borderRadius:3 }}>Save ₹{saving}</div>
                  </div>
                  <button onClick={() => addComboToCart(combo, addToCart)} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'#b09060', color:'#fff', border:'none', padding:'12px 20px', borderRadius:6, width:'100%', fontFamily:'var(--ff-sans)', fontSize:12, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer' }}>
                    🧴 Add Combo to Cart
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── CATALOGUE ── */}
        <section ref={catalogRef} style={{ scrollMarginTop:72 }}>

          {/* Search */}
          <div style={{ position:'relative', maxWidth:600, margin:'0 auto 2.5rem' }}>
            <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--t3)', fontSize:16 }}>⌕</span>
            <input value={search} onChange={e => { setSearch(e.target.value); setSelectedBrand(null); }}
              placeholder="Search fragrances, brands, notes..."
              style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'0.5px solid var(--border)', borderRadius:6, padding:'12px 14px 12px 40px', fontSize:14, color:'var(--t1)', outline:'none', boxSizing:'border-box' }}
            />
            {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--t3)', cursor:'pointer', fontSize:18 }}>×</button>}
          </div>

          {/* Tab bar */}
          {!searchQ && (
            <div style={{ display:'flex', gap:0, marginBottom:'2rem', borderBottom:'0.5px solid var(--border)', overflowX:'auto', scrollbarWidth:'none' }}>
              {TABS.map(({ id, label }) => (
                <button key={id} onClick={() => switchTab(id)} style={{
                  background:'none', border:'none',
                  borderBottom: tab===id ? '2px solid var(--gold)' : '2px solid transparent',
                  color: tab===id ? 'var(--gold)' : 'var(--t3)',
                  padding:'10px 20px', fontSize:12, letterSpacing:'0.08em', textTransform:'uppercase',
                  cursor:'pointer', transition:'all .2s', fontFamily:'var(--ff-sans)', whiteSpace:'nowrap', flexShrink:0,
                }}>
                  {label}
                  {id === 'partials' && visiblePartials.length > 0 && (
                    <span style={{ marginLeft:6, fontSize:9, background:'rgba(176,144,96,0.2)', color:'var(--gold)', padding:'2px 6px', borderRadius:10, fontWeight:600 }}>
                      {visiblePartials.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── BRANDS TAB ── */}
          {!searchQ && tab === 'brands' && !selectedBrand && (
            <div>
              <p style={{ fontSize:12, color:'var(--t3)', marginBottom:16 }}>{allBrands.length} brands · {products.length} fragrances</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8 }}>
                {allBrands.map(brand => {
                  const count = products.filter(p => p.brand === brand).length;
                  return (
                    <button key={brand} onClick={() => setSelectedBrand(brand)} style={{ background:'rgba(255,255,255,0.02)', border:'0.5px solid var(--border)', borderRadius:6, padding:'14px 12px', cursor:'pointer', textAlign:'left', transition:'all .18s', fontFamily:'var(--ff-sans)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(176,144,96,0.4)'; e.currentTarget.style.background='rgba(176,144,96,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='rgba(255,255,255,0.02)'; }}
                    >
                      <div style={{ fontSize:12, color:'rgba(255,255,255,0.8)', fontWeight:500, marginBottom:4, lineHeight:1.3 }}>{brand}</div>
                      <div style={{ fontSize:10, color:'var(--t3)', letterSpacing:'0.08em' }}>{count} {count===1?'fragrance':'fragrances'}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Brand back + header */}
          {selectedBrand && (
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <button onClick={() => setSelectedBrand(null)} style={{ background:'none', border:'0.5px solid var(--border)', borderRadius:4, padding:'5px 10px', color:'var(--t3)', cursor:'pointer', fontSize:12, fontFamily:'var(--ff-sans)' }}>← All Brands</button>
              <div>
                <h3 style={{ fontFamily:'var(--ff-serif)', fontSize:'1.2rem', color:'var(--t1)', fontWeight:400 }}>{selectedBrand}</h3>
                <div style={{ fontSize:11, color:'var(--t3)' }}>{filtered.length} fragrances</div>
              </div>
            </div>
          )}

          {/* Search result count */}
          {searchQ && (
            <p style={{ fontSize:12, color:'var(--t3)', marginBottom:16 }}>
              {filtered.length + filteredPartials.length} result{(filtered.length + filteredPartials.length) !== 1 ? 's' : ''} for "{search}"
            </p>
          )}

          {/* Partials in search results */}
          {searchQ && filteredPartials.length > 0 && (
            <div style={{ marginBottom:32 }}>
              <p style={{ fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--gold)', marginBottom:12 }}>Partial Bottles</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
                {filteredPartials.map(p => <PartialCard key={p.id} partial={p} onAdd={addToCart} />)}
              </div>
            </div>
          )}

          {/* ── PARTIALS TAB ── */}
          {!searchQ && tab === 'partials' && (
            <div>
              {loading ? (
                <div style={{ textAlign:'center', padding:'4rem', color:'var(--t3)' }}>Loading...</div>
              ) : visiblePartials.length === 0 ? (
                <div style={{ textAlign:'center', padding:'5rem', color:'var(--t3)', border:'0.5px solid var(--border)', borderRadius:10 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>🧴</div>
                  <p style={{ fontFamily:'var(--ff-serif)', fontSize:'1.1rem', color:'var(--t2)', marginBottom:8 }}>No partials available right now</p>
                  <p style={{ fontSize:13 }}>Follow <a href="https://www.instagram.com/the_scent_snob_/" target="_blank" rel="noopener noreferrer" style={{ color:'var(--gold)' }}>@the_scent_snob_</a> for drop announcements</p>
                </div>
              ) : (
                <div>
                  <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:20 }}>
                    <div>
                      <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:6 }}>
                        <div style={{ width:4, height:4, borderRadius:'50%', background:'var(--gold)' }} />
                        <span style={{ fontSize:10, letterSpacing:'0.22em', textTransform:'uppercase', color:'var(--gold)' }}>Authenticated Partials</span>
                      </div>
                      <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.7, maxWidth:500 }}>
                        Authentic bottles from my personal collection. ₹160 shipping on all partials.
                      </p>
                    </div>
                    <span style={{ fontSize:12, color:'var(--t3)' }}>{visiblePartials.length} available</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
                    {visiblePartials.map(p => <PartialCard key={p.id} partial={p} onAdd={addToCart} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Product grid — niche / designer / dupe / brand filtered */}
          {loading ? (
            <div style={{ textAlign:'center', padding:'4rem', color:'var(--t3)' }}>Loading...</div>
          ) : (tab !== 'brands' && tab !== 'partials') || selectedBrand || searchQ ? (
            <>
              {filtered.length > 0 && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
                  {filtered.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} />)}
                </div>
              )}
              {!searchQ && filtered.length === 0 && tab !== 'brands' && tab !== 'partials' && (
                <div style={{ textAlign:'center', padding:'4rem', color:'var(--t3)' }}>No products in this category yet.</div>
              )}
            </>
          ) : null}

        </section>
      </main>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'rgba(176,144,96,0.95)', color:'#fff', padding:'10px 20px', borderRadius:6, fontSize:13, zIndex:999, letterSpacing:'0.04em', whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}

      <CartDrawer cart={cart} isOpen={cartOpen} onClose={() => setCartOpen(false)} onChange={changeQty} subtotal={subtotal} shipping={shipping} grandTotal={grandTotal} hasOnlyPartials={hasOnlyPartials} totalQty={cartCount} />

      <footer style={{ borderTop:'0.5px solid var(--border)', padding:'3rem 4vw 2.5rem', background:'#0a0908' }}>
        <div style={{ maxWidth:1400, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:32 }}>
          <div>
            <p style={{ fontFamily:'var(--ff-serif)', fontSize:'1.2rem', color:'var(--t1)', marginBottom:8 }}>Scent Snob <span style={{ color:'var(--gold)' }}>Decants</span></p>
            <p style={{ fontSize:12, color:'var(--t3)', lineHeight:1.8 }}>India's niche decant house.<br />Try before you commit.</p>
          </div>
          <div>
            <p style={{ fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--t3)', marginBottom:12 }}>Connect</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <a href="https://www.instagram.com/the_scent_snob_/" target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:8, color:'rgba(255,255,255,0.65)', fontSize:13, textDecoration:'none', transition:'color .15s' }}
                onMouseEnter={e => e.currentTarget.style.color='var(--gold)'}
                onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.65)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
                @the_scent_snob_
              </a>
              <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:8, color:'rgba(255,255,255,0.65)', fontSize:13, textDecoration:'none', transition:'color .15s' }}
                onMouseEnter={e => e.currentTarget.style.color='#25D366'}
                onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.65)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                +91 87545 19509
              </a>
            </div>
          </div>
          <div>
            <p style={{ fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--t3)', marginBottom:12 }}>Info</p>
            <div style={{ fontSize:12, color:'var(--t3)', lineHeight:2 }}>
              <div>Free shipping above ₹3,000</div>
              <div>₹160 flat on partials</div>
              <div>PAN India delivery</div>
              <div>UPI: praveenpugazh14@okicici</div>
            </div>
          </div>
        </div>
        <div style={{ maxWidth:1400, margin:'2rem auto 0', paddingTop:'1.5rem', borderTop:'0.5px solid rgba(255,255,255,0.05)', textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.2)' }}>
          © 2026 Scent Snob Decants · All rights reserved
        </div>
      </footer>
    </>
  );
}
