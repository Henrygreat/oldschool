'use server'

import { revalidatePath } from 'next/cache'
import { currentModerator } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export type ModerationActionResult = { ok: true } | { ok: false; error: string }

const reviewStatuses = ['UNDER_REVIEW', 'RESOLVED', 'DISMISSED'] as const

function isValidId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 64
}

export async function updateReportStatus(reportId: string, status: string): Promise<ModerationActionResult> {
  const moderator = await currentModerator()
  if (!moderator) return { ok: false, error: 'You are not authorised to review reports.' }
  if (!isValidId(reportId)) return { ok: false, error: 'That report is not valid.' }
  if (!reviewStatuses.includes(status as (typeof reviewStatuses)[number])) {
    return { ok: false, error: 'Choose a valid status.' }
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, reportedUser: { select: { schoolId: true } }, reporter: { select: { schoolId: true } } },
  })
  if (!report) return { ok: false, error: 'That report is not available.' }
  const reportSchoolId = report.reportedUser?.schoolId ?? report.reporter.schoolId
  if (reportSchoolId !== moderator.schoolId) return { ok: false, error: 'That report is not available.' }

  await prisma.report.update({
    where: { id: reportId },
    data: { status, reviewerId: moderator.id, reviewedAt: new Date() },
  })

  revalidatePath('/admin/reports')
  return { ok: true }
}
