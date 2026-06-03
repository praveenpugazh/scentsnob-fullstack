import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import nodemailer from 'nodemailer'

export async function POST(req) {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      customer,
      phone,
      address,
      items,
      subtotal,
      shipping,
      total,
      user_id,
      discount_code = null,
      discount_amount = 0
    } = await req.json()

    // 1. Verify signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex')

    if (expected !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      )
    }

    // 2. Generate order ref
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let orderRef = 'SS-'
    for (let i = 0; i < 6; i++)
      orderRef += chars[Math.floor(Math.random() * chars.length)]

    // 3. Save order as Paid
    const insertData = {
      order_ref: orderRef,
      customer,
      phone,
      address,
      items,
      subtotal,
      shipping,
      total,
      status: 'Paid',
      payment_id: razorpay_payment_id,
      razorpay_order_id,
      discount_code,
      discount_amount
    }
    if (user_id) insertData.user_id = user_id

    const { data: order, error } = await supabaseAdmin()
      .from('orders')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Order save failed' }, { status: 500 })
    }

    // 4. Increment discount code usage + record per-user use
    if (discount_code) {
      // Increment global used_count
      supabaseAdmin()
        .from('discount_codes')
        .select('used_count')
        .eq('code', discount_code)
        .single()
        .then(({ data: dc }) => {
          if (dc)
            supabaseAdmin()
              .from('discount_codes')
              .update({ used_count: (dc.used_count || 0) + 1 })
              .eq('code', discount_code)
              .then(() => {})
        })
      // Record per-user use so they can't use it again
      if (user_id) {
        supabaseAdmin()
          .from('discount_uses')
          .insert({ code: discount_code, user_id })
          .then(() => {})
      }
    }

    // 5. Send confirmation email to customer (fire and forget)
    sendOrderConfirmation(order, items).catch((e) =>
      console.error('Email error:', e)
    )

    // 6. WhatsApp notification to you (fire and forget)
    const waMsg = buildWANotification(order, items)
    fetch(
      `https://api.whatsapp.com/send?phone=918754519509&text=${encodeURIComponent(waMsg)}`
    ).catch(() => {})

    return NextResponse.json({ success: true, order_ref: orderRef, order })
  } catch (err) {
    console.error('verify-payment error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function sendOrderConfirmation(order, items) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
  })

  // Get customer email from Supabase if user_id exists
  let customerEmail = null
  if (order.user_id) {
    const { data } = await supabaseAdmin().auth.admin.getUserById(order.user_id)
    customerEmail = data?.user?.email
  }
  if (!customerEmail) return // guest order, no email

  const addressLines = (order.address || '').split('\n')
  const itemsHTML = (items || [])
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1e1b18;color:#999;font-size:13px;">
        <div style="color:#b09060;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px;">${item.brand}</div>
        <div style="color:#fff;">${item.name} <span style="color:#666;">(${item.size})</span></div>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #1e1b18;text-align:right;color:#fff;font-size:13px;">×${item.qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #1e1b18;text-align:right;color:#fff;font-size:13px;">₹${(item.price * item.qty).toLocaleString('en-IN')}</td>
    </tr>
  `
    )
    .join('')

  await transporter.sendMail({
    from: `"Scent Snob Decants" <${process.env.GMAIL_USER}>`,
    to: customerEmail,
    subject: `Order Confirmed — ${order.order_ref} 🧴`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0908;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0908;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

  <!-- Header -->
  <tr><td style="padding-bottom:32px;text-align:center;border-bottom:1px solid #1e1b18;">
    <div style="color:#b09060;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;margin-bottom:8px;">Scent Snob Decants</div>
    <div style="color:#fff;font-size:28px;font-weight:300;margin-bottom:8px;">Order Confirmed ✓</div>
    <div style="color:#666;font-size:13px;">Thank you, ${order.customer.split(' ')[0]}. Your order is confirmed and will be packed shortly.</div>
  </td></tr>

  <!-- Order ID -->
  <tr><td style="padding:24px 0 20px;text-align:center;">
    <div style="display:inline-block;background:#1a1714;border:1px solid #2a2520;border-radius:8px;padding:16px 32px;">
      <div style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px;">Order ID</div>
      <div style="color:#b09060;font-size:22px;font-weight:600;letter-spacing:0.08em;">${order.order_ref}</div>
    </div>
  </td></tr>

  <!-- Items -->
  <tr><td style="padding-bottom:20px;">
    <div style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:12px;">Your Order</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${itemsHTML}
    </table>
  </td></tr>

  <!-- Totals -->
  <tr><td style="background:#111;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="color:#666;font-size:13px;padding:4px 0;">Subtotal</td>
        <td style="color:#999;font-size:13px;text-align:right;padding:4px 0;">₹${order.subtotal.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td style="color:#666;font-size:13px;padding:4px 0;">Shipping</td>
        <td style="color:${order.shipping === 0 ? '#4caf7d' : '#999'};font-size:13px;text-align:right;padding:4px 0;">${order.shipping === 0 ? 'Free' : '₹' + order.shipping}</td>
      </tr>
      <tr>
        <td style="color:#fff;font-size:16px;font-weight:600;padding:12px 0 4px;border-top:1px solid #1e1b18;">Total Paid</td>
        <td style="color:#b09060;font-size:18px;font-weight:600;text-align:right;padding:12px 0 4px;border-top:1px solid #1e1b18;">₹${order.total.toLocaleString('en-IN')}</td>
      </tr>
    </table>
  </td></tr>

  <!-- Delivery address -->
  <tr><td style="padding:20px 0;">
    <div style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">Delivering to</div>
    <div style="color:#999;font-size:13px;line-height:1.8;">
      <span style="color:#fff;">${order.customer}</span> · ${order.phone}<br>
      ${addressLines.join('<br>')}
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding-top:24px;border-top:1px solid #1e1b18;text-align:center;">
    <div style="color:#444;font-size:12px;line-height:1.8;">
      Questions? WhatsApp us at <a href="https://wa.me/918754519509" style="color:#b09060;text-decoration:none;">+91 87545 19509</a><br>
      Follow us on Instagram <a href="https://instagram.com/the_scent_snob_" style="color:#b09060;text-decoration:none;">@the_scent_snob_</a>
    </div>
    <div style="color:#333;font-size:11px;margin-top:16px;">© 2026 Scent Snob Decants</div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>
    `
  })
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
    ...(items || []).map(
      (i) =>
        `• ${i.brand} ${i.name} (${i.size}) ×${i.qty} = ₹${i.price * i.qty}`
    ),
    ``,
    `Subtotal : ₹${order.subtotal}`,
    `Shipping : ${order.shipping === 0 ? 'Free' : `₹${order.shipping}`}`,
    `*Total   : ₹${order.total}*`,
    ``,
    `Payment ID: ${order.payment_id}`,
    `Status: ✅ PAID`
  ]
  return lines.join('\n')
}
