import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

// Member areas require sign-in, so only the public landing page is listed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 }]
}
