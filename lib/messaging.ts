import { ConnectionStatus, Prisma, VisibilityLevel } from '@prisma/client'
import { cache } from 'react'
import { auth } from '@/lib/auth'
import { memberPhotoUrl } from '@/lib/profile'
import { prisma } from '@/lib/prisma'
import { CONVERSATION_PAGE_SIZE, MAX_MESSAGE_LENGTH, MESSAGE_PAGE_SIZE, type MessagingPrivacy } from '@/lib/messaging-shared'

export { CONVERSATION_PAGE_SIZE, MAX_MESSAGE_LENGTH, MESSAGE_PAGE_SIZE, isMessagingPrivacy, type MessagingPrivacy } from '@/lib/messaging-shared'

export const activeMessagingUser = cache(async () => {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) return null
  return prisma.user.findFirst({
    where: { id: session.user.id, schoolId: session.user.schoolId, isActive: true },
    select: { id: true, schoolId: true, firstName: true, middleName: true, surname: true },
  })
})

export function displayName(user: { firstName: string; middleName?: string | null; surname: string }) {
  return [user.firstName, user.middleName, user.surname].filter(Boolean).join(' ')
}

async function lockUserPair(
  transaction: Prisma.TransactionClient,
  firstUserId: string,
  secondUserId: string,
  namespace: number
) {
  const pair = [firstUserId, secondUserId].sort().join(':')
  await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${pair}, ${namespace}))`
}

/** Returns the id of the user who blocked the other, if a block exists between the pair. */
export async function blockedByUserId(userId: string, otherUserId: string) {
  const block = await prisma.connection.findFirst({
    where: {
      status: ConnectionStatus.BLOCKED,
      OR: [
        { fromUserId: userId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: userId },
      ],
    },
    select: { fromUserId: true },
  })
  return block?.fromUserId ?? null
}

export async function isBlockedPair(userId: string, otherUserId: string) {
  return Boolean(await blockedByUserId(userId, otherUserId))
}

export async function messagingPrivacyFor(userId: string): Promise<MessagingPrivacy> {
  const setting = await prisma.privacySetting.findUnique({
    where: { userId_field: { userId, field: 'messaging' } },
    select: { visibility: true },
  })
  if (!setting) return 'CONNECTIONS_ONLY'
  if (setting.visibility === VisibilityLevel.MEMBERS_ONLY) return 'MEMBERS_ONLY'
  if (setting.visibility === VisibilityLevel.PRIVATE) return 'PRIVATE'
  return 'CONNECTIONS_ONLY'
}

export async function setMessagingPrivacy(userId: string, value: MessagingPrivacy) {
  const visibility = value === 'MEMBERS_ONLY'
    ? VisibilityLevel.MEMBERS_ONLY
    : value === 'PRIVATE'
      ? VisibilityLevel.PRIVATE
      : VisibilityLevel.CONNECTIONS_ONLY
  await prisma.privacySetting.upsert({
    where: { userId_field: { userId, field: 'messaging' } },
    create: { userId, field: 'messaging', visibility },
    update: { visibility },
  })
}

async function areConnected(userId: string, otherUserId: string) {
  const connection = await prisma.connection.findFirst({
    where: {
      status: ConnectionStatus.ACCEPTED,
      OR: [
        { fromUserId: userId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: userId },
      ],
    },
    select: { id: true },
  })
  return Boolean(connection)
}

/**
 * Determines whether `viewerId` may message `targetId`. Checks active same-school
 * membership, blocking (in either direction), and the target's messaging privacy
 * preference (defaults to connections-only).
 */
export async function canMessage(
  viewerId: string,
  targetId: string,
  schoolId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (viewerId === targetId) return { allowed: false, reason: 'You cannot message yourself.' }
  const target = await prisma.user.findFirst({
    where: { id: targetId, schoolId, isActive: true },
    select: { id: true },
  })
  if (!target) return { allowed: false, reason: 'This member is not available.' }
  if (await isBlockedPair(viewerId, targetId)) {
    return { allowed: false, reason: 'You cannot message this member.' }
  }
  const privacy = await messagingPrivacyFor(targetId)
  if (privacy === 'PRIVATE') return { allowed: false, reason: 'This member cannot be messaged.' }
  if (privacy === 'MEMBERS_ONLY') return { allowed: true }
  const connected = await areConnected(viewerId, targetId)
  if (!connected) return { allowed: false, reason: 'Connect with this member before sending a message.' }
  return { allowed: true }
}

/**
 * Finds an existing direct (two-party) conversation between the users, or creates
 * one. Uses an advisory lock keyed by the sorted user pair to prevent duplicate
 * conversations from concurrent requests.
 */
export async function findOrCreateDirectConversation(viewerId: string, targetId: string, schoolId: string) {
  const permission = await canMessage(viewerId, targetId, schoolId)
  if (!permission.allowed) return { ok: false as const, error: permission.reason ?? 'You cannot message this member.' }

  const conversationId = await prisma.$transaction(async (transaction) => {
    await lockUserPair(transaction, viewerId, targetId, 4)
    const existing = await transaction.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: viewerId } } },
          { participants: { some: { userId: targetId } } },
        ],
      },
      select: { id: true },
    })
    if (existing) return existing.id
    const created = await transaction.conversation.create({
      data: {
        participants: {
          create: [{ userId: viewerId }, { userId: targetId }],
        },
      },
      select: { id: true },
    })
    return created.id
  })
  return { ok: true as const, conversationId }
}

const otherUserSelect = {
  id: true,
  firstName: true,
  middleName: true,
  surname: true,
  nickname: true,
  profilePhotoUrl: true,
  profilePhotoKey: true,
  updatedAt: true,
  isActive: true,
} as const

type OtherUserRecord = {
  id: string
  firstName: string
  middleName: string | null
  surname: string
  nickname: string | null
  profilePhotoUrl: string | null
  profilePhotoKey: string | null
  updatedAt: Date
  isActive: boolean
}

export type ConversationOtherUser = {
  id: string
  name: string
  nickname: string | null
  photoUrl: string | null
  isActive: boolean
}

function toConversationOtherUser(user: OtherUserRecord | null): ConversationOtherUser | null {
  if (!user) return null
  return {
    id: user.id,
    name: displayName(user),
    nickname: user.nickname,
    photoUrl: memberPhotoUrl(user.id, user.profilePhotoKey, user.profilePhotoUrl, user.updatedAt),
    isActive: user.isActive,
  }
}

function conversationSummarySelect(viewerId: string) {
  return {
    id: true,
    updatedAt: true,
    participants: {
      where: { userId: { not: viewerId } },
      select: { user: { select: otherUserSelect } },
    },
    messages: {
      orderBy: { createdAt: 'desc' as const },
      take: 1,
      select: { content: true, createdAt: true, senderId: true },
    },
  }
}

export async function getConversationList(userId: string, page: number) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const participation = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true, lastReadAt: true },
  })
  const lastReadByConversation = new Map(participation.map((row) => [row.conversationId, row.lastReadAt]))
  const conversationIds = participation.map((row) => row.conversationId)
  const total = conversationIds.length

  const conversations = await prisma.conversation.findMany({
    where: { id: { in: conversationIds } },
    orderBy: { updatedAt: 'desc' },
    skip: (safePage - 1) * CONVERSATION_PAGE_SIZE,
    take: CONVERSATION_PAGE_SIZE,
    select: conversationSummarySelect(userId),
  })

  const unreadCounts = await Promise.all(
    conversations.map((conversation) => {
      const lastReadAt = lastReadByConversation.get(conversation.id) ?? null
      return prisma.message.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: userId },
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
        },
      })
    })
  )

  const items = conversations.map((conversation, index) => {
    const other = conversation.participants[0]?.user ?? null
    const latest = conversation.messages[0] ?? null
    return {
      id: conversation.id,
      updatedAt: conversation.updatedAt,
      otherUser: toConversationOtherUser(other),
      latestMessage: latest,
      unreadCount: unreadCounts[index] ?? 0,
    }
  })

  return {
    items,
    total,
    page: safePage,
    pages: Math.max(1, Math.ceil(total / CONVERSATION_PAGE_SIZE)),
  }
}

/** Single lightweight indexed query for the authenticated user's total unread message count. */
export const totalUnreadMessages = cache(async (userId: string) => {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "Message" m
    JOIN "ConversationParticipant" cp
      ON cp."conversationId" = m."conversationId" AND cp."userId" = ${userId}
    WHERE m."senderId" != ${userId}
      AND (cp."lastReadAt" IS NULL OR m."createdAt" > cp."lastReadAt")
  `
  return Number(rows[0]?.count ?? 0)
})

