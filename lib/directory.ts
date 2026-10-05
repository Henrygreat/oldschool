import { Prisma, VisibilityLevel } from '@prisma/client'
import { canViewField, privacyFor } from '@/lib/profile'
import { prisma } from '@/lib/prisma'
import type { DirectoryCardMember } from '@/components/members/member-card'

export const DIRECTORY_PAGE_SIZE = 12

export type DirectoryFilters = {
  q: string
  setYear: number | null
  entryYear: number | null
  leavingYear: number | null
  house: string
  country: string
  city: string
  profession: string
  industry: string
  page: number
  invalid: boolean
}

const parseText = (value: string | undefined) => {
  const trimmed = value?.trim() ?? ''
  return trimmed.length <= 80 ? trimmed : ''
}

const parseYear = (value: string | undefined) => {
  if (!value) return { year: null, invalid: false }
  if (!/^\d{4}$/.test(value)) return { year: null, invalid: true }
  const year = Number(value)
  if (year < 1900 || year > new Date().getFullYear()) return { year: null, invalid: true }
  return { year, invalid: false }
}

export function parseDirectoryFilters(params: Record<string, string | string[] | undefined>): DirectoryFilters {
  const one = (key: string) => typeof params[key] === 'string' ? params[key] : undefined
  const setYear = parseYear(one('setYear'))
  const entryYear = parseYear(one('entryYear'))
  const leavingYear = parseYear(one('leavingYear'))
  const pageText = one('page')
  const pageValid = !pageText || (/^[1-9]\d{0,4}$/.test(pageText) && Number(pageText) <= 10000)
  return {
    q: parseText(one('q')),
    setYear: setYear.year,
    entryYear: entryYear.year,
    leavingYear: leavingYear.year,
    house: parseText(one('house')),
    country: parseText(one('country')),
    city: parseText(one('city')),
    profession: parseText(one('profession')),
    industry: parseText(one('industry')),
    page: pageValid ? Math.max(1, Number(pageText) || 1) : 1,
    invalid: setYear.invalid || entryYear.invalid || leavingYear.invalid || !pageValid,
  }
}

function visibleProfileFilter(field: string, predicate: Prisma.AlumniProfileWhereInput): Prisma.UserWhereInput {
  const memberVisibleLevels = [
    VisibilityLevel.PUBLIC,
    VisibilityLevel.MEMBERS_ONLY,
    VisibilityLevel.OLD_BOYS_ONLY,
  ]
  return {
    alumniProfile: {
      is: {
        AND: [
          predicate,
          {
            user: {
              is: {
                OR: [
                  { privacySettings: { none: { field } } },
                  {
                    privacySettings: {
                      some: { field, visibility: { in: memberVisibleLevels } },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    },
  }
}

export async function searchDirectory(schoolId: string, viewerId: string, filters: DirectoryFilters) {
  const conditions: Prisma.UserWhereInput[] = [{ schoolId, isActive: true }]
  if (filters.q) {
    conditions.push({
      OR: [
        { firstName: { contains: filters.q, mode: 'insensitive' } },
        { middleName: { contains: filters.q, mode: 'insensitive' } },
        { surname: { contains: filters.q, mode: 'insensitive' } },
        { nickname: { contains: filters.q, mode: 'insensitive' } },
        visibleProfileFilter('company', { company: { contains: filters.q, mode: 'insensitive' } }),
        {
          alumniProfile: {
            is: { profession: { contains: filters.q, mode: 'insensitive' } },
          },
        },
      ],
    })
  }
  if (filters.setYear !== null) {
    conditions.push({
      alumniProfile: {
        is: { schoolAttendance: { some: { cohort: { is: { year: filters.setYear } } } } },
      },
    })
  }
  if (filters.entryYear !== null) {
    conditions.push({
      alumniProfile: { is: { schoolAttendance: { some: { entryYear: filters.entryYear } } } },
    })
  }
  if (filters.leavingYear !== null) {
    conditions.push({
      alumniProfile: { is: { schoolAttendance: { some: { leavingYear: filters.leavingYear } } } },
    })
  }
  if (filters.house) {
    conditions.push({
      alumniProfile: {
        is: {
          schoolAttendance: {
            some: { house: { is: { name: { contains: filters.house, mode: 'insensitive' } } } },
          },
        },
      },
    })
  }
  if (filters.country) {
    conditions.push(visibleProfileFilter('location', { currentCountry: { contains: filters.country, mode: 'insensitive' } }))
  }
  if (filters.city) {
    conditions.push(visibleProfileFilter('location', { currentCity: { contains: filters.city, mode: 'insensitive' } }))
  }
  if (filters.profession) {
    conditions.push({
      alumniProfile: {
        is: { profession: { contains: filters.profession, mode: 'insensitive' } },
      },
    })
  }
  if (filters.industry) {
    conditions.push({
      alumniProfile: {
        is: { industry: { contains: filters.industry, mode: 'insensitive' } },
      },
    })
  }
  const where: Prisma.UserWhereInput = { AND: conditions }
  const total = await prisma.user.count({ where })
  const pages = Math.ceil(total / DIRECTORY_PAGE_SIZE)
  const page = Math.min(filters.page, Math.max(pages, 1))
  const [users, houses, cohorts] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ surname: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * DIRECTORY_PAGE_SIZE,
      take: DIRECTORY_PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        middleName: true,
        surname: true,
        nickname: true,
        profilePhotoUrl: true,
        privacySettings: { select: { field: true, visibility: true } },
        alumniProfile: {
          select: {
            currentCity: true,
            currentCountry: true,
            profession: true,
            company: true,
            industry: true,
            jobTitle: true,
            verificationStatus: true,
            schoolAttendance: {
              select: { cohort: { select: { name: true, year: true } } },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.house.findMany({
      where: { schoolId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.cohort.findMany({
      where: { schoolId },
      orderBy: { year: 'desc' },
      take: 100,
      select: { year: true, name: true },
    }),
  ])

  const members: DirectoryCardMember[] = users.map((user) => {
    const profile = user.alumniProfile
    const privacy = privacyFor(user.privacySettings)
    const isOwner = user.id === viewerId
    const canSeeLocation = canViewField(privacy.location, true, isOwner, false)
    const canSeeCompany = canViewField(privacy.company, true, isOwner, false)
    return {
      id: user.id,
      name: [user.firstName, user.middleName, user.surname].filter(Boolean).join(' '),
      nickname: user.nickname,
      photoUrl: user.profilePhotoUrl,
      setName: profile?.schoolAttendance[0]?.cohort?.name ?? null,
      profession: profile?.profession ?? null,
      company: canSeeCompany ? profile?.company ?? null : null,
      location: canSeeLocation
        ? [profile?.currentCity, profile?.currentCountry].filter(Boolean).join(', ') || null
        : null,
      verified: profile?.verificationStatus === 'VERIFIED',
    }
  })
  return { members, total, houses, cohorts, pages, page }
}
