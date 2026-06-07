import './globals.css'

export const metadata = {
  metadataBase: new URL('https://scentsnobdecants.vercel.app'),
  title: {
    default: 'Scent Snob Decants — Niche Perfume Decants India',
    template: '%s | Scent Snob Decants'
  },
  description:
    "India's premium niche perfume decant house. Try Xerjoff, Amouage, Creed, Tom Ford, Lattafa, Mancera, Parfums de Marly and 285+ fragrances in 5ml, 10ml, 20ml & 30ml sizes. Authentic decants, PAN India delivery. Starting ₹149.",
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
    'try before you buy perfume india',
    'parfums de marly decants',
    'mancera decants india',
    'initio decants india',
    'niche perfume bangalore',
    'perfume decants bangalore',
    'fragrance samples india',
    'arabic perfume decants india',
    'oud perfume samples india',
    'designer perfume decants',
    'perfume decant shop india',
    'buy fragrance samples online india',
    'partial bottle perfume india',
    'niche perfume online india'
  ],
  authors: [{ name: 'Scent Snob Decants' }],
  creator: 'Scent Snob Decants',
  publisher: 'Scent Snob Decants',
  category: 'shopping',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://scentsnobdecants.vercel.app',
    siteName: 'Scent Snob Decants',
    title: 'Scent Snob Decants — Niche Perfume Decants India',
    description:
      'Try 285+ niche, designer & Middle Eastern fragrances in small sizes. Authentic decants from personally sourced bottles. Starting ₹149. PAN India delivery.',
    images: [
      {
        url: '/hero.jpg',
        width: 1200,
        height: 630,
        alt: 'Scent Snob Decants — Premium Niche Perfume Decants India',
        type: 'image/jpeg'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    site: '@the_scent_snob_',
    creator: '@the_scent_snob_',
    title: 'Scent Snob Decants — Niche Perfume Decants India',
    description:
      'Try 285+ niche, designer & Middle Eastern fragrances in small sizes. Starting ₹149. PAN India delivery.',
    images: [{ url: '/hero.jpg', alt: 'Scent Snob Decants' }]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1
    }
  },
  alternates: {
    canonical: 'https://scentsnobdecants.vercel.app'
  },
  verification: {
    google: 'OF__TsA71H_Dy3SD2HjZ28B1VjR8VVlH6ygRljKz2mY'
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Scent Snob',
    'mobile-web-app-capable': 'yes',
    'theme-color': '#b09060'
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        {/* Inline script runs before paint — prevents dark/light flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function(){
            try {
              var t = localStorage.getItem('ssd_theme') || 'dark';
              document.documentElement.setAttribute('data-theme', t);
            } catch(e){}
          })();
        `
          }}
        />
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'Store',
                '@id': 'https://scentsnobdecants.vercel.app/#store',
                name: 'Scent Snob Decants',
                description:
                  "India's premium niche perfume decant house. Try 285+ fragrances from Xerjoff, Amouage, Creed, Tom Ford, Lattafa and more in small atomiser sizes.",
                url: 'https://scentsnobdecants.vercel.app',
                logo: 'https://scentsnobdecants.vercel.app/hero.jpg',
                image: 'https://scentsnobdecants.vercel.app/hero.jpg',
                telephone: '+91-87545-19509',
                sameAs: [
                  'https://www.instagram.com/the_scent_snob_/',
                  'https://wa.me/918754519509'
                ],
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: 'Bangalore',
                  addressRegion: 'Karnataka',
                  addressCountry: 'IN'
                },
                contactPoint: {
                  '@type': 'ContactPoint',
                  telephone: '+91-87545-19509',
                  contactType: 'customer service',
                  contactOption: 'TollFree',
                  areaServed: 'IN',
                  availableLanguage: ['English', 'Tamil', 'Hindi']
                },
                areaServed: { '@type': 'Country', name: 'India' },
                priceRange: '₹149 - ₹5,000',
                currenciesAccepted: 'INR',
                paymentAccepted:
                  'UPI, Credit Card, Debit Card, Net Banking, WhatsApp',
                openingHours: 'Mo-Su 09:00-21:00',
                hasOfferCatalog: {
                  '@type': 'OfferCatalog',
                  name: 'Perfume Decants',
                  itemListElement: [
                    { '@type': 'OfferCatalog', name: 'Niche Fragrances' },
                    { '@type': 'OfferCatalog', name: 'Designer Fragrances' },
                    {
                      '@type': 'OfferCatalog',
                      name: 'Middle Eastern Fragrances'
                    },
                    { '@type': 'OfferCatalog', name: 'Partial Bottles' }
                  ]
                }
              },
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                '@id': 'https://scentsnobdecants.vercel.app/#website',
                url: 'https://scentsnobdecants.vercel.app',
                name: 'Scent Snob Decants',
                description: "India's premium niche perfume decant house",
                publisher: {
                  '@id': 'https://scentsnobdecants.vercel.app/#store'
                },
                potentialAction: {
                  '@type': 'SearchAction',
                  target: {
                    '@type': 'EntryPoint',
                    urlTemplate:
                      'https://scentsnobdecants.vercel.app/?q={search_term_string}'
                  },
                  'query-input': 'required name=search_term_string'
                }
              },
              {
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: [
                  {
                    '@type': 'Question',
                    name: 'What are perfume decants?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Perfume decants are small portions of fragrances transferred into atomisers, allowing you to try a scent before buying a full bottle. We offer 5ml, 10ml, 20ml and 30ml sizes.'
                    }
                  },
                  {
                    '@type': 'Question',
                    name: 'Are the decants authentic?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Yes, all our decants are sourced from authentic, personally purchased bottles. We never deal in fakes.'
                    }
                  },
                  {
                    '@type': 'Question',
                    name: 'Do you ship across India?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Yes, we ship PAN India. Shipping is ₹160 and free on orders above ₹3,000.'
                    }
                  },
                  {
                    '@type': 'Question',
                    name: 'How do I place an order?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Add items to your cart and checkout online via UPI, cards, or net banking through Razorpay. You can also order via WhatsApp at +91 87545 19509.'
                    }
                  }
                ]
              }
            ])
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
