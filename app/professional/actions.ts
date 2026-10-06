'use server'

import { BusinessMemberRole, BusinessStatus, OpportunityStatus, OpportunityType, WorkMode } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { currentModerator } from '@/lib/admin'
import { activeMessagingUser } from '@/lib/messaging'
import { isBusinessOwner, parseTagList, safeUrl, uniqueBusinessSlug } from '@/lib/professional'
import { listingReportReasons } from '@/lib/professional-shared'
import { prisma } from '@/lib/prisma'

export type ListingActionResult = { ok: true } | { ok: false; error: string }

const MAX_BUSINESSES_PER_OWNER = 10
const MAX_OPEN_OPPORTUNITIES_PER_USER = 25
const DEFAULT_OPPORTUNITY_DAYS = 90

function text(formData: FormData, key: string, max: number) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function optionalText(formData: FormData, key: string, max: number) {
  return text(formData, key, max) || null
}

function flag(formData: FormData, key: string) {
  return formData.get(key) === 'on'
}

function optionalInt(formData: FormData, key: string, min: number, max: number) {
  const raw = text(formData, key, 10)
  if (!raw) return null
  const value = Number(raw)
  return Number.isInteger(value) && value >= min && value <= max ? value : undefined
}

function fail(path: string, message: string): never {
  const separator = path.includes('?') ? '&' : '?'
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`)
}

function isEmail(value: string) {
  return value.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function requireMember(returnTo: string) {
  const member = await activeMessagingUser()
  if (!member) redirect(`/auth/login?callbackUrl=${encodeURIComponent(returnTo)}`)
  return member
}

export async function saveProfessionalProfile(formData: FormData) {
  const path = '/professional/settings'
  const member = await requireMember(path)
  const years = optionalInt(formData, 'yearsOfExperience', 0, 70)
  if (years === undefined) fail(path, 'Years of experience must be a whole number between 0 and 70.')
  const summary = optionalText(formData, 'professionalSummary', 1500)
  const data = {
    isListed: flag(formData, 'isListed'),
    openToOpportunities: flag(formData, 'openToOpportunities'),
    availableToMentor: flag(formData, 'availableToMentor'),
    lookingForMentor: flag(formData, 'lookingForMentor'),
    canHelpWith: parseTagList(text(formData, 'canHelpWith', 600)),
    needsHelpWith: parseTagList(text(formData, 'needsHelpWith', 600)),
    mentoringAreas: parseTagList(text(formData, 'mentoringAreas', 600)),
    yearsOfExperience: years,
    professionalSummary: summary,
  }
  await prisma.professionalProfile.upsert({
    where: { userId: member.id },
    create: { userId: member.id, schoolId: member.schoolId, ...data },
    update: data,
  })
  revalidatePath('/professional', 'layout')
  revalidatePath(`/members/${member.id}`)
  redirect('/professional/settings?saved=1')
}

function businessFields(formData: FormData, path: string) {
  const name = text(formData, 'name', 120)
  const shortDescription = text(formData, 'shortDescription', 240)
  if (name.length < 2) fail(path, 'Business name is required.')
  if (shortDescription.length < 10) fail(path, 'Add a short description of at least 10 characters.')
  const websiteRaw = text(formData, 'website', 500)
  const linkedRaw = text(formData, 'linkedInUrl', 500)
  const website = websiteRaw ? safeUrl(websiteRaw) : null
  const linkedInUrl = linkedRaw ? safeUrl(linkedRaw) : null
  if (websiteRaw && !website) fail(path, 'Website must be a valid http(s) link.')
  if (linkedRaw && !linkedInUrl) fail(path, 'LinkedIn must be a valid http(s) link.')
  const publicEmail = optionalText(formData, 'publicEmail', 200)
  if (publicEmail && !isEmail(publicEmail)) fail(path, 'Enter a valid public business email or leave it blank.')
  const year = optionalInt(formData, 'yearEstablished', 1800, new Date().getFullYear())
  if (year === undefined) fail(path, 'Year established is not valid.')
  return {
    name,
    shortDescription,
    description: optionalText(formData, 'description', 5000),
    industry: optionalText(formData, 'industry', 80),
    services: parseTagList(text(formData, 'services', 800), 20, 80),
    location: optionalText(formData, 'location', 120),
    country: optionalText(formData, 'country', 80),
    website,
    linkedInUrl,
    publicEmail,
    publicPhone: optionalText(formData, 'publicPhone', 40),
    yearEstablished: year,
  }
}

export async function createBusiness(formData: FormData) {
  const path = '/businesses/new'
  const member = await requireMember(path)
  const data = businessFields(formData, path)
  const owned = await prisma.businessMember.count({
    where: { userId: member.id, role: BusinessMemberRole.OWNER },
  })
  if (owned >= MAX_BUSINESSES_PER_OWNER) fail(path, 'You have reached the maximum number of businesses.')
  const duplicate = await prisma.business.findFirst({
    where: {
      schoolId: member.schoolId,
      name: { equals: data.name, mode: 'insensitive' },
      members: { some: { userId: member.id } },
    },
    select: { id: true },
  })
  if (duplicate) fail(path, 'You already have a business with this name.')
  const slug = await uniqueBusinessSlug(data.name)
  const business = await prisma.business.create({
    data: {
      ...data,
      slug,
      schoolId: member.schoolId,
      status: BusinessStatus.DRAFT,
      members: { create: { userId: member.id, role: BusinessMemberRole.OWNER } },
    },
    select: { slug: true },
  })
  revalidatePath('/businesses')
  redirect(`/businesses/${business.slug}/edit?created=1`)
}

async function ownedBusiness(formData: FormData, member: { id: string; schoolId: string }) {
  const businessId = text(formData, 'businessId', 64)
  const business = businessId
    ? await prisma.business.findFirst({
        where: { id: businessId, schoolId: member.schoolId },
        select: { id: true, slug: true, status: true },
      })
    : null
  if (!business || !(await isBusinessOwner(business.id, member.id))) return null
  return business
}

export async function updateBusiness(formData: FormData) {
  const member = await requireMember('/businesses')
  const business = await ownedBusiness(formData, member)
  if (!business) redirect('/businesses')
  const path = `/businesses/${business.slug}/edit`
  const data = businessFields(formData, path)
  await prisma.business.update({ where: { id: business.id }, data })
  revalidatePath('/businesses')
  revalidatePath(`/businesses/${business.slug}`)
  redirect(`${path}?saved=1`)
}

export async function setBusinessStatus(formData: FormData) {
  const member = await requireMember('/businesses')
  const business = await ownedBusiness(formData, member)
  if (!business) redirect('/businesses')
  const path = `/businesses/${business.slug}/edit`
  const next = text(formData, 'status', 20)
  if (next !== BusinessStatus.PUBLISHED && next !== BusinessStatus.DRAFT) fail(path, 'Invalid status.')
  if (business.status === BusinessStatus.SUSPENDED) fail(path, 'This business is suspended. Contact a moderator.')
  await prisma.business.update({ where: { id: business.id }, data: { status: next } })
  revalidatePath('/businesses')
  revalidatePath(`/businesses/${business.slug}`)
  redirect(`${path}?saved=1`)
}

function opportunityFields(formData: FormData, path: string) {
  const title = text(formData, 'title', 160)
  const description = text(formData, 'description', 6000)
  if (title.length < 4) fail(path, 'Add a title of at least 4 characters.')
  if (description.length < 20) fail(path, 'Add a description of at least 20 characters.')
  const type = text(formData, 'type', 30)
  if (!Object.values(OpportunityType).includes(type as OpportunityType)) fail(path, 'Choose an opportunity type.')
  const modeRaw = text(formData, 'workMode', 20)
  if (modeRaw && !Object.values(WorkMode).includes(modeRaw as WorkMode)) fail(path, 'Choose a valid work mode.')
  const urlRaw = text(formData, 'applicationUrl', 500)
  const applicationUrl = urlRaw ? safeUrl(urlRaw) : null
  if (urlRaw && !applicationUrl) fail(path, 'Application link must be a valid http(s) URL.')
  const closingRaw = text(formData, 'closingDate', 20)
  let closingDate: Date | null = null
  if (closingRaw) {
    closingDate = new Date(`${closingRaw}T23:59:59.000Z`)
    if (Number.isNaN(closingDate.getTime())) fail(path, 'Closing date is not valid.')
    if (closingDate <= new Date()) fail(path, 'Closing date must be in the future.')
  }
  const businessId = text(formData, 'businessId', 64)
  return {
    title,
    description,
    type: type as OpportunityType,
    organisation: optionalText(formData, 'organisation', 120),
    location: optionalText(formData, 'location', 120),
    country: optionalText(formData, 'country', 80),
    workMode: (modeRaw || null) as WorkMode | null,
    employmentType: optionalText(formData, 'employmentType', 60),
    applicationUrl,
    closingDate,
    businessId: businessId || null,
  }
}

async function validateLinkedBusiness(businessId: string | null, member: { id: string; schoolId: string }, path: string) {
  if (!businessId) return null
  const business = await prisma.business.findFirst({
    where: { id: businessId, schoolId: member.schoolId, members: { some: { userId: member.id } } },
    select: { id: true },
  })
  if (!business) fail(path, 'You can only link a business you belong to.')
  return business.id
}

export async function createOpportunity(formData: FormData) {
  const path = '/opportunities/new'
  const member = await requireMember(path)
  const data = opportunityFields(formData, path)
  const businessId = await validateLinkedBusiness(data.businessId, member, path)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [duplicate, open] = await Promise.all([
    prisma.opportunity.findFirst({
      where: { postedByUserId: member.id, title: { equals: data.title, mode: 'insensitive' }, type: data.type, createdAt: { gt: since } },
      select: { id: true },
    }),
    prisma.opportunity.count({
      where: { postedByUserId: member.id, status: { in: [OpportunityStatus.PUBLISHED, OpportunityStatus.DRAFT] } },
    }),
  ])
  if (duplicate) fail(path, 'You already posted this opportunity in the last 24 hours.')
  if (open >= MAX_OPEN_OPPORTUNITIES_PER_USER) fail(path, 'Close an existing opportunity before posting another.')
  const expiresAt = data.closingDate ?? new Date(Date.now() + DEFAULT_OPPORTUNITY_DAYS * 24 * 60 * 60 * 1000)
  const created = await prisma.opportunity.create({
    data: {
      ...data,
      businessId,
      expiresAt,
      schoolId: member.schoolId,
      postedByUserId: member.id,
      status: formData.get('intent') === 'draft' ? OpportunityStatus.DRAFT : OpportunityStatus.PUBLISHED,
    },
    select: { id: true },
  })
  revalidatePath('/opportunities')
  redirect(`/opportunities/${created.id}`)
}

async function ownedOpportunity(formData: FormData, member: { id: string; schoolId: string }) {
  const id = text(formData, 'opportunityId', 64)
  if (!id) return null
  return prisma.opportunity.findFirst({
    where: { id, schoolId: member.schoolId, postedByUserId: member.id },
    select: { id: true, status: true },
  })
}

export async function updateOpportunity(formData: FormData) {
  const member = await requireMember('/opportunities')
  const existing = await ownedOpportunity(formData, member)
  if (!existing) redirect('/opportunities')
  const path = `/opportunities/${existing.id}/edit`
  if (existing.status === OpportunityStatus.SUSPENDED) fail(path, 'This opportunity is suspended. Contact a moderator.')
  const data = opportunityFields(formData, path)
  const businessId = await validateLinkedBusiness(data.businessId, member, path)
  await prisma.opportunity.update({
    where: { id: existing.id },
    data: {
      ...data,
      businessId,
      ...(data.closingDate ? { expiresAt: data.closingDate } : {}),
    },
  })
  revalidatePath('/opportunities')
  redirect(`/opportunities/${existing.id}`)
}

export async function setOpportunityStatus(formData: FormData) {
  const member = await requireMember('/opportunities')
  const existing = await ownedOpportunity(formData, member)
  if (!existing) redirect('/opportunities')
  const next = text(formData, 'status', 20)
  const path = `/opportunities/${existing.id}`
  if (next !== OpportunityStatus.PUBLISHED && next !== OpportunityStatus.CLOSED && next !== OpportunityStatus.DRAFT) {
    fail(path, 'Invalid status.')
  }
  if (existing.status === OpportunityStatus.SUSPENDED) fail(path, 'This opportunity is suspended. Contact a moderator.')
  await prisma.opportunity.update({
    where: { id: existing.id },
    data: {
      status: next,
      // Re-publishing an item whose window lapsed gives it a fresh default window.
      ...(next === OpportunityStatus.PUBLISHED
        ? { expiresAt: new Date(Date.now() + DEFAULT_OPPORTUNITY_DAYS * 24 * 60 * 60 * 1000), closingDate: null }
        : {}),
    },
  })
  revalidatePath('/opportunities')
  redirect(path)
}

function validReason(reason: string) {
  return listingReportReasons.some((option) => option.value === reason)
}

export async function reportListing(
  kind: 'business' | 'opportunity',
  id: string,
  reason: string,
  explanation: string
): Promise<ListingActionResult> {
  const member = await activeMessagingUser()
  if (!member) return { ok: false, error: 'Sign in to continue.' }
  if (typeof id !== 'string' || !id || id.length > 64) return { ok: false, error: 'That listing is not valid.' }
  if (!validReason(reason)) return { ok: false, error: 'Choose a valid reason.' }

  const details = explanation.trim().slice(0, 1000) || null
  let target: { id: string } | null
  let owned = false
  if (kind === 'business') {
    target = await prisma.business.findFirst({
      where: { id, schoolId: member.schoolId, status: BusinessStatus.PUBLISHED },
      select: { id: true },
    })
    owned = Boolean(target && (await prisma.businessMember.findFirst({ where: { businessId: id, userId: member.id }, select: { id: true } })))
  } else {
    const found = await prisma.opportunity.findFirst({
      where: { id, schoolId: member.schoolId, status: { not: OpportunityStatus.DRAFT } },
      select: { id: true, postedByUserId: true },
    })
    target = found
    owned = found?.postedByUserId === member.id
  }
  if (!target) return { ok: false, error: 'That listing is not available.' }
  if (owned) return { ok: false, error: 'You cannot report your own listing.' }

  const existing = await prisma.report.findFirst({
    where: {
      reporterId: member.id,
      status: { in: ['OPEN', 'PENDING', 'UNDER_REVIEW'] },
      ...(kind === 'business' ? { businessId: id } : { opportunityId: id }),
    },
    select: { id: true },
  })
  if (existing) return { ok: true }

  await prisma.report.create({
    data: {
      reporterId: member.id,
      reason,
      explanation: details,
      status: 'OPEN',
      ...(kind === 'business' ? { businessId: id } : { opportunityId: id }),
    },
  })
  return { ok: true }
}

/** Moderators suspend or restore listings; reports never remove content on their own. */
export async function moderateListing(formData: FormData) {
  const moderator = await currentModerator()
  if (!moderator) redirect('/dashboard')
  const kind = text(formData, 'kind', 20)
  const id = text(formData, 'id', 64)
  const action = text(formData, 'action', 20)
  if ((kind !== 'business' && kind !== 'opportunity') || !id || (action !== 'suspend' && action !== 'restore')) {
    redirect('/admin/professional')
  }

  let ownerIds: string[] = []
  let title = ''
  let link = '/professional'
  if (kind === 'business') {
    const business = await prisma.business.findFirst({
      where: { id, schoolId: moderator.schoolId },
      select: { id: true, name: true, slug: true, members: { where: { role: BusinessMemberRole.OWNER }, select: { userId: true } } },
    })
    if (!business) redirect('/admin/professional')
    await prisma.business.update({
      where: { id },
      data: { status: action === 'suspend' ? BusinessStatus.SUSPENDED : BusinessStatus.DRAFT },
    })
    ownerIds = business.members.map((entry) => entry.userId)
    title = business.name
    link = `/businesses/${business.slug}/edit`
    revalidatePath(`/businesses/${business.slug}`)
    revalidatePath('/businesses')
  } else {
    const opportunity = await prisma.opportunity.findFirst({
      where: { id, schoolId: moderator.schoolId },
      select: { id: true, title: true, postedByUserId: true },
    })
    if (!opportunity) redirect('/admin/professional')
    await prisma.opportunity.update({
      where: { id },
      data: { status: action === 'suspend' ? OpportunityStatus.SUSPENDED : OpportunityStatus.DRAFT },
    })
    ownerIds = [opportunity.postedByUserId]
    title = opportunity.title
    link = `/opportunities/${id}`
    revalidatePath('/opportunities')
  }

  await prisma.notification.createMany({
    data: ownerIds.map((userId) => ({
      userId,
      type: 'LISTING_MODERATION',
      content: action === 'suspend'
        ? `Your listing "${title.slice(0, 80)}" was suspended by a moderator.`
        : `Your listing "${title.slice(0, 80)}" was restored as a draft. Review it and publish again.`,
      link,
    })),
  })
  revalidatePath('/admin/professional')
  redirect('/admin/professional?done=1')
}
