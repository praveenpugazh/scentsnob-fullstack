import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from('discount_codes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req) {
  const body = await req.json()
  const insertData = {
    code: body.code.toUpperCase().trim(),
    type: body.type || 'percent',
    value: Number(body.value),
    min_order: Number(body.min_order || 0),
    max_uses: body.max_uses ? Number(body.max_uses) : null,
    active: true,
    expires_at: body.expires_at || null
  }
  const { data, error } = await supabaseAdmin()
    .from('discount_codes')
    .insert([insertData])
    .select()
    .single()
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}
