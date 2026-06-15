import PolicyLayout, { Section } from '@/components/PolicyLayout'

export const metadata = {
  title: 'Shipping Policy',
  description:
    'Shipping rates, delivery timelines, and PAN India delivery information for Scent Snob Decants.'
}

export default function ShippingPolicyPage() {
  return (
    <PolicyLayout title='Shipping Policy' updated='June 2026'>
      <Section heading='Delivery Coverage'>
        We ship across India (PAN India delivery) via reputed courier partners.
        Once your order is confirmed and processed, it is handed over for
        dispatch within 1–2 business days.
      </Section>

      <Section heading='Shipping Charges'>
        <ul
          style={{
            paddingLeft: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <li>
            Orders above ₹3,000:{' '}
            <strong style={{ color: 'var(--gold)' }}>Free shipping</strong>
          </li>
          <li>Orders below ₹3,000: ₹160 flat shipping fee</li>
          <li>
            Partial bottle orders: ₹160 shipping fee (regardless of order value)
          </li>
        </ul>
      </Section>

      <Section heading='Delivery Timelines'>
        Once dispatched, orders typically arrive within 3–7 business days
        depending on your location. Metro cities usually receive orders faster
        (3–5 days), while remote areas may take slightly longer (5–7 days).
      </Section>

      <Section heading='Order Tracking'>
        Once your order is shipped, you will receive a confirmation with
        tracking details via email and/or WhatsApp so you can monitor its
        progress.
      </Section>

      <Section heading='Packaging'>
        All fragrances are carefully packaged in protective materials to prevent
        leakage or breakage during transit. Atomisers and decant bottles are
        individually wrapped and cushioned.
      </Section>

      <Section heading='Delayed or Lost Shipments'>
        While we work with reliable courier partners, occasional delays due to
        weather, regional disruptions, or courier-side issues can occur and are
        outside our direct control. If your order is significantly delayed or
        appears lost in transit, please reach out to us on WhatsApp with your
        order details and we will coordinate with the courier on your behalf.
      </Section>

      <Section heading='Incorrect Address'>
        Please ensure your shipping address, pincode, and phone number are
        accurate at checkout. We are not responsible for delays or non-delivery
        caused by incorrect or incomplete address details provided by the
        customer. If you notice an error after placing your order, contact us
        immediately on WhatsApp so we can attempt to correct it before dispatch.
      </Section>
    </PolicyLayout>
  )
}
