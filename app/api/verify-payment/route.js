import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req) {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      // Order details to save
      customer, phone, address, items, subtotal, shipping, total, user_id,
    } = await req.json();

    // 1. Verify signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    // 2. Generate order ref
    const { count } = await supabaseAdmin()
      .from('orders')
      .select('*', { count: 'exact', head: true });

    const orderRef = `SS-${String((count || 0) + 1).padStart(3, '0')}`;

    // 3. Save order as Paid
    const insertData = {
      order_ref:          orderRef,
      customer,
      phone,
      address,
      items,
      subtotal,
      shipping,
      total,
      status:             'Paid',
      payment_id:         razorpay_payment_id,
      razorpay_order_id,
    };
    if (user_id) insertData.user_id = user_id;

    const { data: order, error } = await supabaseAdmin()
      .from('orders')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Order save failed' }, { status: 500 });
    }

    // 4. Send WhatsApp notification to you
    const waMsg = buildWANotification(order, items);
    // Fire-and-forget — don't block on this
    fetch(`https://api.whatsapp.com/send?phone=918754519509&text=${encodeURIComponent(waMsg)}`).catch(() => {});

    return NextResponse.json({ success: true, order_ref: orderRef, order });
  } catch (err) {
    console.error('verify-payment error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function buildWANotification(order, items) {
  const lines = [
    `💰 *New Paid Order — ${order.order_ref}*`,
    ``,
    `👤 ${order.customer}`,
    `📱 ${order.phone}`,
    `📍 ${order.address}`,
    ``,
    `*Items:*`,
    ...(items || []).map(i => `• ${i.brand} ${i.name} (${i.size}) ×${i.qty} = ₹${i.price * i.qty}`),
    ``,
    `Subtotal : ₹${order.subtotal}`,
    `Shipping : ${order.shipping === 0 ? 'Free' : `₹${order.shipping}`}`,
    `*Total   : ₹${order.total}*`,
    ``,
    `Payment ID: ${order.payment_id}`,
    `Status: ✅ PAID`,
  ];
  return lines.join('\n');
}
