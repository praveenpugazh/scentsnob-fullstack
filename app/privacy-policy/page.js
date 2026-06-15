import PolicyLayout, { Section } from '@/components/PolicyLayout'

export const metadata = {
  title: 'Privacy Policy',
  description:
    'How Scent Snob Decants collects, uses, and protects your personal information.'
}

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout title='Privacy Policy' updated='June 2026'>
      <Section heading='Information We Collect'>
        When you create an account, place an order, or contact us, we may
        collect: your name, phone number, email address, shipping address, and
        order details. We also collect basic usage data (such as wishlist items
        and cart contents) to improve your shopping experience.
      </Section>

      <Section heading='How We Use Your Information'>
        <ul
          style={{
            paddingLeft: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <li>To process and deliver your orders</li>
          <li>
            To send order confirmations, shipping updates, and customer support
            communication via email or WhatsApp
          </li>
          <li>To verify your identity via OTP-based login</li>
          <li>To maintain your wishlist and order history</li>
          <li>To apply discount codes and enforce per-user usage limits</li>
        </ul>
      </Section>

      <Section heading='Payment Information'>
        All online payments are processed securely through Razorpay. We do not
        store your card, UPI, or banking details on our servers — these are
        handled directly by Razorpay's PCI-compliant payment infrastructure.
      </Section>

      <Section heading='Data Storage & Security'>
        Your data is stored securely using Supabase (a managed database
        provider) with industry-standard security practices. Access to customer
        data is restricted to authorized personnel only.
      </Section>

      <Section heading='Third-Party Services'>
        We use the following trusted third-party services to operate our store:
        <ul
          style={{
            paddingLeft: 20,
            marginTop: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <li>
            <strong>Razorpay</strong> — payment processing
          </li>
          <li>
            <strong>Supabase</strong> — database and authentication
          </li>
          <li>
            <strong>Cloudinary</strong> — image hosting
          </li>
          <li>
            <strong>Gmail/Google Workspace</strong> — order and OTP email
            notifications
          </li>
        </ul>
        Each of these providers has their own privacy policies governing the
        data they process on our behalf.
      </Section>

      <Section heading='Communication'>
        By placing an order or creating an account, you consent to receive
        order-related communication via email and WhatsApp. We do not send
        promotional messages without consent and do not sell or share your
        personal data with third parties for marketing purposes.
      </Section>

      <Section heading='Your Rights'>
        You may request access to, correction of, or deletion of your personal
        data by contacting us via WhatsApp. We will respond to such requests
        within a reasonable timeframe, subject to any legal or operational
        requirements to retain certain records (such as order history for tax
        purposes).
      </Section>

      <Section heading='Cookies & Local Storage'>
        Our website uses local storage in your browser to remember your cart,
        theme preference (light/dark mode), and tab selections for a smoother
        experience. This data stays on your device and is not transmitted to our
        servers except where needed to complete a purchase.
      </Section>

      <Section heading='Changes to This Policy'>
        We may update this Privacy Policy from time to time to reflect changes
        in our practices. Updates will be posted on this page with a revised
        "last updated" date.
      </Section>

      <Section heading='Contact'>
        For privacy-related questions or requests, contact us via WhatsApp at
        +91 87545 19509.
      </Section>
    </PolicyLayout>
  )
}
