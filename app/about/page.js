import Nav from '@/components/Nav'
import Link from 'next/link'

const FAQ = [
  [
    'How does decanting work?',
    'We source full bottles of authentic fragrances and decant them into clean glass atomisers. Every decant is from the same bottle — no mixing, no dilution.'
  ],
  [
    'Are the fragrances authentic?',
    'Yes. We only source authentic bottles — never counterfeits. Most come from authorised retailers or trusted grey market sources with verified authenticity.'
  ],
  [
    'What sizes do you offer?',
    'Standard decants come in 5ml, 10ml, and 20ml glass atomisers. Partials are sold as the remaining volume of the original bottle.'
  ],
  [
    'How do I order?',
    'Add items to cart, fill in your details, pay via UPI, then send your payment screenshot on WhatsApp. Your order is confirmed once we receive proof of payment.'
  ],
  [
    'Do you ship PAN India?',
    'Yes! Free shipping on orders above ₹3,000. Delivery takes 3–7 business days depending on your location.'
  ],
  [
    'What is your return policy?',
    'Due to the nature of fragrance products, we do not accept returns. If your order arrives damaged, WhatsApp us with a photo and we will make it right.'
  ],
  [
    'Do you do custom decants?',
    "If you want a fragrance we don't currently carry, WhatsApp us. If we can source it, we will."
  ]
]

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main
        style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 4vw 6rem' }}
      >
        <div style={{ marginBottom: '3rem' }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#b09060',
              marginBottom: 12
            }}
          >
            About Us
          </p>
          <h1
            style={{
              fontFamily: 'var(--ff-serif)',
              fontSize: 'clamp(2rem,4vw,2.8rem)',
              fontWeight: 400,
              color: 'var(--w92)',
              marginBottom: 16,
              lineHeight: 1.2
            }}
          >
            We believe everyone deserves to smell incredible.
          </h1>
          <p style={{ fontSize: 14, color: 'var(--w50)', lineHeight: 1.8 }}>
            Scent Snob Decants started as a personal obsession. Niche perfumes
            cost ₹15,000–₹50,000 a bottle — and most people never get to try
            them before committing. We fix that. We source authentic bottles,
            decant them ourselves, and ship them across India so you can explore
            the world of niche fragrance without the financial risk.
          </p>
        </div>

        <div
          style={{ borderTop: '0.5px solid var(--w06)', paddingTop: '2.5rem' }}
        >
          <h2
            style={{
              fontFamily: 'var(--ff-serif)',
              fontSize: '1.4rem',
              fontWeight: 400,
              color: 'var(--w85)',
              marginBottom: '1.5rem'
            }}
          >
            Frequently Asked Questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FAQ.map(([q, a]) => (
              <div
                key={q}
                style={{
                  borderBottom: '0.5px solid var(--w06)',
                  paddingBottom: 16
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--w85)',
                    fontWeight: 500,
                    marginBottom: 6
                  }}
                >
                  {q}
                </div>
                <div
                  style={{ fontSize: 13, color: 'var(--w40)', lineHeight: 1.7 }}
                >
                  {a}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: '3rem',
            padding: '1.5rem',
            background: 'var(--gold-05)',
            border: '0.5px solid var(--gold-15)',
            borderRadius: 8,
            textAlign: 'center'
          }}
        >
          <p style={{ fontSize: 14, color: 'var(--w60)', marginBottom: 10 }}>
            Questions? Just WhatsApp us.
          </p>
          <a
            href='https://wa.me/918754519509'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 24px',
              background: 'rgba(37,211,102,0.12)',
              border: '0.5px solid rgba(37,211,102,0.35)',
              borderRadius: 6,
              color: '#25d366',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '0.04em'
            }}
          >
            +91 87545 19509
          </a>
        </div>
      </main>
    </>
  )
}
