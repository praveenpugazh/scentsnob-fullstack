import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req, { params }) {
  const { id } = await params
  const body = await req.json()
  const { data, error } = await supabaseAdmin()
    .from('discount_codes')
    .update(body)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_, { params }) {
  const { id } = await params
  const { error } = await supabaseAdmin()
    .from('discount_codes')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true })
}
