import { AdminRole } from '@prisma/client'
import { cache } from 'react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schoolAdminRoles: AdminRole[] = [
  AdminRole.SUPER_ADMIN,
  AdminRole.NATIONAL_ADMIN,
  AdminRole.SCHOOL_ADMIN,
]

const moderationRoles: AdminRole[] = [
  AdminRole.SUPER_ADMIN,
  AdminRole.NATIONAL_ADMIN,
  AdminRole.SCHOOL_ADMIN,
  AdminRole.MODERATOR,
]

export async function isSchoolAdministrator(userId: string, schoolId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, schoolId, isActive: true },
    select: { role: true },
  })
  if (!user) return false
  if (schoolAdminRoles.includes(user.role)) return true

  const assignment = await prisma.schoolAdministrator.findFirst({
    where: { userId, schoolId, role: { in: schoolAdminRoles } },
    select: { id: true },
  })
  return Boolean(assignment)
}

export const currentSchoolAdministrator = cache(async () => {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) return null
  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      schoolId: session.user.schoolId,
      isActive: true,
    },
    select: { id: true, schoolId: true, firstName: true, surname: true, role: true },
  })
  if (!user) return null
  const assignment = user.role === AdminRole.SUPER_ADMIN
    ? null
    : await prisma.schoolAdministrator.findFirst({
        where: { userId: user.id, schoolId: user.schoolId, role: { in: schoolAdminRoles } },
        select: { role: true },
      })
  if (!schoolAdminRoles.includes(user.role) && !assignment) return null
  return {
    id: user.id,
    schoolId: user.schoolId,
    firstName: user.firstName,
    surname: user.surname,
    isGlobalAdministrator: user.role === AdminRole.SUPER_ADMIN || assignment?.role === AdminRole.SUPER_ADMIN,
  }
})

/** Moderators include all school-administrator roles plus the dedicated MODERATOR role. */
export const currentModerator = cache(async () => {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) return null
  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      schoolId: session.user.schoolId,
      isActive: true,
    },
    select: { id: true, schoolId: true, firstName: true, surname: true, role: true },
  })
  if (!user) return null
  const assignment = moderationRoles.includes(user.role)
    ? null
    : await prisma.schoolAdministrator.findFirst({
        where: { userId: user.id, schoolId: user.schoolId, role: { in: moderationRoles } },
        select: { role: true },
      })
  if (!moderationRoles.includes(user.role) && !assignment) return null
  return {
    id: user.id,
    schoolId: user.schoolId,
    firstName: user.firstName,
    surname: user.surname,
  }
})
