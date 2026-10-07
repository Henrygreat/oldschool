import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { SITE_DESCRIPTION, SITE_FULL_NAME, SITE_NAME, SITE_URL } from '@/lib/seo'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_FULL_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: SITE_FULL_NAME,
    description: SITE_DESCRIPTION,
    locale: 'en_NG',
  },
  twitter: { card: 'summary', title: SITE_FULL_NAME, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = { themeColor: '#9C0621' }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}