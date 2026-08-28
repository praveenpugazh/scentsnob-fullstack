import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { notifyCustomer } from '@/lib/notifyCustomer'

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

  // Fire customer notification when status changes
  if (body.status) {
    notifyCustomer(
      data,
      body.status,
      body.tracking_number || data.tracking_number
    ).catch((err) => console.error('notifyCustomer error:', err))
  }

  return NextResponse.json(data)
}

export async function DELETE(_, { params }) {
  const { id } = await params
  const { error } = await supabaseAdmin().from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true })
}
