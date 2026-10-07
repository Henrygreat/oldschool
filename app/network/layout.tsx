import type { ReactNode } from 'react'
import { privateMetadata } from '@/lib/seo'

export const metadata = privateMetadata('My Network')

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
