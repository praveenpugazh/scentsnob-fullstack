import { supabaseAdmin } from '@/lib/supabase'
import nodemailer from 'nodemailer'

// Status → what customer sees
const STATUS_CONFIG = {
  Paid: {
    emoji: '✅',
    subject: (ref) => `Order Confirmed — ${ref}`,
    headline: 'Order Confirmed!',
    subline: "We've received your order and payment. We'll pack it shortly.",
    color: '#4caf7d',
    steps: [
      { label: 'Order Received', done: true },
      { label: 'Packing', done: false },
      { label: 'Shipped', done: false },
      { label: 'Delivered', done: false }
    ]
  },
  Processing: {
    emoji: '📦',
    subject: (ref) => `Your order ${ref} is being packed`,
    headline: "We're Packing Your Order",
    subline:
      'Your fragrances are being carefully packed and will be handed to the courier soon.',
    color: '#b09060',
    steps: [
      { label: 'Order Received', done: true },
      { label: 'Packing', done: true },
      { label: 'Shipped', done: false },
      { label: 'Delivered', done: false }
    ]
  },
  Shipped: {
    emoji: '🚚',
    subject: (ref) => `Your order ${ref} is on its way!`,
    headline: 'Your Order is Shipped!',
    subline:
      "Your fragrances are on their way to you. You'll receive them in 3–7 business days.",
    color: '#b09060',
    steps: [
      { label: 'Order Received', done: true },
      { label: 'Packed', done: true },
      { label: 'Shipped', done: true },
      { label: 'Delivered', done: false }
    ]
  },
  Delivered: {
    emoji: '🎉',
    subject: (ref) => `Your order ${ref} has been delivered`,
    headline: 'Delivered! Enjoy the scents 🧴',
    subline:
      'We hope you love your fragrances. Let us know what you think on Instagram!',
    color: '#4caf7d',
    steps: [
      { label: 'Order Received', done: true },
      { label: 'Packed', done: true },
      { label: 'Shipped', done: true },
      { label: 'Delivered', done: true }
    ]
  }
}

function makeTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  })
}

async function getCustomerEmail(userId) {
  if (!userId) return null
  const { data } = await supabaseAdmin().auth.admin.getUserById(userId)
  return data?.user?.email || null
}

function buildProgressBar(steps) {
  return steps
    .map(
      (step, i) => `
    <td style="text-align:center;padding:0 4px;">
      <div style="width:28px;height:28px;border-radius:50%;background:${step.done ? '#b09060' : '#1e1b18'};border:2px solid ${step.done ? '#b09060' : '#2a2520'};display:inline-flex;align-items:center;justify-content:center;margin-bottom:6px;">
        <span style="color:${step.done ? '#fff' : '#444'};font-size:12px;">${step.done ? '✓' : i + 1}</span>
      </div>
      <div style="font-size:9px;color:${step.done ? '#b09060' : '#444'};letter-spacing:0.08em;text-transform:uppercase;white-space:nowrap;">${step.label}</div>
    </td>
    ${i < steps.length - 1 ? `<td style="padding-bottom:20px;"><div style="height:2px;background:${step.done ? '#b09060' : '#1e1b18'};min-width:20px;"></div></td>` : ''}
  `
    )
    .join('')
}

