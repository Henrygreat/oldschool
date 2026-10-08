'use server'

import { ConnectionStatus, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { NetworkActionResult } from '@/lib/network-types'

async function authenticatedMember() {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) return null

  return prisma.user.findFirst({
    where: { id: session.user.id, schoolId: session.user.schoolId, isActive: true },
    select: { id: true, schoolId: true, firstName: true, middleName: true, surname: true },
  })
}

async function lockMemberPair(
  transaction: Prisma.TransactionClient,
  firstUserId: string,
  secondUserId: string
) {
  const pair = [firstUserId, secondUserId].sort().join(':')
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${pair}, 0))`
}

async function activeTarget(userId: string, schoolId: string) {
  return prisma.user.findFirst({
    where: { id: userId, schoolId, isActive: true },
    select: { id: true, firstName: true, middleName: true, surname: true },
  })
}

function isValidMemberId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 64
}

function refreshNetworkPaths(targetUserId: string) {
  revalidatePath('/network')
  revalidatePath('/directory')
  revalidatePath('/dashboard')
  revalidatePath(`/members/${targetUserId}`)
}

function logFailure(action: string, error: unknown) {
  // Only codes and metadata are logged; Prisma messages can contain user data.
  console.error('Network action failed', {
    action,
    name: error instanceof Error ? error.name : typeof error,
    code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
    meta: error instanceof Prisma.PrismaClientKnownRequestError ? error.meta : undefined,
  })
}

function failure(error: string): NetworkActionResult {
  return { ok: false, error }
}

export async function sendConnectionRequest(targetUserId: string): Promise<NetworkActionResult> {
  const member = await authenticatedMember()
  if (!member) return failure('Sign in to connect with an Old Boy.')
  if (!isValidMemberId(targetUserId)) return failure('That member is not valid.')
  if (targetUserId === member.id) return failure('You cannot connect with yourself.')

  try {
    const target = await activeTarget(targetUserId, member.schoolId)
    if (!target) return failure('This member is not available in your school network.')

    await prisma.$transaction(async (transaction) => {
      await lockMemberPair(transaction, member.id, target.id)
      const pair = await transaction.connection.findMany({
        where: {
          OR: [
            { fromUserId: member.id, toUserId: target.id },
            { fromUserId: target.id, toUserId: member.id },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, fromUserId: true, toUserId: true, status: true },
      })

      if (pair.some((connection) => connection.status === ConnectionStatus.ACCEPTED)) {
        throw new Error('CONNECTION_ALREADY_EXISTS')
      }
      if (pair.some((connection) => connection.status === ConnectionStatus.BLOCKED)) {
        throw new Error('CONNECTION_UNAVAILABLE')
      }
      if (pair.some((connection) => connection.status === ConnectionStatus.PENDING)) {
        throw new Error('CONNECTION_REQUEST_PENDING')
      }

      const declined = pair.filter((connection) => connection.status === ConnectionStatus.DECLINED)
      if (declined.length) {
        const latest = declined[0]
        await transaction.connection.deleteMany({
          where: {
            id: { in: declined.slice(1).map((connection) => connection.id) },
          },
        })
        await transaction.connection.update({
          where: { id: latest.id },
          data: {
            fromUserId: member.id,
            toUserId: target.id,
            status: ConnectionStatus.PENDING,
          },
        })
      } else {
        await transaction.connection.create({
          data: {
            fromUserId: member.id,
            toUserId: target.id,
            status: ConnectionStatus.PENDING,
          },
        })
      }

      await transaction.notification.create({
        data: {
          userId: target.id,
          actorId: member.id,
          type: 'CONNECTION_REQUEST',
          content: `${[member.firstName, member.middleName, member.surname].filter(Boolean).join(' ')} sent you a connection request.`,
          link: '/network?tab=received',
        },
      })
    })

    refreshNetworkPaths(target.id)
    return { ok: true }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'CONNECTION_ALREADY_EXISTS') return failure('You are already connected.')
      if (error.message === 'CONNECTION_UNAVAILABLE') return failure('A connection cannot be requested for this member.')
      if (error.message === 'CONNECTION_REQUEST_PENDING') return failure('A connection request is already pending.')
    }
    logFailure('sendConnectionRequest', error)
    return failure('The connection request could not be sent. Please try again.')
  }
}

export async function respondToConnectionRequest(
  senderId: string,
  decision: 'accept' | 'decline'
): Promise<NetworkActionResult> {
  const member = await authenticatedMember()
  if (!member) return failure('Sign in to manage connection requests.')
  if (!isValidMemberId(senderId)) return failure('That connection request is not valid.')
  if (senderId === member.id) return failure('That connection request is not valid.')
  if (decision !== 'accept' && decision !== 'decline') return failure('Choose a valid response.')

  try {
    const sender = await activeTarget(senderId, member.schoolId)
    if (!sender) return failure('This member is not available in your school network.')

    const changed = await prisma.$transaction(async (transaction) => {
      await lockMemberPair(transaction, member.id, sender.id)
      const result = await transaction.connection.updateMany({
        where: {
          fromUserId: sender.id,
          toUserId: member.id,
          status: ConnectionStatus.PENDING,
        },
        data: {
          status: decision === 'accept' ? ConnectionStatus.ACCEPTED : ConnectionStatus.DECLINED,
        },
      })
      if (result.count !== 1) return false
      if (decision === 'accept') {
        await transaction.notification.create({
          data: {
            userId: sender.id,
            actorId: member.id,
            type: 'CONNECTION_ACCEPTED',
            content: `${[member.firstName, member.middleName, member.surname].filter(Boolean).join(' ')} accepted your connection request.`,
            link: '/network?tab=connections',
          },
        })
      }
      return true
    })

    if (!changed) return failure('This request is no longer pending.')
    refreshNetworkPaths(sender.id)
    return { ok: true }
  } catch (error) {
    logFailure('respondToConnectionRequest', error)
    return failure('Your response could not be saved. Please try again.')
  }
}

export async function cancelConnectionRequest(targetUserId: string): Promise<NetworkActionResult> {
  const member = await authenticatedMember()
  if (!member) return failure('Sign in to manage connection requests.')
  if (!isValidMemberId(targetUserId)) return failure('That connection request is not valid.')
  if (targetUserId === member.id) return failure('That connection request is not valid.')

  try {
    const changed = await prisma.$transaction(async (transaction) => {
      await lockMemberPair(transaction, member.id, targetUserId)
      const result = await transaction.connection.deleteMany({
        where: {
          fromUserId: member.id,
          toUserId: targetUserId,
          status: ConnectionStatus.PENDING,
          toUser: { schoolId: member.schoolId, isActive: true },
        },
      })
      return result.count === 1
    })
    if (!changed) return failure('This request is no longer pending.')
    refreshNetworkPaths(targetUserId)
    return { ok: true }
  } catch (error) {
    logFailure('cancelConnectionRequest', error)
    return failure('The request could not be cancelled. Please try again.')
  }
}

export async function removeConnection(targetUserId: string): Promise<NetworkActionResult> {
  const member = await authenticatedMember()
  if (!member) return failure('Sign in to manage your connections.')
  if (!isValidMemberId(targetUserId)) return failure('That connection is not valid.')
  if (targetUserId === member.id) return failure('That connection is not valid.')

  try {
    const target = await activeTarget(targetUserId, member.schoolId)
    if (!target) return failure('This member is not available in your school network.')
    const changed = await prisma.$transaction(async (transaction) => {
      await lockMemberPair(transaction, member.id, target.id)
      const result = await transaction.connection.deleteMany({
        where: {
          status: ConnectionStatus.ACCEPTED,
          OR: [
            { fromUserId: member.id, toUserId: target.id },
            { fromUserId: target.id, toUserId: member.id },
          ],
        },
      })
      return result.count > 0
    })
    if (!changed) return failure('You are not connected to this member.')
    refreshNetworkPaths(target.id)
    return { ok: true }
  } catch (error) {
    logFailure('Could not remove a connection.', error)
    return failure('The connection could not be removed. Please try again.')
  }
}

export async function toggleFollow(targetUserId: string, follow: boolean): Promise<NetworkActionResult> {
  const member = await authenticatedMember()
  if (!member) return failure('Sign in to follow members.')
  if (!isValidMemberId(targetUserId)) return failure('That member is not valid.')
  if (typeof follow !== 'boolean') return failure('Choose a valid follow action.')
  if (targetUserId === member.id) return failure('You cannot follow yourself.')

  try {
    const target = await activeTarget(targetUserId, member.schoolId)
    if (!target) return failure('This member is not available in your school network.')

    if (follow) {
      const blocked = await prisma.connection.findFirst({
        where: {
          status: ConnectionStatus.BLOCKED,
          OR: [
            { fromUserId: member.id, toUserId: target.id },
            { fromUserId: target.id, toUserId: member.id },
          ],
        },
        select: { id: true },
      })
      if (blocked) return failure('You cannot follow this member.')

      await prisma.follow.createMany({
        data: [{ followerId: member.id, followingId: target.id }],
        skipDuplicates: true,
      })
    } else {
      await prisma.follow.deleteMany({
        where: { followerId: member.id, followingId: target.id },
      })
    }
    refreshNetworkPaths(target.id)
    return { ok: true }
  } catch (error) {
    logFailure('Could not update a member follow.', error)
    return failure('Your follow preference could not be saved. Please try again.')
  }
}

export async function markNetworkingActivityRead(): Promise<NetworkActionResult> {
  const member = await authenticatedMember()
  if (!member) return failure('Sign in to manage notifications.')

  try {
    await prisma.notification.updateMany({
      where: {
        userId: member.id,
        isRead: false,
        type: { in: ['CONNECTION_REQUEST', 'CONNECTION_ACCEPTED'] },
      },
      data: { isRead: true },
    })
    revalidatePath('/network')
    return { ok: true }
  } catch (error) {
    logFailure('Could not mark networking notifications as read.', error)
    return failure('Notifications could not be updated. Please try again.')
  }
}
