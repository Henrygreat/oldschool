import type { ReactNode } from 'react'
import { privateMetadata } from '@/lib/seo'

export const metadata = privateMetadata('Account security')

export default function Layout({ children }: { children: ReactNode }) {
  return children
}