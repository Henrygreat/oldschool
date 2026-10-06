'use server'

import { Prisma, VisibilityLevel } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { profileInputSchema } from '@/lib/profile'

type SaveProfileResult = { ok: true } | { ok: false; error: string }

const nullable = (value: string) => value || null

export async function saveProfile(input: unknown): Promise<SaveProfileResult> {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) {
    return { ok: false, error: 'Please sign in to save your profile.' }
  }

  const parsed = profileInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your profile details.' }
  }

  const data = parsed.data
  if (data.houseId) {
    const house = await prisma.house.findFirst({
      where: { id: data.houseId, schoolId: session.user.schoolId, isActive: true },
      select: { id: true },
    })
    if (!house) return { ok: false, error: 'Choose a valid house.' }
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findFirst({
        where: { id: session.user.id, schoolId: session.user.schoolId, isActive: true },
        select: { id: true },
      })
      if (!user) throw new Error('PROFILE_OWNER_NOT_FOUND')

      await transaction.user.update({
        where: { id: user.id },
        data: {
          firstName: data.firstName,
          middleName: nullable(data.middleName),
          surname: data.surname,
          nickname: nullable(data.nickname),
        },
      })

      const profile = await transaction.alumniProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          schoolId: session.user.schoolId,
          biography: nullable(data.biography),
          currentCity: nullable(data.currentCity),
          currentCountry: nullable(data.currentCountry),
          profession: nullable(data.profession),
          industry: nullable(data.industry),
          company: nullable(data.company),
          jobTitle: nullable(data.jobTitle),
          phone: nullable(data.phone),
          linkedInUrl: nullable(data.linkedInUrl),
          websiteUrl: nullable(data.websiteUrl),
        },
        update: {
          biography: nullable(data.biography),
          currentCity: nullable(data.currentCity),
          currentCountry: nullable(data.currentCountry),
          profession: nullable(data.profession),
          industry: nullable(data.industry),
          company: nullable(data.company),
          jobTitle: nullable(data.jobTitle),
          phone: nullable(data.phone),
          linkedInUrl: nullable(data.linkedInUrl),
          websiteUrl: nullable(data.websiteUrl),
        },
        select: { id: true, verificationStatus: true },
      })
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${profile.id}, 3))`
      const currentProfile = await transaction.alumniProfile.findFirst({
        where: { id: profile.id, userId: user.id, schoolId: session.user.schoolId },
        select: { verificationStatus: true },
      })

      const set = data.setYear === null
        ? null
        : await transaction.cohort.upsert({
            where: {
              schoolId_year: { schoolId: session.user.schoolId, year: data.setYear },
            },
            create: {
              schoolId: session.user.schoolId,
              year: data.setYear,
              name: `Set of ${data.setYear}`,
            },
            update: {},
            select: { id: true },
          })

      const attendance = await transaction.schoolAttendance.findFirst({
        where: { alumniProfileId: profile.id, schoolId: session.user.schoolId },
        select: { id: true, cohort: { select: { year: true } } },
      })
      if (
        (currentProfile?.verificationStatus === 'VERIFIED' || currentProfile?.verificationStatus === 'PENDING') &&
        (attendance?.cohort?.year ?? null) !== data.setYear
      ) {
        throw new Error('PROFILE_SET_LOCKED')
      }
      const attendanceData = {
        entryYear: data.entryYear,
        leavingYear: data.leavingYear,
        studentNumber: nullable(data.studentNumber),
        cohortId: set?.id ?? null,
        houseId: nullable(data.houseId),
      }
      const hasAttendance = Object.values(attendanceData).some((value) => value !== null)

      if (attendance) {
        await transaction.schoolAttendance.update({
          where: { id: attendance.id },
          data: attendanceData,
        })
      } else if (hasAttendance) {
        await transaction.schoolAttendance.create({
          data: {
            ...attendanceData,
            alumniProfileId: profile.id,
            schoolId: session.user.schoolId,
          },
        })
      }

      await Promise.all(
        (Object.entries(data.privacy) as [keyof typeof data.privacy, VisibilityLevel][]).map(
          ([field, visibility]) =>
            transaction.privacySetting.upsert({
              where: { userId_field: { userId: user.id, field } },
              create: { userId: user.id, field, visibility },
              update: { visibility },
            })
        )
      )
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Profile update failed.', error.code)
      return { ok: false, error: 'Your profile could not be saved. Please try again.' }
    }
    if (error instanceof Error && error.message === 'PROFILE_OWNER_NOT_FOUND') {
      return { ok: false, error: 'Your account is not available. Please sign in again.' }
    }
    if (error instanceof Error && error.message === 'PROFILE_SET_LOCKED') {
      return { ok: false, error: 'Your Set is verified or awaiting review and cannot be changed until the school confirms an update.' }
    }
    throw error
  }

  revalidatePath('/dashboard')
  revalidatePath('/directory')
  revalidatePath('/profile/edit')
  revalidatePath(`/members/${session.user.id}`)
  return { ok: true }
}
