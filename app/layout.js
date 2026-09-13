import {
  siteName,
  siteUrl,
  seoTitle,
  seoDescription,
  instagram,
  googleVerification
} from '@/lib/config'
import './globals.css'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: seoTitle,
    template: '%s | Scent Snob Decants'
  },
  description:
    "India's premium niche perfume decant house. Try Xerjoff, Amouage, Creed, Tom Ford, Lattafa and 200+ fragrances in 5ml, 10ml & 20ml sizes. PAN India delivery. Starting ₹149.",
  keywords: [
    'perfume decants india',
    'niche perfume decants',
    'fragrance decants india',
    'buy perfume samples india',
    'xerjoff decants india',
    'amouage decants india',
    'creed aventus decants',
    'tom ford decants india',
    'lattafa decants',
    'middle eastern perfume india',
    'niche fragrance samples',
    'perfume atomizer india',
    'scent snob decants',
    'cheap perfume samples india',
    'try before you buy perfume india'
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    siteName: siteName,
    title: seoTitle,
    description:
      'Try 200+ niche, designer & Middle Eastern fragrances in small sizes. Authentic decants from personally sourced bottles. PAN India delivery.',
    images: [{ url: '/hero.jpg', width: 1200, height: 630, alt: siteName }]
  },
  twitter: {
    card: 'summary_large_image',
    title: seoTitle,
    description:
      'Try 200+ niche, designer & Middle Eastern fragrances in small sizes. PAN India delivery.',
    images: ['/hero.jpg'],
    creator: '@' + instagram
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  alternates: { canonical: siteUrl },
  verification: {
    google: 'OF__TsA71H_Dy3SD2HjZ28B1VjR8VVlH6ygRljKz2mY'
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <head>
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Store',
              name: siteName,
              description:
                "India's premium niche perfume decant house. Try 200+ fragrances in small sizes.",
              url: siteUrl,
              image: 'https://scentsnobdecants.vercel.app/hero.jpg',
              sameAs: ['https://www.instagram.com/the_scent_snob_/'],
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: '+91-87545-19509',
                contactType: 'customer service'
              },
              areaServed: { '@type': 'Country', name: 'India' },
              priceRange: '₹₹',
              currenciesAccepted: 'INR',
              paymentAccepted: 'UPI, Credit Card, Debit Card, Net Banking'
            })
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
