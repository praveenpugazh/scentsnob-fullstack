import PolicyLayout, { Section } from '@/components/PolicyLayout'

export const metadata = {
  title: 'Refund & Cancellation Policy',
  description:
    'Refund, cancellation, and order issue resolution policy for Scent Snob Decants.'
}

export default function RefundPolicyPage() {
  return (
    <PolicyLayout title='Refund & Cancellation Policy' updated='June 2026'>
      <Section heading='Order Cancellations'>
        Orders can be cancelled free of charge as long as they have not yet been
        packed or dispatched. To request a cancellation, contact us on WhatsApp
        as soon as possible after placing your order with your order ID. Once an
        order has been shipped, it cannot be cancelled.
      </Section>

      <Section heading='Nature of Our Products'>
        Due to the nature of fragrance products — including hygiene
        considerations and the fact that decants and partials are measured,
        opened, and dispensed at the time of order — we generally do not accept
        returns or offer refunds for change of mind, scent preference, or
        "didn't like the smell" once an order has been delivered.
      </Section>

      <Section heading='Damaged, Leaked, or Incorrect Items'>
        We take great care in sourcing, decanting, and packaging every order.
        However, if your order arrives:
        <ul
          style={{
            paddingLeft: 20,
            marginTop: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <li>Damaged or leaking due to transit</li>
          <li>
            Incorrect (wrong fragrance, size, or quantity from what you ordered)
          </li>
          <li>Missing items from your order</li>
        </ul>
        <p style={{ marginTop: 10 }}>
          please contact us on WhatsApp within 48 hours of delivery with clear
          photos/video of the issue and your order ID. We will review the issue
          and, where verified, offer a replacement, store credit, or refund at
          our discretion.
        </p>
      </Section>

      <Section heading='Refund Method & Timeline'>
        Where a refund is approved, it will be processed to the original payment
        method (UPI/card/netbanking via Razorpay) within 5–7 business days of
        approval. For orders paid via UPI directly or WhatsApp, refunds will be
        made to the same UPI ID used for payment.
      </Section>

      <Section heading='Failed or Duplicate Payments'>
        If a payment is deducted from your account but the order does not
        reflect on our end, or if you are charged more than once for the same
        order due to a technical/payment gateway issue, please share your
        payment reference ID with us on WhatsApp. Verified duplicate or
        failed-but-debited payments will be refunded in full within 5–7 business
        days.
      </Section>

      <Section heading='Contact for Refund Requests'>
        All refund, cancellation, and order issue requests should be made via
        WhatsApp at +91 87545 19509 with your order ID and relevant details
        (photos, payment reference, etc.) for quick resolution.
      </Section>
    </PolicyLayout>
  )
}