export async function conversationParticipant(conversationId: string, userId: string) {
  return prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { id: true, lastReadAt: true },
  })
}

export async function getConversationDetail(conversationId: string, userId: string) {
  const participant = await conversationParticipant(conversationId, userId)
  if (!participant) return null
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      participants: {
        where: { userId: { not: userId } },
        select: { user: { select: otherUserSelect } },
      },
    },
  })
  if (!conversation) return null
  const rawOtherUser = conversation.participants[0]?.user ?? null
  const otherUser = toConversationOtherUser(rawOtherUser)
  const blockerId = rawOtherUser ? await blockedByUserId(userId, rawOtherUser.id) : null
  return {
    id: conversation.id,
    otherUser,
    blockedByViewer: blockerId === userId,
    blockedByOther: Boolean(blockerId) && blockerId !== userId,
  }
}

export async function getConversationMessages(conversationId: string, before?: string) {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: MESSAGE_PAGE_SIZE + 1,
    ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    select: { id: true, content: true, createdAt: true, senderId: true },
  })
  const hasMore = messages.length > MESSAGE_PAGE_SIZE
  const page = messages.slice(0, MESSAGE_PAGE_SIZE)
  return { messages: page.reverse(), hasMore, oldestId: page[0]?.id ?? null }
}

export async function markConversationRead(conversationId: string, userId: string) {
  const participant = await conversationParticipant(conversationId, userId)
  if (!participant) return
  const latest = await prisma.message.findFirst({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  if (!latest) return
  if (participant.lastReadAt && participant.lastReadAt >= latest.createdAt) return
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: latest.createdAt },
  })
}
