import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Known product columns — strip anything not in this list
// so unknown fields don't cause 500s when schema is behind
const ALLOWED = new Set([
  'brand',
  'name',
  'notes',
  'category',
  'p5',
  'p10',
  'p20',
  'p30',
  'paid_amount',
  'bottle_ml',
  'ml_remaining',
  'image_url',
  'mrp',
  'visible',
  'sold_out',
  'is_new',
  'accords',
  'margin'
])

export async function PATCH(req, { params }) {
  const { id } = await params
  const raw = await req.json()

  // Only send columns that exist in our schema
  const body = Object.fromEntries(
    Object.entries(raw).filter(([k]) => ALLOWED.has(k))
  )

  const { data, error } = await supabaseAdmin()
    .from('products')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('products PATCH error:', JSON.stringify(error))
    return NextResponse.json({ error: error.message || error }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(_, { params }) {
  const { id } = await params
  const { error } = await supabaseAdmin().from('products').delete().eq('id', id)
  if (error) {
    console.error('products DELETE error:', JSON.stringify(error))
    return NextResponse.json({ error: error.message || error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
