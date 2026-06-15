import PolicyLayout, { Section } from '@/components/PolicyLayout'

export const metadata = {
  title: 'Terms & Conditions',
  description:
    'Terms and conditions for using the Scent Snob Decants website and purchasing products.'
}

export default function TermsPage() {
  return (
    <PolicyLayout title='Terms & Conditions' updated='June 2026'>
      <Section heading='About Us'>
        Scent Snob Decants is an online retailer based in Bangalore, India,
        offering fragrance decants and partial bottles in smaller volumes (5ml,
        10ml, 20ml, and 30ml). By accessing or using this website, you agree to
        be bound by these Terms & Conditions.
      </Section>

      <Section heading='Product Authenticity'>
        All fragrances sold on this website are sourced from genuine, authentic
        bottles personally purchased by us. We do not sell counterfeit products.
        Decants and partials are portions of these authentic bottles,
        transferred into clean atomisers/bottles for sale in smaller quantities.
      </Section>

      <Section heading='Decants & Partials Explained'>
        <ul
          style={{
            paddingLeft: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <li>
            <strong>Decants:</strong> Smaller portions (5ml/10ml/20ml/30ml)
            transferred from an original full-size bottle into a fresh atomiser,
            allowing customers to try a fragrance before committing to a full
            bottle.
          </li>
          <li>
            <strong>Partials:</strong> The remaining volume of a specific opened
            bottle, sold as-is with the stated remaining quantity and condition
            disclosed at the time of listing.
          </li>
        </ul>
      </Section>

      <Section heading='Pricing & Payments'>
        All prices are listed in Indian Rupees (₹) and are inclusive of
        applicable taxes unless stated otherwise. Payments are processed
        securely via Razorpay (UPI, cards, netbanking) or via direct UPI
        transfer / WhatsApp order confirmation. We reserve the right to correct
        pricing errors and to modify prices at any time without prior notice.
      </Section>

      <Section heading='Order Acceptance'>
        Placing an order constitutes an offer to purchase. We reserve the right
        to refuse or cancel any order at our discretion, including in cases of
        suspected fraud, pricing errors, or stock unavailability. In such cases,
        any payment made will be refunded in full.
      </Section>

      <Section heading='Shipping & Delivery'>
        Please refer to our{' '}
        <a href='/shipping-policy' style={{ color: 'var(--gold)' }}>
          Shipping Policy
        </a>{' '}
        for delivery timelines, charges, and coverage details.
      </Section>

      <Section heading='Returns, Refunds & Cancellations'>
        Please refer to our{' '}
        <a href='/refund-policy' style={{ color: 'var(--gold)' }}>
          Refund & Cancellation Policy
        </a>{' '}
        for details on cancellations, damaged items, and refund eligibility.
      </Section>

      <Section heading='User Conduct'>
        You agree not to misuse this website, attempt unauthorized access to any
        part of it, or use it for any unlawful purpose. Wishlist, account, and
        order data are stored securely and used solely to facilitate your orders
        and improve your experience.
      </Section>

      <Section heading='Intellectual Property'>
        All content on this website — including text, images, logos, and design
        — is the property of Scent Snob Decants unless otherwise credited, and
        may not be reproduced without permission. Fragrance brand names
        referenced are the property of their respective trademark owners and are
        used solely to describe the products being decanted, with no affiliation
        implied.
      </Section>

      <Section heading='Limitation of Liability'>
        While we take care in sourcing and handling all products, we are not
        liable for indirect damages arising from product use, including allergic
        reactions. Customers with known sensitivities or allergies are advised
        to patch-test fragrances before extended use.
      </Section>

      <Section heading='Changes to These Terms'>
        We may update these Terms & Conditions from time to time. Continued use
        of the website after changes are posted constitutes acceptance of the
        revised terms.
      </Section>

      <Section heading='Contact'>
        For any questions regarding these terms, reach out to us via WhatsApp at
        +91 87545 19509 or Instagram @the_scent_snob_.
      </Section>
    </PolicyLayout>
  )
}
