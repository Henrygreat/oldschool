import { Prisma } from '@prisma/client'
import type { DirectoryCardMember } from '@/components/members/member-card'
import { visibleProfileFilter } from '@/lib/directory'
import { prisma } from '@/lib/prisma'
import { canViewField, memberPhotoUrl, privacyFor } from '@/lib/profile'
import { PROFESSIONAL_PAGE_SIZE } from '@/lib/professional-shared'

export type ProfessionalFilters = {
  q?: string
  profession?: string
  industry?: string
  skill?: string
  company?: string
  jobTitle?: string
  location?: string
  setYear?: number
  chapterId?: string
  mentor?: boolean
  openToWork?: boolean
  page: number
}

const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const })

function tagVariants(value: string) {
  const title = value.replace(/\b\w/g, (letter) => letter.toUpperCase())
  return [...new Set([value, value.toLowerCase(), title])]
}

/**
 * Professional search over registered, active members who opted in to the professional
 * listing. Historical (unclaimed) archive records are never included.
 */
export async function searchProfessionals(schoolId: string, viewerId: string, filters: ProfessionalFilters, mentorsOnly = false) {
  const conditions: Prisma.UserWhereInput[] = [
    {
      schoolId,
      isActive: true,
      professionalProfile: {
        is: {
          isListed: true,
          ...(mentorsOnly || filters.mentor ? { availableToMentor: true } : {}),
          ...(filters.openToWork ? { openToOpportunities: true } : {}),
        },
      },
    },
  ]
  if (filters.q) {
    conditions.push({
      OR: [
        { firstName: contains(filters.q) },
        { surname: contains(filters.q) },
        { nickname: contains(filters.q) },
        { alumniProfile: { is: { profession: contains(filters.q) } } },
      ],
    })
  }
  if (filters.profession) conditions.push({ alumniProfile: { is: { profession: contains(filters.profession) } } })
  if (filters.industry) conditions.push({ alumniProfile: { is: { industry: contains(filters.industry) } } })
  if (filters.skill) {
    conditions.push({
      OR: [
        { alumniProfile: { is: { skills: { some: { name: contains(filters.skill) } } } } },
        { professionalProfile: { is: { canHelpWith: { hasSome: tagVariants(filters.skill) } } } },
        { professionalProfile: { is: { mentoringAreas: { hasSome: tagVariants(filters.skill) } } } },
      ],
    })
  }
  if (filters.company) conditions.push(visibleProfileFilter('company', { company: contains(filters.company) }))
  if (filters.jobTitle) conditions.push(visibleProfileFilter('company', { jobTitle: contains(filters.jobTitle) }))
  if (filters.location) {
    conditions.push({
      OR: [
        visibleProfileFilter('location', { currentCity: contains(filters.location) }),
        visibleProfileFilter('location', { currentCountry: contains(filters.location) }),
      ],
    })
  }
  if (filters.setYear !== undefined) {
    conditions.push({
      OR: [
        { alumniProfile: { is: { verificationStatus: 'VERIFIED', schoolAttendance: { some: { cohort: { is: { year: filters.setYear, schoolId } } } } } } },
        { claimedArchiveRecord: { is: { archivedAt: null, setYear: filters.setYear } } },
      ],
    })
  }
  if (filters.chapterId) {
    conditions.push({
      alumniProfile: { is: { chapterMemberships: { some: { chapterId: filters.chapterId, chapter: { schoolId } } } } },
    })
  }
  const where: Prisma.UserWhereInput = { AND: conditions }

  const total = await prisma.user.count({ where })
  const pages = Math.max(1, Math.ceil(total / PROFESSIONAL_PAGE_SIZE))
  const page = Math.min(filters.page, pages)
  const users = await prisma.user.findMany({
    where,
    orderBy: [{ surname: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
    skip: (page - 1) * PROFESSIONAL_PAGE_SIZE,
    take: PROFESSIONAL_PAGE_SIZE,
    select: {
      id: true,
      firstName: true,
      middleName: true,
      surname: true,
      nickname: true,
      profilePhotoUrl: true,
      profilePhotoKey: true,
      updatedAt: true,
      privacySettings: { select: { field: true, visibility: true } },
      professionalProfile: { select: { openToOpportunities: true, availableToMentor: true, canHelpWith: true } },
      claimedArchiveRecord: { select: { setYear: true } },
      alumniProfile: {
        select: {
          profession: true,
          company: true,
          jobTitle: true,
          currentCity: true,
          currentCountry: true,
          verificationStatus: true,
          schoolAttendance: { take: 1, select: { cohort: { select: { name: true } } } },
        },
      },
    },
  })

  const members: DirectoryCardMember[] = users.map((user) => {
    const profile = user.alumniProfile
    const privacy = privacyFor(user.privacySettings)
    const isOwner = user.id === viewerId
    const canSeeCompany = canViewField(privacy.company, true, isOwner, false)
    const canSeeLocation = canViewField(privacy.location, true, isOwner, false)
    const canSeePhoto = canViewField(privacy.photo, true, isOwner, false)
    const tags: string[] = []
    if (user.professionalProfile?.availableToMentor) tags.push('Available to mentor')
    if (user.professionalProfile?.openToOpportunities) tags.push('Open to opportunities')
    const help = user.professionalProfile?.canHelpWith.slice(0, 3).join(', ')
    if (help) tags.push(`Can help with: ${help}`)
    return {
      id: user.id,
      name: [user.firstName, user.middleName, user.surname].filter(Boolean).join(' '),
      nickname: user.nickname,
      photoUrl: canSeePhoto ? memberPhotoUrl(user.id, user.profilePhotoKey, user.profilePhotoUrl, user.updatedAt) : null,
      setName: (profile?.verificationStatus === 'VERIFIED' ? profile.schoolAttendance[0]?.cohort?.name : null) ??
        (user.claimedArchiveRecord ? `Set of ${user.claimedArchiveRecord.setYear}` : null),
      profession: profile?.profession ?? null,
      company: canSeeCompany ? profile?.company ?? null : null,
      jobTitle: canSeeCompany ? profile?.jobTitle ?? null : null,
      location: canSeeLocation ? [profile?.currentCity, profile?.currentCountry].filter(Boolean).join(', ') || null : null,
      verified: profile?.verificationStatus === 'VERIFIED',
      matchReason: tags.join(' · ') || null,
      viewerId,
      recordType: 'registered',
    }
  })

  return { members, total, page, pages }
}
