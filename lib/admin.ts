import { AdminRole } from '@prisma/client'
import { cache } from 'react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schoolAdminRoles: AdminRole[] = [
  AdminRole.SUPER_ADMIN,
  AdminRole.NATIONAL_ADMIN,
  AdminRole.SCHOOL_ADMIN,
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
    select: { id: true, schoolId: true, firstName: true, surname: true },
  })
  if (!user || !(await isSchoolAdministrator(user.id, user.schoolId))) return null
  return user
})
