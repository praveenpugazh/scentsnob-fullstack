import { supabaseAdmin } from '@/lib/supabase'

const RESERVE_ML = 10 // ml you keep for yourself per product

// Deducts ml from products based on order items.
// items: [{ brand, name, size, qty }]
export async function deductMl(items) {
  if (!Array.isArray(items) || items.length === 0) return

  const parseMl = (size) => {
    const n = parseFloat(String(size).replace(/[^0-9.]/g, ''))
    return isNaN(n) ? 0 : n
  }

  for (const item of items) {
    if (item.isPartial) continue
    const ml = parseMl(item.size) * (item.qty || 1)
    if (!ml || !item.brand || !item.name) continue

    const { data: matches } = await supabaseAdmin()
      .from('products')
      .select('id, ml_remaining, bottle_ml')
      .ilike('brand', item.brand.trim())
      .ilike('name', item.name.trim())
      .limit(1)

    if (!matches || matches.length === 0) continue
    const product = matches[0]

    const currentMl =
      product.ml_remaining ??
      (product.bottle_ml ? product.bottle_ml - RESERVE_ML : null)
    if (currentMl === null) continue

    const newMl = Math.max(0, currentMl - ml)
    const hitReserve = newMl <= RESERVE_ML

    const update = { ml_remaining: newMl }
    if (hitReserve) {
      update.sold_out = true
      update.visible = false
    }

    await supabaseAdmin().from('products').update(update).eq('id', product.id)
  }
}
