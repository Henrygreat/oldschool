import { ConnectionStatus, Prisma } from '@prisma/client'
import type { DirectoryCardMember } from '@/components/members/member-card'
import { canViewField, memberPhotoUrl, privacyFor } from '@/lib/profile'
import { visibleProfileFilter } from '@/lib/directory'
import { prisma } from '@/lib/prisma'
import type { ConnectionState, NetworkTab } from '@/lib/network-types'

export const NETWORK_PAGE_SIZE = 10

const memberSelect = {
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
      industry: true,
      company: true,
      jobTitle: true,
      verificationStatus: true,
      chapterMemberships: { select: { chapterId: true } },
      schoolAttendance: {
        take: 1,
        orderBy: { updatedAt: 'desc' },
        select: {
          cohortId: true,
          houseId: true,
          cohort: { select: { name: true } },
          house: { select: { name: true } },
        },
      },
    },
  },
} satisfies Prisma.UserSelect

type NetworkMember = Prisma.UserGetPayload<{ select: typeof memberSelect }>

function memberCard(
  member: NetworkMember,
  viewerId: string,
  connectionState: ConnectionState,
  isFollowing: boolean
): DirectoryCardMember {
  const profile = member.alumniProfile
  const attendance = profile?.schoolAttendance[0]
  const privacy = privacyFor(member.privacySettings)
  const canSeePhoto = canViewField(privacy.photo, true, member.id === viewerId, false)
  const canSeeCompany = canViewField(privacy.company, true, member.id === viewerId, false)
  const canSeeLocation = canViewField(privacy.location, true, member.id === viewerId, false)
  return {
    id: member.id,
    name: [member.firstName, member.middleName, member.surname].filter(Boolean).join(' '),
    nickname: member.nickname,
    photoUrl: canSeePhoto
      ? memberPhotoUrl(member.id, member.profilePhotoKey, member.profilePhotoUrl, member.updatedAt)
      : null,
    setName: profile?.verificationStatus === 'VERIFIED' ? attendance?.cohort?.name ?? null : null,
    houseName: attendance?.house?.name ?? null,
    profession: profile?.profession ?? null,
    company: canSeeCompany ? profile?.company ?? null : null,
    jobTitle: canSeeCompany ? profile?.jobTitle ?? null : null,
    location: canSeeLocation
      ? [profile?.currentCity, profile?.currentCountry].filter(Boolean).join(', ') || null
      : null,
    verified: profile?.verificationStatus === 'VERIFIED',
    connectionState,
    isFollowing,
    showFollow: true,
    viewerId,
  }
}

export function parseNetworkTab(value: string | string[] | undefined): NetworkTab {
  const tab = Array.isArray(value) ? value[0] : value
  if (
    tab === 'received' ||
    tab === 'sent' ||
    tab === 'following' ||
    tab === 'followers'
  ) return tab
  return 'connections'
}

export function parseNetworkPage(value: string | string[] | undefined) {
  const page = Array.isArray(value) ? value[0] : value
  return page && /^[1-9]\d{0,3}$/.test(page) ? Number(page) : 1
}

