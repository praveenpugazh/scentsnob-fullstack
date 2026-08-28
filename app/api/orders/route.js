import { supabase, supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { deductMl } from '@/lib/deductMl'

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req) {
  const body = await req.json()

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let orderRef = 'SS-'
  for (let i = 0; i < 6; i++)
    orderRef += chars[Math.floor(Math.random() * chars.length)]

  const insertData = {
    order_ref: orderRef,
    customer: body.customer,
    phone: body.phone,
    address: body.address,
    items: body.items,
    subtotal: body.subtotal,
    shipping: body.shipping,
    total: body.total,
    status: body.status || 'Pending',
    payment_id: body.payment_id || null,
    notes: body.notes || null
  }
  if (body.user_id) insertData.user_id = body.user_id

  const { data, error } = await supabaseAdmin()
    .from('orders')
    .insert([insertData])
    .select()
    .single()

  if (error) return NextResponse.json({ error }, { status: 500 })

  // Deduct ml from products
  await deductMl(body.items)

  return NextResponse.json(data)
}
