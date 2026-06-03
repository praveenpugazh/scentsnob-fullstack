import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET — validate a discount code
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')?.toUpperCase().trim()
  const orderValue = Number(searchParams.get('order_value') || 0)

  if (!code)
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })

  const { data, error } = await supabaseAdmin()
    .from('discount_codes')
    .select('*')
    .eq('code', code)
    .eq('active', true)
    .single()

  if (error || !data)
    return NextResponse.json(
      { error: 'Invalid or expired discount code' },
      { status: 404 }
    )

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date())
    return NextResponse.json(
      { error: 'This discount code has expired' },
      { status: 400 }
    )

  // Check max uses
  if (data.max_uses !== null && data.used_count >= data.max_uses)
    return NextResponse.json(
      { error: 'This discount code has reached its usage limit' },
      { status: 400 }
    )

  // Check minimum order
  if (orderValue < data.min_order)
    return NextResponse.json(
      { error: `Minimum order value of ${formatINR(data.min_order)} required` },
      { status: 400 }
    )

  // Calculate discount
  const discountAmount =
    data.type === 'percent'
      ? Math.round((orderValue * data.value) / 100)
      : Math.min(data.value, orderValue)

  return NextResponse.json({
    valid: true,
    code: data.code,
    type: data.type,
    value: data.value,
    discount_amount: discountAmount,
    message:
      data.type === 'percent'
        ? `${data.value}% off applied`
        : `₹${data.value} off applied`
  })
}

function formatINR(n) {
  return `₹${Number(n).toLocaleString('en-IN')}`
}
