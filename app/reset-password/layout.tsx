import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { privateMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  ...privateMetadata('Reset password'),
  // Keeps the one-time token out of Referer headers sent to any other site.
  referrer: 'no-referrer',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}