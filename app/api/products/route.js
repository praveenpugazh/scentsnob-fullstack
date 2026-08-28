import { supabase, supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

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

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const isAdmin = searchParams.get('admin') === '1'

  const query = isAdmin
    ? supabaseAdmin().from('products').select('*').order('brand')
    : supabase.from('products').select('*').eq('visible', true).order('brand')

  const { data, error } = await query
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req) {
  const raw = await req.json()
  const body = Object.fromEntries(
    Object.entries(raw).filter(([k]) => ALLOWED.has(k))
  )
  const { data, error } = await supabaseAdmin()
    .from('products')
    .insert([body])
    .select()
    .single()
  if (error) {
    console.error('products POST error:', JSON.stringify(error))
    return NextResponse.json({ error: error.message || error }, { status: 500 })
  }
  return NextResponse.json(data)
}
