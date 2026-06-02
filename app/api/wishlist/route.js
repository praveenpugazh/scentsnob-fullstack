import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase(req) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

// GET — fetch all wishlist product IDs for user
export async function GET(req) {
  const supabase = getSupabase(req)
  const { data, error } = await supabase
    .from('wishlists')
    .select('product_id, created_at')
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST — add to wishlist
export async function POST(req) {
  const supabase = getSupabase(req)
  const { product_id } = await req.json()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('wishlists')
    .insert({ user_id: user.id, product_id })
  if (error && error.code !== '23505')
    // ignore duplicate
    return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — remove from wishlist
export async function DELETE(req) {
  const supabase = getSupabase(req)
  const { product_id } = await req.json()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('user_id', user.id)
    .eq('product_id', product_id)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true })
}

