import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function PATCH(req, { params }) {
  const { id } = await params
  const body = await req.json()
  const { data, error } = await supabaseAdmin()
    .from('orders')
    .update(body)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}
