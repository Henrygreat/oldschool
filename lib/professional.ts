import { BusinessMemberRole, BusinessStatus, OpportunityStatus, Prisma } from '@prisma/client'
import { redirect } from 'next/navigation'
import { activeMessagingUser } from '@/lib/messaging'
import { prisma } from '@/lib/prisma'

/** Splits free text into a short, de-duplicated list of trimmed tags. */
export function parseTagList(value: string | null | undefined, maxItems = 12, maxLength = 60) {
  if (!value) return []
  const seen = new Map<string, string>()
  for (const part of value.split(/[,\n;]/)) {
    const tag = part.trim().replace(/\s+/g, ' ').slice(0, maxLength)
    if (tag && !seen.has(tag.toLowerCase())) seen.set(tag.toLowerCase(), tag)
    if (seen.size >= maxItems) break
  }
  return [...seen.values()]
}

/** Accepts only absolute http(s) URLs; returns null for anything else. */
export function safeUrl(value: string | null | undefined): string | null {
  const text = value?.trim()
  if (!text || text.length > 500) return null
  try {
    const url = new URL(text)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'business'
}

export async function uniqueBusinessSlug(name: string) {
  const base = slugify(name)
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`
    const existing = await prisma.business.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!existing) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

/** An opportunity is live when published and neither its expiry nor closing date has passed. */
export function liveOpportunityWhere(now = new Date()): Prisma.OpportunityWhereInput {
  return {
    status: OpportunityStatus.PUBLISHED,
    AND: [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      { OR: [{ closingDate: null }, { closingDate: { gt: now } }] },
    ],
  }
}

export function isOpportunityExpired(
  opportunity: { status: string; expiresAt: Date | null; closingDate: Date | null },
  now = new Date()
) {
  if (opportunity.status === OpportunityStatus.EXPIRED) return true
  if (opportunity.status !== OpportunityStatus.PUBLISHED) return false
  return Boolean(
    (opportunity.expiresAt && opportunity.expiresAt <= now) ||
      (opportunity.closingDate && opportunity.closingDate <= now)
  )
}

const managerRoles: BusinessMemberRole[] = [BusinessMemberRole.OWNER]

/** True when the user holds an OWNER membership of the business. */
export async function isBusinessOwner(businessId: string, userId: string) {
  const membership = await prisma.businessMember.findUnique({
    where: { businessId_userId: { businessId, userId } },
    select: { role: true },
  })
  return Boolean(membership && managerRoles.includes(membership.role))
}

export const publicBusinessSelect = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  industry: true,
  location: true,
  country: true,
  status: true,
} satisfies Prisma.BusinessSelect

export const visibleBusinessWhere = (schoolId: string): Prisma.BusinessWhereInput => ({
  schoolId,
  status: BusinessStatus.PUBLISHED,
})

export function parsePage(value: string | string[] | undefined) {
  const text = Array.isArray(value) ? value[0] : value
  const page = Number(text)
  return Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1
}

export function one(value: string | string[] | undefined, max = 80) {
  const text = (Array.isArray(value) ? value[0] : value)?.trim().slice(0, max)
  return text || undefined
}

/** Page guard: active same-school member, otherwise redirect to sign-in. */
export async function requireViewer(callbackUrl: string) {
  const viewer = await activeMessagingUser()
  if (!viewer) redirect(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  return viewer
}