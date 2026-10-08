'use server'

import { AlumniClaimStatus, ArchiveRecordStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type ArchiveClaimResult = { ok: true } | { ok: false; error: string }

export async function submitArchiveClaim(
  archiveRecordId: string,
  message: string
): Promise<ArchiveClaimResult> {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) {
    return { ok: false, error: 'Sign in to submit a claim.' }
  }
  if (typeof archiveRecordId !== 'string' || archiveRecordId.length > 64 || typeof message !== 'string') {
    return { ok: false, error: 'The claim details are invalid.' }
  }
  const claimant = await prisma.user.findFirst({
    where: { id: session.user.id, schoolId: session.user.schoolId, isActive: true },
    select: { id: true },
  })
  if (!claimant) return { ok: false, error: 'Your account is not available.' }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${archiveRecordId}, 1))`
      const record = await transaction.alumniArchiveRecord.findFirst({
        where: {
          id: archiveRecordId,
          schoolId: session.user.schoolId,
          archivedAt: null,
        },
        select: { id: true, status: true, claimedByUserId: true },
      })
      if (!record) return 'NOT_FOUND'
      if (record.status === ArchiveRecordStatus.DECEASED) return 'DECEASED'
      if (record.status !== ArchiveRecordStatus.LIVING) return 'NOT_LIVING'
      if (record.claimedByUserId) return 'CLAIMED'
      const previousClaim = await transaction.alumniProfileClaim.findFirst({
        where: {
          archiveRecordId: record.id,
          claimantUserId: claimant.id,
          status: AlumniClaimStatus.PENDING,
        },
        select: { id: true },
      })
      if (previousClaim) return 'PENDING'
      await transaction.alumniProfileClaim.create({
        data: {
          archiveRecordId: record.id,
          claimantUserId: claimant.id,
          schoolId: session.user.schoolId,
          claimantMessage: message.trim().slice(0, 1000) || null,
        },
      })
      return 'CREATED'
    })
    if (result !== 'CREATED') {
      const errors: Record<string, string> = {
        NOT_FOUND: 'This archive record is not available.',
        DECEASED: 'A memorial record cannot be claimed.',
        NOT_LIVING: 'This archive record must be marked as living before it can be claimed.',
        CLAIMED: 'This archive record has already been claimed.',
        PENDING: 'You already have a pending claim for this record.',
      }
      return { ok: false, error: errors[result] ?? 'The claim could not be submitted.' }
    }
    revalidatePath(`/archive/${archiveRecordId}`)
    revalidatePath('/admin/alumni')
    return { ok: true }
  } catch {
    console.error('Could not submit alumni profile claim.')
    return { ok: false, error: 'Your claim could not be submitted. Please try again.' }
  }
}
