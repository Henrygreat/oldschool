'use server'

import { AlumniClaimStatus, ArchiveRecordStatus, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { currentSchoolAdministrator } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export type AdminActionResult = { ok: true } | { ok: false; error: string }

function validId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 64
}

export async function reviewAlumniClaim(
  claimId: string,
  decision: 'approve' | 'reject',
  reviewerMessage: string
): Promise<AdminActionResult> {
  const admin = await currentSchoolAdministrator()
  if (!admin) return { ok: false, error: 'Administrator access is required.' }
  if (!validId(claimId) || (decision !== 'approve' && decision !== 'reject')) {
    return { ok: false, error: 'The claim review request is invalid.' }
  }
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const claim = await transaction.alumniProfileClaim.findFirst({
        where: { id: claimId, schoolId: admin.schoolId },
        select: { id: true, archiveRecordId: true, status: true, claimantUserId: true },
      })
      if (!claim || claim.status !== AlumniClaimStatus.PENDING) return 'NOT_PENDING'
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${claim.archiveRecordId}, 1))`
      const record = await transaction.alumniArchiveRecord.findFirst({
        where: { id: claim.archiveRecordId, schoolId: admin.schoolId, archivedAt: null },
        select: { id: true, status: true, claimedByUserId: true },
      })
      if (!record) return 'NOT_AVAILABLE'
      if (decision === 'approve') {
        if (record.status === ArchiveRecordStatus.DECEASED) return 'DECEASED'
        if (record.status !== ArchiveRecordStatus.LIVING) return 'NOT_LIVING'
        if (record.claimedByUserId && record.claimedByUserId !== claim.claimantUserId) return 'ALREADY_CLAIMED'
        const claimant = await transaction.user.findFirst({
          where: { id: claim.claimantUserId, schoolId: admin.schoolId, isActive: true },
          select: { id: true },
        })
        if (!claimant) return 'CLAIMANT_UNAVAILABLE'
        await transaction.alumniArchiveRecord.update({
          where: { id: record.id },
          data: { claimedByUserId: claim.claimantUserId, claimedAt: new Date() },
        })
      }
      await transaction.alumniProfileClaim.update({
        where: { id: claim.id },
        data: {
          status: decision === 'approve' ? AlumniClaimStatus.APPROVED : AlumniClaimStatus.REJECTED,
          reviewerUserId: admin.id,
          reviewerMessage: reviewerMessage.trim().slice(0, 1000) || null,
          reviewedAt: new Date(),
        },
      })
      if (decision === 'approve') {
        await transaction.alumniProfileClaim.updateMany({
          where: {
            archiveRecordId: record.id,
            status: AlumniClaimStatus.PENDING,
            id: { not: claim.id },
          },
          data: {
            status: AlumniClaimStatus.REJECTED,
            reviewerUserId: admin.id,
            reviewerMessage: 'Another claim was approved for this archive record.',
            reviewedAt: new Date(),
          },
        })
      }
      return 'UPDATED'
    })
    if (result !== 'UPDATED') {
      const errors: Record<string, string> = {
        NOT_PENDING: 'This claim is no longer pending.',
        NOT_AVAILABLE: 'The archive record is unavailable.',
        DECEASED: 'A memorial record cannot be claimed.',
        NOT_LIVING: 'Mark the archive record as living before approving this claim.',
        ALREADY_CLAIMED: 'Another user already claimed this record.',
        CLAIMANT_UNAVAILABLE: 'The claimant is not an active member of this school.',
      }
      return { ok: false, error: errors[result] ?? 'The claim could not be reviewed.' }
    }
    revalidatePath('/admin/alumni')
    revalidatePath('/directory')
    revalidatePath(`/archive/[id]`, 'page')
    revalidatePath('/sets/[year]', 'page')
    return { ok: true }
  } catch {
    console.error('Could not review alumni profile claim.')
    return { ok: false, error: 'The claim review could not be saved.' }
  }
}

const recordSchema = {
  fullName: (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 200) : '',
  nullable: (value: unknown, max: number) => typeof value === 'string' && value.trim()
    ? value.trim().slice(0, max)
    : null,
}

export async function updateArchiveRecord(
  id: string,
  input: Record<string, unknown>
): Promise<AdminActionResult> {
  const admin = await currentSchoolAdministrator()
  if (!admin) return { ok: false, error: 'Administrator access is required.' }
  if (!validId(id) || !input || typeof input !== 'object') return { ok: false, error: 'The record is invalid.' }
  const fullName = recordSchema.fullName(input.fullName)
  const setYear = Number(input.setYear)
  const status = input.status
  if (
    !fullName ||
    fullName.length > 200 ||
    !Number.isInteger(setYear) ||
    setYear < 1900 ||
    setYear > new Date().getFullYear() ||
    !Object.values(ArchiveRecordStatus).includes(status as ArchiveRecordStatus)
  ) {
    return { ok: false, error: 'Enter a valid name, set/year, and record status.' }
  }
  const email = recordSchema.nullable(input.email, 254)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Enter a valid email address or leave it blank.' }
  }
  try {
    await prisma.$transaction(async (transaction) => {
      const record = await transaction.alumniArchiveRecord.findFirst({
        where: { id, schoolId: admin.schoolId },
        select: { id: true },
      })
      if (!record) throw new Error('ARCHIVE_RECORD_NOT_FOUND')
      const cohort = await transaction.cohort.upsert({
        where: { schoolId_year: { schoolId: admin.schoolId, year: setYear } },
        create: { schoolId: admin.schoolId, year: setYear, name: `Set of ${setYear}` },
        update: {},
        select: { id: true },
      })
      await transaction.alumniArchiveRecord.update({
        where: { id: record.id },
        data: {
          fullName,
          firstName: recordSchema.nullable(input.firstName, 80),
          middleName: recordSchema.nullable(input.middleName, 80),
          surname: recordSchema.nullable(input.surname, 80),
          title: recordSchema.nullable(input.title, 80),
          setYear,
          cohortId: cohort.id,
          house: recordSchema.nullable(input.house, 120),
          profession: recordSchema.nullable(input.profession, 120),
          status: status as ArchiveRecordStatus,
          email,
          phone: recordSchema.nullable(input.phone, 80),
          remarks: recordSchema.nullable(input.remarks, 500),
          biography: recordSchema.nullable(input.biography, 500),
        },
      })
    })
    revalidatePath('/admin/alumni')
    revalidatePath(`/admin/alumni/records/${id}`)
    revalidatePath('/directory')
    revalidatePath('/sets/[year]', 'page')
    revalidatePath(`/archive/${id}`)
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'ARCHIVE_RECORD_NOT_FOUND') {
      return { ok: false, error: 'This archive record no longer exists.' }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Archive record update failed.', error.code)
    } else {
      console.error('Archive record update failed.')
    }
    return { ok: false, error: 'The record could not be saved. Please try again.' }
  }
}

export async function setArchiveRecordArchived(
  id: string,
  archived: boolean
): Promise<AdminActionResult> {
  const admin = await currentSchoolAdministrator()
  if (!admin) return { ok: false, error: 'Administrator access is required.' }
  if (!validId(id) || typeof archived !== 'boolean') return { ok: false, error: 'The archive action is invalid.' }
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const update = await transaction.alumniArchiveRecord.updateMany({
        where: { id, schoolId: admin.schoolId },
        data: { archivedAt: archived ? new Date() : null },
      })
      if (update.count === 1 && archived) {
        await transaction.alumniProfileClaim.updateMany({
          where: { archiveRecordId: id, schoolId: admin.schoolId, status: AlumniClaimStatus.PENDING },
          data: {
            status: AlumniClaimStatus.REJECTED,
            reviewerUserId: admin.id,
            reviewerMessage: 'The archive record was archived before this claim was reviewed.',
            reviewedAt: new Date(),
          },
        })
      }
      return update
    })
    if (result.count !== 1) return { ok: false, error: 'This archive record no longer exists.' }
    revalidatePath('/admin/alumni')
    revalidatePath('/directory')
    revalidatePath('/sets/[year]', 'page')
    revalidatePath(`/archive/${id}`)
    return { ok: true }
  } catch {
    console.error('Could not update archive record availability.')
    return { ok: false, error: 'The record could not be updated.' }
  }
}
