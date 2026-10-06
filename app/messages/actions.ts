'use server'

import { ConnectionStatus, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  activeMessagingUser,
  canMessage,
  conversationParticipant,
  displayName,
  findOrCreateDirectConversation,
  isMessagingPrivacy,
  MAX_MESSAGE_LENGTH,
  markConversationRead,
  setMessagingPrivacy,
} from '@/lib/messaging'

export type MessagingActionResult = { ok: true } | { ok: false; error: string }

function failure(error: string): MessagingActionResult {
  return { ok: false, error }
}

function isValidId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 64
}

async function lockUserPair(
  transaction: Prisma.TransactionClient,
  firstUserId: string,
  secondUserId: string
) {
  const pair = [firstUserId, secondUserId].sort().join(':')
  await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${pair}, 5))`
}

/** Starts (or reuses) a direct conversation with the target member and redirects there. */
export async function startConversation(
  targetUserId: string
): Promise<MessagingActionResult & { conversationId?: string }> {
  const member = await activeMessagingUser()
  if (!member) return failure('Sign in to send a message.')
  if (!isValidId(targetUserId)) return failure('That member is not valid.')

  const result = await findOrCreateDirectConversation(member.id, targetUserId, member.schoolId)
  if (!result.ok) return failure(result.error)

  revalidatePath('/messages')
  return { ok: true, conversationId: result.conversationId }
}

export async function sendMessage(conversationId: string, content: string): Promise<MessagingActionResult> {
  const member = await activeMessagingUser()
  if (!member) return failure('Sign in to send a message.')
  if (!isValidId(conversationId)) return failure('That conversation is not valid.')

  const trimmed = content.trim()
  if (!trimmed) return failure('Message cannot be empty.')
  if (trimmed.length > MAX_MESSAGE_LENGTH) return failure(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`)

  const participant = await conversationParticipant(conversationId, member.id)
  if (!participant) return failure('That conversation is not available.')

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { participants: { where: { userId: { not: member.id } }, select: { userId: true } } },
  })
  const recipientId = conversation?.participants[0]?.userId
  if (!recipientId) return failure('That conversation is not available.')

  const permission = await canMessage(member.id, recipientId, member.schoolId)
  if (!permission.allowed) return failure(permission.reason ?? 'You cannot message this member.')

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.message.create({
        data: { conversationId, senderId: member.id, content: trimmed },
      })
      await transaction.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      })
      await transaction.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId: member.id } },
        data: { lastReadAt: new Date() },
      })

      // Anti-spam: only notify the recipient about an unread conversation once,
      // avoiding a new notification row for every message in a fast exchange.
      const recentUnreadNotification = await transaction.notification.findFirst({
        where: {
          userId: recipientId,
          actorId: member.id,
          type: 'NEW_MESSAGE',
          link: `/messages/${conversationId}`,
          isRead: false,
        },
        select: { id: true },
      })
      if (!recentUnreadNotification) {
        await transaction.notification.create({
          data: {
            userId: recipientId,
            actorId: member.id,
            type: 'NEW_MESSAGE',
            content: `${displayName(member)} sent you a message.`,
            link: `/messages/${conversationId}`,
          },
        })
      }
    })
  } catch {
    return failure('The message could not be sent. Please try again.')
  }

  revalidatePath('/messages')
  revalidatePath(`/messages/${conversationId}`)
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function markRead(conversationId: string): Promise<MessagingActionResult> {
  const member = await activeMessagingUser()
  if (!member) return failure('Sign in to continue.')
  if (!isValidId(conversationId)) return failure('That conversation is not valid.')

  await markConversationRead(conversationId, member.id)
  revalidatePath('/messages')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function updateMessagingPrivacy(value: string): Promise<MessagingActionResult> {
  const member = await activeMessagingUser()
  if (!member) return failure('Sign in to continue.')
  if (!isMessagingPrivacy(value)) return failure('That option is not valid.')

  await setMessagingPrivacy(member.id, value)
  revalidatePath('/messages')
  return { ok: true }
}

export async function blockMember(targetUserId: string): Promise<MessagingActionResult> {
  const member = await activeMessagingUser()
  if (!member) return failure('Sign in to continue.')
  if (!isValidId(targetUserId)) return failure('That member is not valid.')
  if (targetUserId === member.id) return failure('You cannot block yourself.')

  const target = await prisma.user.findFirst({
    where: { id: targetUserId, schoolId: member.schoolId, isActive: true },
    select: { id: true },
  })
  if (!target) return failure('This member is not available.')

  await prisma.$transaction(async (transaction) => {
    await lockUserPair(transaction, member.id, target.id)
    await transaction.connection.deleteMany({
      where: {
        OR: [
          { fromUserId: member.id, toUserId: target.id },
          { fromUserId: target.id, toUserId: member.id },
        ],
      },
    })
    await transaction.follow.deleteMany({
      where: {
        OR: [
          { followerId: member.id, followingId: target.id },
          { followerId: target.id, followingId: member.id },
        ],
      },
    })
    await transaction.connection.create({
      data: { fromUserId: member.id, toUserId: target.id, status: ConnectionStatus.BLOCKED },
    })
  })

  revalidatePath('/network')
  revalidatePath('/directory')
  revalidatePath('/messages')
  revalidatePath(`/members/${targetUserId}`)
  return { ok: true }
}

export async function unblockMember(targetUserId: string): Promise<MessagingActionResult> {
  const member = await activeMessagingUser()
  if (!member) return failure('Sign in to continue.')
  if (!isValidId(targetUserId)) return failure('That member is not valid.')

  await prisma.connection.deleteMany({
    where: {
      fromUserId: member.id,
      toUserId: targetUserId,
      status: ConnectionStatus.BLOCKED,
    },
  })

  revalidatePath('/network')
  revalidatePath('/directory')
  revalidatePath('/messages')
  revalidatePath(`/members/${targetUserId}`)
  return { ok: true }
}

const reportReasons = ['SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'IMPERSONATION', 'OTHER']

function isValidReason(value: unknown): value is string {
  return typeof value === 'string' && reportReasons.includes(value)
}

export async function reportMember(
  targetUserId: string,
  reason: string,
  explanation: string
): Promise<MessagingActionResult> {
  const member = await activeMessagingUser()
  if (!member) return failure('Sign in to continue.')
  if (!isValidId(targetUserId)) return failure('That member is not valid.')
  if (targetUserId === member.id) return failure('You cannot report yourself.')
  if (!isValidReason(reason)) return failure('Choose a valid reason.')

  const target = await prisma.user.findFirst({
    where: { id: targetUserId, schoolId: member.schoolId },
    select: { id: true },
  })
  if (!target) return failure('This member is not available.')

  await prisma.report.create({
    data: {
      reporterId: member.id,
      reportedUserId: target.id,
      reason,
      explanation: explanation.trim().slice(0, 1000) || null,
      status: 'OPEN',
    },
  })

  return { ok: true }
}

export async function reportMessage(
  messageId: string,
  reason: string,
  explanation: string
): Promise<MessagingActionResult> {
  const member = await activeMessagingUser()
  if (!member) return failure('Sign in to continue.')
  if (!isValidId(messageId)) return failure('That message is not valid.')
  if (!isValidReason(reason)) return failure('Choose a valid reason.')

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, senderId: true, conversationId: true },
  })
  if (!message) return failure('That message is not available.')

  const participant = await conversationParticipant(message.conversationId, member.id)
  if (!participant) return failure('That message is not available.')

  await prisma.report.create({
    data: {
      reporterId: member.id,
      reportedUserId: message.senderId,
      messageId: message.id,
      reason,
      explanation: explanation.trim().slice(0, 1000) || null,
      status: 'OPEN',
    },
  })

  return { ok: true }
}
