import type { Metadata } from 'next'

export const SITE_URL = 'https://gcuobanetwork.org'
export const SITE_NAME = 'GCUOBA Network'
export const SITE_FULL_NAME = 'GCUOBA Network | Government College Umuahia Old Boys Association'
export const SITE_DESCRIPTION =
  'GCUOBA Network connects Government College Umuahia old boys through sets, chapters, events, professional networking and the alumni directory.'

/** Absolute canonical URL on the production domain, regardless of the request host. */
export function canonicalUrl(path = '/') {
  return new URL(path.startsWith('/') ? path : `/${path}`, SITE_URL).toString()
}

export const noIndex: Metadata['robots'] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false, noimageindex: true },
}

/**
 * Metadata for member-only / private areas. Titles are generic: no member, business,
 * listing or message data is ever placed in metadata for these pages.
 */
export function privateMetadata(title: string): Metadata {
  return { title, robots: noIndex, openGraph: { title, url: SITE_URL }, twitter: { title } }
}
