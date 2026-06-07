import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const revalidate = 3600 // regenerate every hour

export default async function sitemap() {
  const baseUrl = 'https://scentsnobdecants.vercel.app'

  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0
    },
    {
      url: `${baseUrl}/?tab=brands`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9
    },
    {
      url: `${baseUrl}/?tab=partials`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8
    },
    {
      url: `${baseUrl}/?tab=about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2
    }
  ]

  // Try to get distinct brands for richer sitemap entries
  try {
    const { data: products } = await supabase
      .from('products')
      .select('brand, updated_at')
      .eq('visible', true)
      .order('brand')

    if (products?.length) {
      const seen = new Set()
      const brandRoutes = products
        .filter((p) => {
          if (seen.has(p.brand)) return false
          seen.add(p.brand)
          return true
        })
        .map((p) => ({
          url: `${baseUrl}/?tab=brands&brand=${encodeURIComponent(p.brand)}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.7
        }))
      return [...staticRoutes, ...brandRoutes]
    }
  } catch {}

  return staticRoutes
}

