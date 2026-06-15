import Nav from '@/components/Nav'

export const metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with Scent Snob Decants via WhatsApp, Instagram, or email.'
}

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main
        style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 4vw 6rem' }}
      >
        <div style={{ marginBottom: '2.5rem' }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              marginBottom: 12
            }}
          >
            Get In Touch
          </p>
          <h1
            style={{
              fontFamily: 'var(--ff-serif)',
              fontSize: 'clamp(1.8rem,4vw,2.6rem)',
              fontWeight: 400,
              color: 'var(--w92)',
              marginBottom: 16,
              lineHeight: 1.2
            }}
          >
            Contact Us
          </h1>
          <p style={{ fontSize: 14, color: 'var(--w50)', lineHeight: 1.8 }}>
            Have a question about an order, a fragrance, or want to request
            something we don't currently stock? Reach out — we usually respond
            within a few hours.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <a
            href='https://wa.me/918754519509'
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '1.1rem 1.4rem',
              background: 'rgba(37,211,102,0.08)',
              border: '0.5px solid rgba(37,211,102,0.25)',
              borderRadius: 8
            }}
          >
            <div style={{ fontSize: 22 }}>💬</div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--w85)',
                  marginBottom: 2
                }}
              >
                WhatsApp
              </div>
              <div style={{ fontSize: 13, color: '#25d366' }}>
                +91 87545 19509
              </div>
            </div>
          </a>

          <a
            href='https://www.instagram.com/the_scent_snob_/'
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '1.1rem 1.4rem',
              background: 'var(--gold-05)',
              border: '0.5px solid var(--gold-15)',
              borderRadius: 8
            }}
          >
            <div style={{ fontSize: 22 }}>📷</div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--w85)',
                  marginBottom: 2
                }}
              >
                Instagram
              </div>
              <div style={{ fontSize: 13, color: 'var(--gold)' }}>
                @the_scent_snob_
              </div>
            </div>
          </a>

          <a
            href='mailto:thescentsnobb@gmail.com'
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '1.1rem 1.4rem',
              background: 'var(--w04)',
              border: '0.5px solid var(--w10)',
              borderRadius: 8
            }}
          >
            <div style={{ fontSize: 22 }}>✉️</div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--w85)',
                  marginBottom: 2
                }}
              >
                Email
              </div>
              <div style={{ fontSize: 13, color: 'var(--w60)' }}>
                thescentsnobb@gmail.com
              </div>
            </div>
          </a>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '1.1rem 1.4rem',
              background: 'var(--w04)',
              border: '0.5px solid var(--w10)',
              borderRadius: 8
            }}
          >
            <div style={{ fontSize: 22 }}>📍</div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--w85)',
                  marginBottom: 2
                }}
              >
                Based in
              </div>
              <div style={{ fontSize: 13, color: 'var(--w60)' }}>
                Bangalore, Karnataka, India — shipping PAN India
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
