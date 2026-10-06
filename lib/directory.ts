import { ConnectionStatus, Prisma, VisibilityLevel } from '@prisma/client'
import { canViewField, memberPhotoUrl, privacyFor } from '@/lib/profile'
import { prisma } from '@/lib/prisma'
import type { DirectoryCardMember } from '@/components/members/member-card'
import type { ConnectionState } from '@/lib/network-types'

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

export function visibleProfileFilter(field: string, predicate: Prisma.AlumniProfileWhereInput): Prisma.UserWhereInput {
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
        {
          claimedArchiveRecord: {
            is: {
              archivedAt: null,
              OR: [
                { fullName: { contains: filters.q, mode: 'insensitive' } },
                { profession: { contains: filters.q, mode: 'insensitive' } },
              ],
            },
          },
        },
      ],
    })
  }
  if (filters.setYear !== null) {
    conditions.push({
      OR: [
        {
          alumniProfile: {
            is: { schoolAttendance: { some: { cohort: { is: { year: filters.setYear } } } } },
          },
        },
        { claimedArchiveRecord: { is: { archivedAt: null, setYear: filters.setYear } } },
      ],
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
      OR: [
        {
          alumniProfile: {
            is: {
              schoolAttendance: {
                some: { house: { is: { name: { contains: filters.house, mode: 'insensitive' } } } },
              },
            },
          },
        },
        { claimedArchiveRecord: { is: { archivedAt: null, house: { contains: filters.house, mode: 'insensitive' } } } },
      ],
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
      OR: [
        { alumniProfile: { is: { profession: { contains: filters.profession, mode: 'insensitive' } } } },
        { claimedArchiveRecord: { is: { archivedAt: null, profession: { contains: filters.profession, mode: 'insensitive' } } } },
      ],
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
  const archiveSupportsFilters =
    filters.entryYear === null &&
    filters.leavingYear === null &&
    !filters.country &&
    !filters.city &&
    !filters.industry
  const archiveWhere: Prisma.AlumniArchiveRecordWhereInput = {
    schoolId,
    archivedAt: null,
    claimedByUserId: null,
    ...(filters.setYear !== null ? { setYear: filters.setYear } : {}),
    ...(filters.house ? { house: { contains: filters.house, mode: 'insensitive' } } : {}),
    ...(filters.profession ? { profession: { contains: filters.profession, mode: 'insensitive' } } : {}),
    ...(filters.q
      ? {
          OR: [
            { fullName: { contains: filters.q, mode: 'insensitive' } },
            { profession: { contains: filters.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
  const [total, archiveTotal] = await Promise.all([
    prisma.user.count({ where }),
    archiveSupportsFilters ? prisma.alumniArchiveRecord.count({ where: archiveWhere }) : Promise.resolve(0),
  ])
  const pages = Math.ceil(Math.max(total, archiveTotal) / DIRECTORY_PAGE_SIZE)
  const page = Math.min(filters.page, Math.max(pages, 1))
  const [users, houses, cohorts, archiveRows, archiveHouses, archiveSetYears] = await Promise.all([
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
        profilePhotoKey: true,
        updatedAt: true,
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
              select: {
                cohort: { select: { name: true, year: true } },
                house: { select: { name: true } },
              },
              take: 1,
            },
          },
        },
        claimedArchiveRecord: {
          select: { setYear: true, house: true, profession: true },
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
    archiveSupportsFilters
      ? prisma.alumniArchiveRecord.findMany({
          where: archiveWhere,
          orderBy: [{ setYear: 'desc' }, { fullName: 'asc' }, { id: 'asc' }],
          skip: (page - 1) * DIRECTORY_PAGE_SIZE,
          take: DIRECTORY_PAGE_SIZE,
          select: {
            id: true,
            fullName: true,
            title: true,
            setYear: true,
            house: true,
            profession: true,
            status: true,
          },
        })
      : Promise.resolve([]),
    prisma.alumniArchiveRecord.findMany({
      where: { schoolId, archivedAt: null, house: { not: null } },
      distinct: ['house'],
      orderBy: { house: 'asc' },
      select: { house: true },
    }),
    prisma.alumniArchiveRecord.findMany({
      where: { schoolId, archivedAt: null },
      distinct: ['setYear'],
      orderBy: { setYear: 'desc' },
      select: { setYear: true },
    }),
  ])
  const allHouses = [
    ...new Map(
      [...houses, ...archiveHouses.flatMap(({ house }) => house ? [{ id: house, name: house }] : [])]
        .map((house) => [house.name.toLocaleLowerCase(), house])
    ).values(),
  ].sort((left, right) => left.name.localeCompare(right.name))
  const cohortByYear = new Map(cohorts.map((cohort) => [cohort.year, cohort]))
  for (const { setYear } of archiveSetYears) {
    if (!cohortByYear.has(setYear)) cohortByYear.set(setYear, { year: setYear, name: `Set of ${setYear}` })
  }
  const allCohorts = [...cohortByYear.values()].sort((left, right) => right.year - left.year)

  const members: DirectoryCardMember[] = users.map((user) => {
    const profile = user.alumniProfile
    const privacy = privacyFor(user.privacySettings)
    const isOwner = user.id === viewerId
    const canSeeLocation = canViewField(privacy.location, true, isOwner, false)
    const canSeeCompany = canViewField(privacy.company, true, isOwner, false)
    const canSeePhoto = canViewField(privacy.photo, true, isOwner, false)
    return {
      id: user.id,
      name: [user.firstName, user.middleName, user.surname].filter(Boolean).join(' '),
      nickname: user.nickname,
      photoUrl: canSeePhoto
        ? memberPhotoUrl(user.id, user.profilePhotoKey, user.profilePhotoUrl, user.updatedAt)
        : null,
      setName: profile?.schoolAttendance[0]?.cohort?.name ??
        (user.claimedArchiveRecord ? `Set of ${user.claimedArchiveRecord.setYear}` : null),
      profession: profile?.profession ?? user.claimedArchiveRecord?.profession ?? null,
      company: canSeeCompany ? profile?.company ?? null : null,
      location: canSeeLocation
        ? [profile?.currentCity, profile?.currentCountry].filter(Boolean).join(', ') || null
        : null,
      verified: profile?.verificationStatus === 'VERIFIED',
      houseName: profile?.schoolAttendance[0]?.house?.name ?? user.claimedArchiveRecord?.house ?? null,
      viewerId,
    }
  })

  if (users.length) {
    const memberIds = users.map((user) => user.id).filter((id) => id !== viewerId)
    const [connections, follows] = await Promise.all([
      memberIds.length
        ? prisma.connection.findMany({
            where: {
              OR: [
                { fromUserId: viewerId, toUserId: { in: memberIds } },
                { toUserId: viewerId, fromUserId: { in: memberIds } },
              ],
            },
            select: { fromUserId: true, toUserId: true, status: true },
          })
        : Promise.resolve([]),
      memberIds.length
        ? prisma.follow.findMany({
            where: { followerId: viewerId, followingId: { in: memberIds } },
            select: { followingId: true },
          })
        : Promise.resolve([]),
    ])
    const following = new Set(follows.map((follow) => follow.followingId))
    for (const member of members) {
      if (member.id === viewerId) continue
      const pair = connections.filter(
        (connection) => connection.fromUserId === member.id || connection.toUserId === member.id
      )
      let state: ConnectionState = 'none'
      if (pair.some((connection) => connection.status === ConnectionStatus.ACCEPTED)) {
        state = 'connected'
      } else if (pair.some((connection) => connection.status === ConnectionStatus.BLOCKED)) {
        state = 'unavailable'
      } else if (pair.some((connection) => connection.status === ConnectionStatus.PENDING)) {
        state = pair.some((connection) => connection.fromUserId === viewerId)
          ? 'sent'
          : 'received'
      }
      member.connectionState = state
      member.isFollowing = following.has(member.id)
    }
  }
  const archiveRecords: DirectoryCardMember[] = archiveRows.map((record) => ({
    id: record.id,
    name: [record.title, record.fullName].filter(Boolean).join(' '),
    nickname: null,
    photoUrl: null,
    setName: `Set of ${record.setYear}`,
    houseName: record.house,
    profession: record.profession,
    company: null,
    location: null,
    verified: false,
    recordType: record.status === 'DECEASED' ? 'memorial' : 'historical',
    profileHref: `/archive/${record.id}`,
    claimHref: record.status === 'LIVING' ? `/archive/${record.id}` : null,
  }))
  return {
    members,
    archiveRecords,
    total: total + archiveTotal,
    houses: allHouses,
    cohorts: allCohorts,
    pages,
    page,
  }
}