export async function getNetworkData(
  schoolId: string,
  userId: string,
  tab: NetworkTab,
  requestedPage: number
) {
  const userRelation = (id: string) => ({ id, schoolId, isActive: true })
  const connectionPairFilter = {
    OR: [
      {
        fromUserId: userId,
        fromUser: userRelation(userId),
        toUser: { schoolId, isActive: true },
      },
      {
        toUserId: userId,
        toUser: userRelation(userId),
        fromUser: { schoolId, isActive: true },
      },
    ],
  } satisfies Prisma.ConnectionWhereInput

  const [connectionCount, receivedCount, sentCount, followingCount, followerCount] =
    await Promise.all([
      prisma.connection.count({
        where: { ...connectionPairFilter, status: ConnectionStatus.ACCEPTED },
      }),
      prisma.connection.count({
        where: {
          fromUser: { schoolId, isActive: true },
          toUser: userRelation(userId),
          status: ConnectionStatus.PENDING,
        },
      }),
      prisma.connection.count({
        where: {
          fromUser: userRelation(userId),
          toUser: { schoolId, isActive: true },
          status: ConnectionStatus.PENDING,
        },
      }),
      prisma.follow.count({
        where: { follower: userRelation(userId), following: { schoolId, isActive: true } },
      }),
      prisma.follow.count({
        where: { following: userRelation(userId), follower: { schoolId, isActive: true } },
      }),
    ])

  const counts = {
    connections: connectionCount,
    received: receivedCount,
    sent: sentCount,
    following: followingCount,
    followers: followerCount,
  }
  const total = counts[tab]
  const pages = Math.max(1, Math.ceil(total / NETWORK_PAGE_SIZE))
  const page = Math.min(requestedPage, pages)
  const skip = (page - 1) * NETWORK_PAGE_SIZE
  let pageMembers: NetworkMember[] = []

  if (tab === 'connections' || tab === 'received' || tab === 'sent') {
    const status = tab === 'connections' ? ConnectionStatus.ACCEPTED : ConnectionStatus.PENDING
    const where: Prisma.ConnectionWhereInput = tab === 'received'
      ? {
          fromUser: { schoolId, isActive: true },
          toUser: userRelation(userId),
          status,
        }
      : tab === 'sent'
        ? {
            fromUser: userRelation(userId),
            toUser: { schoolId, isActive: true },
            status,
          }
        : { ...connectionPairFilter, status }
    const rows = await prisma.connection.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: NETWORK_PAGE_SIZE,
      select: {
        fromUserId: true,
        fromUser: { select: memberSelect },
        toUser: { select: memberSelect },
      },
    })
    pageMembers = rows.map((row) => {
      if (tab === 'received') return row.fromUser
      if (tab === 'sent') return row.toUser
      return row.fromUserId === userId ? row.toUser : row.fromUser
    })
  } else {
    const rows = await prisma.follow.findMany({
      where: tab === 'following'
        ? { follower: userRelation(userId), following: { schoolId, isActive: true } }
        : { following: userRelation(userId), follower: { schoolId, isActive: true } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: NETWORK_PAGE_SIZE,
      select: {
        follower: { select: memberSelect },
        following: { select: memberSelect },
      },
    })
    pageMembers = rows.map((row) => tab === 'following' ? row.following : row.follower)
  }

  const ids = pageMembers.map((member) => member.id)
  const [connections, follows] = ids.length
    ? await Promise.all([
        prisma.connection.findMany({
          where: {
            OR: [
              { fromUserId: userId, toUserId: { in: ids } },
              { toUserId: userId, fromUserId: { in: ids } },
            ],
          },
          select: { fromUserId: true, toUserId: true, status: true },
        }),
        prisma.follow.findMany({
          where: { followerId: userId, followingId: { in: ids } },
          select: { followingId: true },
        }),
      ])
    : [[], []]
  const followingIds = new Set(follows.map((follow) => follow.followingId))
  const members = pageMembers.map((member) => {
    const pair = connections.filter(
      (connection) => connection.fromUserId === member.id || connection.toUserId === member.id
    )
    let state: ConnectionState = 'none'
    if (pair.some((connection) => connection.status === ConnectionStatus.ACCEPTED)) {
      state = 'connected'
    } else if (pair.some((connection) => connection.status === ConnectionStatus.BLOCKED)) {
      state = 'unavailable'
    } else if (pair.some((connection) => connection.status === ConnectionStatus.PENDING)) {
      state = pair.some(
        (connection) =>
          connection.fromUserId === userId &&
          connection.status === ConnectionStatus.PENDING
      )
        ? 'sent'
        : 'received'
    }
    return memberCard(member, userId, state, followingIds.has(member.id))
  })

  const [activity, recommendations] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId,
        type: { in: ['CONNECTION_REQUEST', 'CONNECTION_ACCEPTED'] },
        actor: { schoolId, isActive: true },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        content: true,
        link: true,
        createdAt: true,
        isRead: true,
        actor: { select: { firstName: true, surname: true } },
      },
    }),
    getRecommendations(schoolId, userId),
  ])

  return { counts, members, total, pages, page, activity, recommendations }
}