function buildEmail(order, config, trackingNumber) {
  const firstName = (order.customer || 'there').split(' ')[0]
  const itemsHTML = (order.items || [])
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1e1b18;">
        <div style="color:#b09060;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px;">${item.brand || ''}</div>
        <div style="color:#fff;font-size:13px;">${item.name} <span style="color:#666;">(${item.size || ''})</span> ×${item.qty}</div>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #1e1b18;text-align:right;color:#fff;font-size:13px;vertical-align:top;">
        ₹${((item.price || 0) * (item.qty || 1)).toLocaleString('en-IN')}
      </td>
    </tr>
  `
    )
    .join('')

  const trackingBlock = trackingNumber
    ? `
    <tr><td style="padding:16px 0;">
      <div style="background:#1a1714;border:1px solid #2a2520;border-radius:6px;padding:14px;text-align:center;">
        <div style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px;">Tracking Number</div>
        <div style="color:#b09060;font-size:18px;font-weight:600;letter-spacing:0.08em;">${trackingNumber}</div>
      </div>
    </td></tr>
  `
    : ''

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0908;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0908;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;">

  <!-- Header -->
  <tr><td style="padding-bottom:24px;text-align:center;border-bottom:1px solid #1e1b18;">
    <div style="color:#b09060;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;margin-bottom:10px;">Scent Snob Decants</div>
    <div style="font-size:32px;margin-bottom:8px;">${config.emoji}</div>
    <div style="color:#fff;font-size:22px;font-weight:300;margin-bottom:8px;">${config.headline}</div>
    <div style="color:#666;font-size:13px;line-height:1.6;">Hey ${firstName}! ${config.subline}</div>
  </td></tr>

  <!-- Order ref -->
  <tr><td style="padding:20px 0 0;text-align:center;">
    <div style="display:inline-block;background:#1a1714;border:1px solid #2a2520;border-radius:6px;padding:10px 24px;">
      <div style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:2px;">Order ID</div>
      <div style="color:#b09060;font-size:18px;font-weight:600;letter-spacing:0.08em;">${order.order_ref}</div>
    </div>
  </td></tr>

  <!-- Progress tracker -->
  <tr><td style="padding:24px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr style="vertical-align:top;">
        ${buildProgressBar(config.steps)}
      </tr>
    </table>
  </td></tr>

  ${trackingBlock}

  <!-- Items -->
  <tr><td style="padding-bottom:16px;">
    <div style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px;">Your Items</div>
    <table width="100%" cellpadding="0" cellspacing="0">${itemsHTML}</table>
  </td></tr>

  <!-- Total -->
  <tr><td style="padding:12px 0;border-top:1px solid #1e1b18;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="color:#666;font-size:12px;">Subtotal</td>
        <td style="text-align:right;color:#fff;font-size:12px;">₹${(order.subtotal || 0).toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td style="color:#666;font-size:12px;padding-top:4px;">Shipping</td>
        <td style="text-align:right;color:#fff;font-size:12px;padding-top:4px;">${(order.shipping || 0) === 0 ? 'Free' : '₹' + (order.shipping || 0).toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td style="color:#fff;font-size:14px;font-weight:600;padding-top:10px;border-top:1px solid #2a2520;">Total</td>
        <td style="text-align:right;color:#b09060;font-size:16px;font-weight:600;padding-top:10px;border-top:1px solid #2a2520;">₹${(order.total || 0).toLocaleString('en-IN')}</td>
      </tr>
    </table>
  </td></tr>

  <!-- Shipping address -->
  ${
    order.address
      ? `
  <tr><td style="padding:16px 0;border-top:1px solid #1e1b18;">
    <div style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">Delivering to</div>
    <div style="color:#999;font-size:13px;line-height:1.7;">${order.customer}<br>${(order.address || '').replace(/,\s*/g, '<br>')}</div>
  </td></tr>
  `
      : ''
  }

  <!-- CTA -->
  <tr><td style="padding:20px 0;text-align:center;border-top:1px solid #1e1b18;">
    <a href="https://wa.me/918754519509?text=Hi%2C%20I%20have%20a%20query%20about%20my%20order%20${encodeURIComponent(order.order_ref)}"
      style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:13px;font-weight:500;letter-spacing:0.04em;">
      💬 Questions? WhatsApp Us
    </a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding-top:20px;border-top:1px solid #1e1b18;text-align:center;">
    <div style="color:#444;font-size:11px;line-height:1.8;">
      Scent Snob Decants · Bangalore, India<br>
      <a href="https://www.instagram.com/the_scent_snob_/" style="color:#b09060;text-decoration:none;">@the_scent_snob_</a>
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

// Main function — call this whenever order status changes
export async function notifyCustomer(order, newStatus, trackingNumber = null) {
  const config = STATUS_CONFIG[newStatus]
  if (!config) return // no email for this status (e.g. Cancelled, Pending)

  // 1. Send email (if we have the customer's email)
  try {
    const email = await getCustomerEmail(order.user_id)
    if (email) {
      const transporter = makeTransporter()
      await transporter.sendMail({
        from: `"Scent Snob Decants" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: config.subject(order.order_ref),
        html: buildEmail(order, config, trackingNumber)
      })
    }
  } catch (err) {
    console.error('Email notification failed:', err.message)
  }

  // 2. WhatsApp via Interakt (if configured)
  // Sign up free at interakt.ai — add INTERAKT_API_KEY to your env
  if (process.env.INTERAKT_API_KEY && order.phone) {
    try {
      const phone = String(order.phone).replace(/\D/g, '')
      const fullPhone = phone.startsWith('91') ? phone : `91${phone}`

      // Template names match what you create in Interakt dashboard
      const templateMap = {
        Paid: 'order_confirmed',
        Processing: 'order_packing',
        Shipped: 'order_shipped',
        Delivered: 'order_delivered'
      }
      const template = templateMap[newStatus]
      if (template) {
        await fetch('https://api.interakt.ai/v1/public/message/', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${process.env.INTERAKT_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            countryCode: '+91',
            phoneNumber: fullPhone.replace('91', ''),
            callbackData: order.order_ref,
            type: 'Template',
            template: {
              name: template,
              languageCode: 'en',
              bodyValues: [
                order.customer.split(' ')[0],
                order.order_ref,
                ...(trackingNumber ? [trackingNumber] : [])
              ]
            }
          })
        })
      }
    } catch (err) {
      console.error('WhatsApp notification failed:', err.message)
    }
  }
}
