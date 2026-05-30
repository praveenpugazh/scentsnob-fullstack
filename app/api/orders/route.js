import { supabase, supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req) {
  const body = await req.json();

  // Auto-generate order ref
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  const orderRef = `SS-${String((count || 0) + 1).padStart(3, '0')}`;

  // Build insert object — include user_id only if provided
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
  };
  if (body.user_id) insertData.user_id = body.user_id;

  const { data, error } = await supabaseAdmin()
    .from('orders')
    .insert([insertData])
    .select()
    .single();

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}