async function getRecommendations(schoolId: string, userId: string): Promise<DirectoryCardMember[]> {
  const viewer = await prisma.user.findFirst({
    where: { id: userId, schoolId, isActive: true },
    select: {
      alumniProfile: {
        select: {
          profession: true,
          industry: true,
          currentCity: true,
          currentCountry: true,
          verificationStatus: true,
          schoolAttendance: {
            take: 1,
            orderBy: { updatedAt: 'desc' },
            select: { cohortId: true, houseId: true },
          },
          chapterMemberships: { select: { chapterId: true } },
        },
      },
    },
  })
  const profile = viewer?.alumniProfile
  const attendance = profile?.schoolAttendance[0]
  const chapterIds = profile?.chapterMemberships.map((membership) => membership.chapterId) ?? []
  const matches: Prisma.UserWhereInput[] = []

  if (attendance?.cohortId && profile?.verificationStatus === 'VERIFIED') {
    matches.push({
      alumniProfile: {
        is: {
          verificationStatus: 'VERIFIED',
          schoolAttendance: { some: { cohortId: attendance.cohortId } },
        },
      },
    })
  }
  if (attendance?.houseId) {
    matches.push({
      alumniProfile: { is: { schoolAttendance: { some: { houseId: attendance.houseId } } } },
    })
  }
  if (chapterIds.length) {
    matches.push({
      alumniProfile: {
        is: { chapterMemberships: { some: { chapterId: { in: chapterIds } } } },
      },
    })
  }
  if (profile?.currentCity || profile?.currentCountry) {
    const locationMatches: Prisma.AlumniProfileWhereInput[] = []
    if (profile.currentCity) {
      locationMatches.push({
        currentCity: { equals: profile.currentCity, mode: 'insensitive' },
      })
    }
    if (profile.currentCountry) {
      locationMatches.push({
        currentCountry: { equals: profile.currentCountry, mode: 'insensitive' },
      })
    }
    matches.push(visibleProfileFilter('location', { OR: locationMatches }))
  }
  if (profile?.profession) {
    matches.push({
      alumniProfile: {
        is: { profession: { equals: profile.profession, mode: 'insensitive' } },
      },
    })
  }
  if (profile?.industry) {
    matches.push({
      alumniProfile: {
        is: { industry: { equals: profile.industry, mode: 'insensitive' } },
      },
    })
  }
  if (!matches.length) return []

  const candidates = await prisma.user.findMany({
    where: {
      schoolId,
      isActive: true,
      id: { not: userId },
      NOT: {
        OR: [
          {
            connectionsFrom: {
              some: {
                toUserId: userId,
                status: { in: [ConnectionStatus.ACCEPTED, ConnectionStatus.PENDING, ConnectionStatus.BLOCKED] },
              },
            },
          },
          {
            connectionsTo: {
              some: {
                fromUserId: userId,
                status: { in: [ConnectionStatus.ACCEPTED, ConnectionStatus.PENDING, ConnectionStatus.BLOCKED] },
              },
            },
          },
        ],
      },
      OR: matches,
    },
    orderBy: [{ surname: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
    take: 100,
    select: memberSelect,
  })

  const ranked = candidates.map((candidate) => {
    const candidateProfile = candidate.alumniProfile
    const candidateAttendance = candidateProfile?.schoolAttendance[0]
    const privacy = privacyFor(candidate.privacySettings)
    const canSeeLocation = canViewField(privacy.location, true, false, false)
    const candidateChapters = new Set(
      candidateProfile?.chapterMemberships.map((membership) => membership.chapterId) ?? []
    )
    const sameSet = Boolean(
      profile?.verificationStatus === 'VERIFIED' &&
      candidateProfile?.verificationStatus === 'VERIFIED' &&
      attendance?.cohortId &&
      candidateAttendance?.cohortId === attendance.cohortId
    )
    const sameHouse = Boolean(attendance?.houseId && candidateAttendance?.houseId === attendance.houseId)
    const sharedChapter = chapterIds.some((chapterId) => candidateChapters.has(chapterId))
    const similarLocation = Boolean(
        canSeeLocation &&
        ((profile?.currentCity && candidateProfile?.currentCity?.toLocaleLowerCase() === profile.currentCity.toLocaleLowerCase()) ||
          (profile?.currentCountry && candidateProfile?.currentCountry?.toLocaleLowerCase() === profile.currentCountry.toLocaleLowerCase()))
      )
    const similarProfession = Boolean(
        (profile?.profession && candidateProfile?.profession?.toLocaleLowerCase() === profile.profession.toLocaleLowerCase()) ||
        (profile?.industry && candidateProfile?.industry?.toLocaleLowerCase() === profile.industry.toLocaleLowerCase())
      )
    const score =
      Number(sameSet) * 10_000 +
      Number(sameHouse) * 1_000 +
      Number(sharedChapter) * 100 +
      Number(similarLocation) * 10 +
      Number(similarProfession)
    const matchReason = sameSet
      ? 'Same Set'
      : sameHouse
        ? 'Same House'
        : sharedChapter
          ? 'Shared chapter'
          : similarLocation
            ? 'Similar location'
            : 'Similar professional interests'
    return { candidate, score, matchReason }
  })
  ranked.sort(
    (first, second) =>
      second.score - first.score ||
      first.candidate.surname.localeCompare(second.candidate.surname) ||
      first.candidate.id.localeCompare(second.candidate.id)
  )

  const recommendationIds = ranked.slice(0, 8).map(({ candidate }) => candidate.id)
  const following = recommendationIds.length
    ? await prisma.follow.findMany({
        where: { followerId: userId, followingId: { in: recommendationIds } },
        select: { followingId: true },
      })
    : []
  const followingIds = new Set(following.map((follow) => follow.followingId))

  return ranked.slice(0, 8).map(({ candidate, matchReason }) => ({
    ...memberCard(candidate, userId, 'none', followingIds.has(candidate.id)),
    matchReason,
  }))
}
