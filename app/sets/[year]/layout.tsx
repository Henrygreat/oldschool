import type { ReactNode } from 'react'
import { privateMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params
  return privateMetadata(/^\d{4}$/.test(year) ? `Set of ${year}` : 'Set')
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}