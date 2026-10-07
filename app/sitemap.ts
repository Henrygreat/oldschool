import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

// Member areas require sign-in, so only public pages are listed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/about/history`, changeFrequency: 'yearly', priority: 0.7 },
    { url: `${SITE_URL}/about/anthem`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/about/principals`, changeFrequency: 'yearly', priority: 0.5 },
  ]
}