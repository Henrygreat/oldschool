import { AdminRole, type Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export function formatCommunityDate(date: Date) {
  return `${date.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  })} UTC`
}

const schoolWideRoles: AdminRole[] = [
  AdminRole.SUPER_ADMIN,
  AdminRole.NATIONAL_ADMIN,
  AdminRole.SCHOOL_ADMIN,
]

export async function activeCommunityUser() {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) return null
  return prisma.user.findFirst({
    where: { id: session.user.id, schoolId: session.user.schoolId, isActive: true },
    select: {
      id: true,
      schoolId: true,
      role: true,
      firstName: true,
      surname: true,
      alumniProfile: {
        select: {
          id: true,
          verificationStatus: true,
          schoolAttendance: { select: { cohortId: true } },
        },
      },
      claimedArchiveRecord: { select: { setYear: true, cohortId: true } },
    },
  })
}

export async function hasSchoolWideCommunityRole(userId: string, schoolId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, schoolId, isActive: true },
    select: { role: true },
  })
  if (!user) return false
  if (schoolWideRoles.includes(user.role)) return true
  const assignment = await prisma.schoolAdministrator.findFirst({
    where: { userId, schoolId, role: { in: schoolWideRoles } },
    select: { id: true },
  })
  return Boolean(assignment)
}

export async function canManageCohort(userId: string, schoolId: string, cohortId: string) {
  const cohort = await prisma.cohort.findFirst({
    where: { id: cohortId, schoolId },
    select: { id: true },
  })
  if (!cohort) return false
  if (await hasSchoolWideCommunityRole(userId, schoolId)) return true
  const user = await prisma.user.findFirst({
    where: { id: userId, schoolId, isActive: true, role: AdminRole.SET_ADMIN },
    select: { id: true },
  })
  if (!user) return false
  const assignment = await prisma.cohortAdministrator.findUnique({
    where: { cohortId_userId: { cohortId, userId } },
    select: { id: true },
  })
  return Boolean(assignment)
}

export async function canManageChapter(userId: string, schoolId: string, chapterId: string) {
  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, schoolId, isActive: true },
    select: { id: true },
  })
  if (!chapter) return false
  if (await hasSchoolWideCommunityRole(userId, schoolId)) return true
  const user = await prisma.user.findFirst({
    where: { id: userId, schoolId, isActive: true, role: AdminRole.CHAPTER_ADMIN },
    select: { id: true },
  })
  if (!user) return false
  const assignment = await prisma.chapterAdministrator.findUnique({
    where: { chapterId_userId: { chapterId, userId } },
    select: { id: true },
  })
  return Boolean(assignment)
}

export function cohortMembershipFilter(userId: string): Prisma.CohortWhereInput {
  return {
    OR: [
      {
        schoolAttendances: {
          some: {
            alumniProfile: { is: { userId, verificationStatus: 'VERIFIED' } },
          },
        },
      },
      { alumniArchiveRecords: { some: { claimedByUserId: userId, archivedAt: null } } },
    ],
  }
}

export function chapterMembershipFilter(userId: string): Prisma.ChapterWhereInput {
  return { members: { some: { alumniProfile: { is: { userId } } } } }
}

export function visibleEventFilter(userId: string): Prisma.EventWhereInput {
  return {
    OR: [
      { isNational: true },
      { cohort: { is: cohortMembershipFilter(userId) } },
      { chapter: { is: chapterMembershipFilter(userId) } },
    ],
  }
}
