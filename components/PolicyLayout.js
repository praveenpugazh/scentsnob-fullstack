import Nav from '@/components/Nav'

export default function PolicyLayout({ title, updated, children }) {
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
            Scent Snob Decants
          </p>
          <h1
            style={{
              fontFamily: 'var(--ff-serif)',
              fontSize: 'clamp(1.8rem,4vw,2.6rem)',
              fontWeight: 400,
              color: 'var(--w92)',
              marginBottom: 10,
              lineHeight: 1.2
            }}
          >
            {title}
          </h1>
          {updated && (
            <p style={{ fontSize: 12, color: 'var(--w35)' }}>
              Last updated: {updated}
            </p>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            fontSize: 14,
            color: 'var(--w65)',
            lineHeight: 1.8
          }}
        >
          {children}
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
            Questions about any of this? Just WhatsApp us.
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

export function Section({ heading, children }) {
  return (
    <div style={{ borderBottom: '0.5px solid var(--w06)', paddingBottom: 20 }}>
      {heading && (
        <h2
          style={{
            fontFamily: 'var(--ff-serif)',
            fontSize: '1.15rem',
            fontWeight: 500,
            color: 'var(--w85)',
            marginBottom: 10
          }}
        >
          {heading}
        </h2>
      )}
      {children}
    </div>
  )
}
