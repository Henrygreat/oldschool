import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/', '/dashboard/', '/messages/', '/api/', '/auth/', '/members/', '/network/',
          '/profile/', '/directory/', '/archive/', '/sets/', '/chapters/', '/events/',
          '/professional/', '/businesses/', '/opportunities/',
          '/forgot-password', '/reset-password', '/account/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
