'use server'

import {
  AdminRole,
  ChapterJoinRequestStatus,
  CommunityContentStatus,
  EventStatus,
  EventType,
  RSVPResponse,
  VerificationStatus,
} from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { currentSchoolAdministrator } from '@/lib/admin'
import { activeCommunityUser, canManageChapter, canManageCohort, hasSchoolWideCommunityRole } from '@/lib/community'
import { prisma } from '@/lib/prisma'

function text(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function dateTimeUtc(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value)) {
    return new Date(Number.NaN)
  }
  return new Date(`${value.length === 16 ? `${value}:00` : value}Z`)
}

function safeRedirectPath(formData: FormData) {
  const path = text(formData, 'returnTo', 180)
  return path.startsWith('/') && !path.startsWith('//') ? path : '/dashboard'
}

function fail(path: string, code: string): never {
  redirect(`${path}?communityError=${encodeURIComponent(code)}`)
}

function refreshCommunity(path: string) {
  revalidatePath('/dashboard')
  revalidatePath('/sets')
  revalidatePath('/chapters')
  revalidatePath('/events')
  revalidatePath(path)
}

async function contentScope(
  actorId: string,
  schoolId: string,
  kind: string,
  id: string
): Promise<{ kind: 'national' | 'chapter' | 'set'; id: string | null; returnTo: string } | null> {
  if (kind === 'national') {
    return await hasSchoolWideCommunityRole(actorId, schoolId)
      ? { kind: 'national', id: null, returnTo: '/events' }
      : null
  }
  if (kind === 'chapter') {
    if (!(await canManageChapter(actorId, schoolId, id))) return null
    return { kind: 'chapter', id, returnTo: `/chapters/${encodeURIComponent(id)}` }
  }
  if (kind === 'set') {
    if (!(await canManageCohort(actorId, schoolId, id))) return null
    const cohort = await prisma.cohort.findFirst({
      where: { id, schoolId },
      select: { year: true },
    })
    if (!cohort) return null
    return { kind: 'set', id, returnTo: `/sets/${cohort.year}` }
  }
  return null
}

function scopeData(scope: { kind: 'national' | 'chapter' | 'set'; id: string | null }) {
  return scope.kind === 'national'
    ? { isNational: true, chapterId: null, cohortId: null }
    : {
        isNational: false,
        chapterId: scope.kind === 'chapter' ? scope.id : null,
        cohortId: scope.kind === 'set' ? scope.id : null,
      }
}

export async function createAnnouncement(formData: FormData) {
  const actor = await activeCommunityUser()
  const errorPath = safeRedirectPath(formData)
  if (!actor) fail(errorPath, 'sign-in-required')

  const kind = text(formData, 'scope', 20)
  const scopeId = text(formData, 'scopeId', 64)
  const scope = await contentScope(actor.id, actor.schoolId, kind, scopeId)
  if (!scope) fail(errorPath, 'not-authorized')

  const title = text(formData, 'title', 160)
  const content = text(formData, 'content', 10000)
  const expiresText = text(formData, 'expiresAt', 32)
  const expiresAt = expiresText ? dateTimeUtc(expiresText) : null
  if (!title || !content || (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()))) {
    fail(scope.returnTo, 'invalid-announcement')
  }

  await prisma.announcement.create({
    data: {
      schoolId: actor.schoolId,
      authorId: actor.id,
      ...scopeData(scope),
      title,
      content,
      status: CommunityContentStatus.PUBLISHED,
      publishedAt: new Date(),
      expiresAt,
    },
  })
  refreshCommunity(scope.returnTo)
  redirect(scope.returnTo)
}

export async function createCommunityEvent(formData: FormData) {
  const actor = await activeCommunityUser()
  const errorPath = safeRedirectPath(formData)
  if (!actor) fail(errorPath, 'sign-in-required')

  const kind = text(formData, 'scope', 20)
  const scopeId = text(formData, 'scopeId', 64)
  const scope = await contentScope(actor.id, actor.schoolId, kind, scopeId)
  if (!scope) fail(errorPath, 'not-authorized')

  const title = text(formData, 'title', 160)
  const description = text(formData, 'description', 10000)
  const eventTypeText = text(formData, 'eventType', 40)
  const startAt = dateTimeUtc(text(formData, 'startAt', 40))
  const endText = text(formData, 'endAt', 40)
  const endAt = endText ? dateTimeUtc(endText) : null
  const deadlineText = text(formData, 'rsvpDeadline', 40)
  const rsvpDeadline = deadlineText ? dateTimeUtc(deadlineText) : null
  const capacityText = text(formData, 'capacity', 8)
  const capacity = capacityText ? Number(capacityText) : null
  const meetingUrl = text(formData, 'meetingUrl', 500)
  const location = text(formData, 'location', 200)

  if (
    !title ||
    Number.isNaN(startAt.getTime()) ||
    (endAt && (Number.isNaN(endAt.getTime()) || endAt < startAt)) ||
    (rsvpDeadline && (Number.isNaN(rsvpDeadline.getTime()) || rsvpDeadline > startAt)) ||
    (rsvpDeadline && rsvpDeadline <= new Date()) ||
    (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000)) ||
    !Object.values(EventType).includes(eventTypeText as EventType) ||
    (meetingUrl && !validHttpsUrl(meetingUrl))
  ) {
    fail(scope.returnTo, 'invalid-event')
  }

  await prisma.event.create({
    data: {
      schoolId: actor.schoolId,
      organizerId: actor.id,
      ...scopeData(scope),
      title,
      description: description || null,
      eventType: eventTypeText as EventType,
      startAt,
      endAt,
      location: location || null,
      meetingUrl: meetingUrl || null,
      capacity,
      rsvpDeadline,
      status: EventStatus.PUBLISHED,
    },
  })
  refreshCommunity(scope.returnTo)
  redirect(scope.returnTo)
}

function validHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export async function setEventRSVP(formData: FormData) {
  const actor = await activeCommunityUser()
  const path = safeRedirectPath(formData)
  if (!actor) fail(path, 'sign-in-required')

  const eventId = text(formData, 'eventId', 64)
  const response = text(formData, 'response', 20)
  if (!eventId || !Object.values(RSVPResponse).includes(response as RSVPResponse)) {
    fail(path, 'invalid-rsvp')
  }

  const result = await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${eventId}, 1))`
    const event = await transaction.event.findFirst({
      where: { id: eventId, schoolId: actor.schoolId, status: EventStatus.PUBLISHED },
      select: {
        id: true,
        startAt: true,
        rsvpDeadline: true,
        capacity: true,
        isNational: true,
        cohortId: true,
        chapterId: true,
      },
    })
    if (!event) return 'unavailable'

    const visibility = await transaction.event.findFirst({
      where: {
        id: event.id,
        OR: [
          { isNational: true },
          ...(event.cohortId &&
          ((actor.alumniProfile?.verificationStatus === 'VERIFIED' &&
            actor.alumniProfile.schoolAttendance.some((attendance) => attendance.cohortId === event.cohortId)) ||
            actor.claimedArchiveRecord?.cohortId === event.cohortId)
            ? [{ cohortId: event.cohortId }]
            : []),
          ...(actor.alumniProfile?.id && event.chapterId
            ? [{
                chapter: {
                  is: {
                    members: {
                      some: { alumniProfileId: actor.alumniProfile.id },
                    },
                  },
                },
              }]
            : []),
        ],
      },
      select: { id: true },
    })
    if (!visibility) return 'unavailable'
    if (event.startAt <= new Date() || (event.rsvpDeadline && event.rsvpDeadline <= new Date())) {
      return 'closed'
    }

    const existing = await transaction.eventRSVP.findUnique({
      where: { eventId_userId: { eventId, userId: actor.id } },
      select: { response: true },
    })
    if (
      response === RSVPResponse.GOING &&
      event.capacity !== null &&
      existing?.response !== RSVPResponse.GOING
    ) {
      const goingCount = await transaction.eventRSVP.count({
        where: { eventId, response: RSVPResponse.GOING },
      })
      if (goingCount >= event.capacity) return 'full'
    }
    await transaction.eventRSVP.upsert({
      where: { eventId_userId: { eventId, userId: actor.id } },
      create: { eventId, userId: actor.id, response: response as RSVPResponse },
      update: { response: response as RSVPResponse },
    })
    return 'saved'
  })

  if (result !== 'saved') fail(path, `rsvp-${result}`)
  refreshCommunity(path)
  redirect(path)
}

export async function requestChapterMembership(formData: FormData) {
  const actor = await activeCommunityUser()
  const path = safeRedirectPath(formData)
  if (!actor) fail(path, 'sign-in-required')
  if (!actor.alumniProfile) fail(path, 'profile-required')

  const chapterId = text(formData, 'chapterId', 64)
  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, schoolId: actor.schoolId, isActive: true },
    select: { id: true },
  })
  if (!chapter) fail(path, 'chapter-unavailable')

  const membership = await prisma.chapterMember.findUnique({
    where: { chapterId_alumniProfileId: { chapterId, alumniProfileId: actor.alumniProfile.id } },
    select: { id: true },
  })
  if (membership) fail(path, 'already-member')

  const message = text(formData, 'message', 500)
  const existing = await prisma.chapterJoinRequest.findUnique({
    where: { chapterId_userId: { chapterId, userId: actor.id } },
    select: { id: true, status: true },
  })
  if (existing?.status === ChapterJoinRequestStatus.PENDING) fail(path, 'request-pending')

  await prisma.chapterJoinRequest.upsert({
    where: { chapterId_userId: { chapterId, userId: actor.id } },
    create: { schoolId: actor.schoolId, chapterId, userId: actor.id, message },
    update: {
      status: ChapterJoinRequestStatus.PENDING,
      message,
      reviewerId: null,
      reviewedAt: null,
    },
  })
  refreshCommunity(path)
  redirect(`${path}?communityNotice=requested`)
}

export async function requestSetVerification(formData: FormData) {
  const actor = await activeCommunityUser()
  const path = safeRedirectPath(formData)
  if (!actor) fail(path, 'sign-in-required')
  const alumniProfile = actor.alumniProfile
  if (!alumniProfile) fail(path, 'profile-required')
  const year = Number(text(formData, 'year', 4))
  if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) {
    fail(path, 'invalid-set')
  }
  if (
    alumniProfile.verificationStatus === VerificationStatus.VERIFIED ||
    alumniProfile.verificationStatus === VerificationStatus.PENDING
  ) {
    fail(path, 'verification-already-pending')
  }

  const attendance = await prisma.schoolAttendance.findFirst({
    where: {
      alumniProfileId: alumniProfile.id,
      schoolId: actor.schoolId,
      cohort: { is: { schoolId: actor.schoolId, year } },
    },
    select: { id: true },
  })
  if (!attendance) fail(path, 'set-attendance-required')

  const requestStatus = await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${alumniProfile.id}, 3))`
    const profile = await transaction.alumniProfile.findFirst({
      where: { id: alumniProfile.id, userId: actor.id, schoolId: actor.schoolId },
      select: { verificationStatus: true },
    })
    if (!profile) return 'profile-unavailable'
    if (profile.verificationStatus === VerificationStatus.VERIFIED) return 'verified'
    if (profile.verificationStatus === VerificationStatus.PENDING) return 'pending'
    const currentAttendance = await transaction.schoolAttendance.findFirst({
      where: {
        alumniProfileId: alumniProfile.id,
        schoolId: actor.schoolId,
        cohort: { is: { schoolId: actor.schoolId, year } },
      },
      select: { id: true },
    })
    if (!currentAttendance) return 'set-changed'
    const existing = await transaction.verificationRequest.findFirst({
      where: {
        schoolId: actor.schoolId,
        alumniProfileId: alumniProfile.id,
        status: VerificationStatus.PENDING,
        evidence: { startsWith: 'Member requested verification of Set of ' },
      },
      select: { id: true },
    })
    if (existing) return 'pending'
    await transaction.verificationRequest.create({
      data: {
        schoolId: actor.schoolId,
        alumniProfileId: alumniProfile.id,
        status: VerificationStatus.PENDING,
        evidence: `Member requested verification of Set of ${year}.`,
      },
    })
    await transaction.alumniProfile.update({
      where: { id: alumniProfile.id },
      data: { verificationStatus: VerificationStatus.PENDING, verifiedAt: null, verifiedBy: null },
    })
    return 'created'
  })
  if (requestStatus === 'verified') fail(path, 'already-verified')
  if (requestStatus === 'pending') fail(path, 'verification-already-pending')
  if (requestStatus === 'set-changed') fail(path, 'set-attendance-required')
  if (requestStatus === 'profile-unavailable') fail(path, 'profile-required')
  refreshCommunity(path)
  redirect(`${path}?communityNotice=verification-requested`)
}

export async function reviewSetVerification(formData: FormData) {
  const admin = await currentSchoolAdministrator()
  const path = safeRedirectPath(formData)
  if (!admin) fail(path, 'not-authorized')
  const requestId = text(formData, 'requestId', 64)
  const decision = text(formData, 'decision', 20)
  if (!requestId || !['approve', 'reject'].includes(decision)) fail(path, 'invalid-request')
  const request = await prisma.verificationRequest.findFirst({
    where: {
      id: requestId,
      schoolId: admin.schoolId,
      status: VerificationStatus.PENDING,
      evidence: { startsWith: 'Member requested verification of Set of ' },
    },
    select: { id: true, alumniProfileId: true },
  })
  if (!request) fail(path, 'verification-request-unavailable')

  const result = await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${request.alumniProfileId}, 3))`
    const pending = await transaction.verificationRequest.findFirst({
      where: {
        id: request.id,
        schoolId: admin.schoolId,
        status: VerificationStatus.PENDING,
        evidence: { startsWith: 'Member requested verification of Set of ' },
      },
      select: {
        id: true,
        alumniProfileId: true,
        alumniProfile: {
          select: {
            userId: true,
            schoolAttendance: {
              where: { schoolId: admin.schoolId, cohort: { is: { schoolId: admin.schoolId } } },
              select: { id: true },
            },
          },
        },
      },
    })
    if (!pending) return 'stale'
    if (decision === 'approve' && !pending.alumniProfile.schoolAttendance.length) return 'no-set'
    const status = decision === 'approve' ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED
    await transaction.verificationRequest.update({
      where: { id: pending.id },
      data: {
        status,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      },
    })
    await transaction.alumniProfile.update({
      where: { id: pending.alumniProfileId },
      data: {
        verificationStatus: status,
        verifiedAt: decision === 'approve' ? new Date() : null,
        verifiedBy: decision === 'approve' ? admin.id : null,
      },
    })
    await transaction.notification.create({
      data: {
        userId: pending.alumniProfile.userId,
        actorId: admin.id,
        type: 'SET_VERIFICATION',
        content: decision === 'approve'
          ? 'Your school attendance has been verified. Set communities are now available to you.'
          : 'Your school attendance could not be verified. Please update your school years and try again.',
        link: '/sets',
      },
    })
    return 'updated'
  })
  if (result === 'stale') fail(path, 'verification-request-unavailable')
  if (result === 'no-set') fail(path, 'set-attendance-required')
  refreshCommunity('/admin/community')
  redirect('/admin/community?communityNotice=verification-reviewed')
}

export async function leaveChapter(formData: FormData) {
  const actor = await activeCommunityUser()
  const path = safeRedirectPath(formData)
  if (!actor) fail(path, 'sign-in-required')
  if (!actor.alumniProfile) fail(path, 'profile-required')

  const chapterId = text(formData, 'chapterId', 64)
  await prisma.chapterMember.deleteMany({
    where: {
      chapterId,
      alumniProfileId: actor.alumniProfile.id,
      chapter: { schoolId: actor.schoolId },
    },
  })
  refreshCommunity(path)
  redirect(`${path}?communityNotice=left`)
}

export async function reviewChapterJoinRequest(formData: FormData) {
  const actor = await activeCommunityUser()
  const path = safeRedirectPath(formData)
  if (!actor) fail(path, 'sign-in-required')

  const requestId = text(formData, 'requestId', 64)
  const decision = text(formData, 'decision', 20)
  if (!requestId || !['approve', 'reject'].includes(decision)) fail(path, 'invalid-request')

  const request = await prisma.chapterJoinRequest.findFirst({
    where: { id: requestId, schoolId: actor.schoolId, status: ChapterJoinRequestStatus.PENDING },
    select: { id: true, chapterId: true, userId: true, status: true, chapter: { select: { name: true } } },
  })
  if (!request || !(await canManageChapter(actor.id, actor.schoolId, request.chapterId))) {
    fail(path, 'not-authorized')
  }

  const reviewResult = await prisma.$transaction(async (transaction) => {
    const pending = await transaction.chapterJoinRequest.findFirst({
      where: { id: request.id, status: ChapterJoinRequestStatus.PENDING },
      select: { id: true, userId: true, chapterId: true },
    })
    if (!pending) return 'stale'

    if (decision === 'approve') {
      const applicant = await transaction.user.findFirst({
        where: { id: pending.userId, schoolId: actor.schoolId, isActive: true },
        select: { alumniProfile: { select: { id: true } } },
      })
      if (!applicant?.alumniProfile) return 'profile-unavailable'
      await transaction.chapterMember.upsert({
        where: {
          chapterId_alumniProfileId: {
            chapterId: pending.chapterId,
            alumniProfileId: applicant.alumniProfile.id,
          },
        },
        create: { chapterId: pending.chapterId, alumniProfileId: applicant.alumniProfile.id },
        update: {},
      })
    }

    await transaction.chapterJoinRequest.update({
      where: { id: pending.id },
      data: {
        status: decision === 'approve'
          ? ChapterJoinRequestStatus.APPROVED
          : ChapterJoinRequestStatus.REJECTED,
        reviewerId: actor.id,
        reviewedAt: new Date(),
      },
    })

    const notificationLink = `/chapters/${encodeURIComponent(request.chapterId)}`
    const notificationContent = decision === 'approve'
      ? `Your request to join ${request.chapter.name} was approved.`
      : `Your request to join ${request.chapter.name} was declined.`
    await transaction.notification.create({
      data: {
        userId: request.userId,
        actorId: actor.id,
        type: 'CHAPTER_MEMBERSHIP',
        content: notificationContent,
        link: notificationLink,
      },
    })
    return 'updated'
  })
  if (reviewResult === 'stale') fail(path, 'request-already-reviewed')
  if (reviewResult === 'profile-unavailable') fail(path, 'member-profile-unavailable')

  refreshCommunity(path)
  redirect(path)
}

export async function updateCommunityDetails(formData: FormData) {
  const actor = await activeCommunityUser()
  const path = safeRedirectPath(formData)
  if (!actor) fail(path, 'sign-in-required')

  const kind = text(formData, 'scope', 20)
  const id = text(formData, 'scopeId', 64)
  const scope = await contentScope(actor.id, actor.schoolId, kind, id)
  if (!scope || scope.kind === 'national' || !scope.id) fail(path, 'not-authorized')

  const description = text(formData, 'description', 3000)
  if (scope.kind === 'set') {
    await prisma.cohort.updateMany({
      where: { id: scope.id, schoolId: actor.schoolId },
      data: { description: description || null },
    })
  } else {
    await prisma.chapter.updateMany({
      where: { id: scope.id, schoolId: actor.schoolId, isActive: true },
      data: {
        description: description || null,
        country: text(formData, 'country', 100) || null,
        region: text(formData, 'region', 100) || null,
        city: text(formData, 'city', 100) || null,
        contactInfo: text(formData, 'contactInfo', 200) || null,
      },
    })
  }
  refreshCommunity(scope.returnTo)
  redirect(scope.returnTo)
}

export async function assignScopedAdministrator(formData: FormData) {
  const actor = await activeCommunityUser()
  const path = safeRedirectPath(formData)
  if (!actor) fail(path, 'sign-in-required')
  if (!(await hasSchoolWideCommunityRole(actor.id, actor.schoolId))) fail(path, 'not-authorized')

  const kind = text(formData, 'scope', 20)
  const scopeId = text(formData, 'scopeId', 64)
  const email = text(formData, 'email', 254).toLowerCase()
  const operation = text(formData, 'operation', 10)
  const target = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }, schoolId: actor.schoolId, isActive: true },
        select: { id: true, role: true },
      })
    : null
  if (!target || !['add', 'remove'].includes(operation)) fail(path, 'invalid-administrator')

  if (kind === 'set') {
    const cohort = await prisma.cohort.findFirst({
      where: { id: scopeId, schoolId: actor.schoolId },
      select: { id: true, year: true },
    })
    if (!cohort) fail(path, 'scope-unavailable')
    const returnTo = `/sets/${cohort.year}`
    if (operation === 'add') {
      await prisma.$transaction(async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${target.id}, 2))`
        const currentTarget = await transaction.user.findFirst({
          where: { id: target.id, schoolId: actor.schoolId, isActive: true },
          select: { role: true },
        })
        if (!currentTarget || (currentTarget.role !== AdminRole.MEMBER && currentTarget.role !== AdminRole.SET_ADMIN)) {
          fail(returnTo, 'role-conflict')
        }
        await transaction.cohortAdministrator.upsert({
          where: { cohortId_userId: { cohortId: cohort.id, userId: target.id } },
          create: { cohortId: cohort.id, userId: target.id },
          update: {},
        })
        if (currentTarget.role === AdminRole.MEMBER) {
          await transaction.user.update({ where: { id: target.id }, data: { role: AdminRole.SET_ADMIN } })
        }
      })
    } else {
      await prisma.$transaction(async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${target.id}, 2))`
        await transaction.cohortAdministrator.deleteMany({
          where: { cohortId: cohort.id, userId: target.id },
        })
        const remaining = await transaction.cohortAdministrator.count({ where: { userId: target.id } })
        const currentTarget = await transaction.user.findFirst({
          where: { id: target.id, schoolId: actor.schoolId, isActive: true },
          select: { role: true },
        })
        if (remaining === 0 && currentTarget?.role === AdminRole.SET_ADMIN) {
          await transaction.user.update({ where: { id: target.id }, data: { role: AdminRole.MEMBER } })
        }
      })
    }
    refreshCommunity(returnTo)
    redirect(`${returnTo}?communityNotice=administrator-updated`)
  }

  if (kind === 'chapter') {
    const chapter = await prisma.chapter.findFirst({
      where: { id: scopeId, schoolId: actor.schoolId, isActive: true },
      select: { id: true },
    })
    if (!chapter) fail(path, 'scope-unavailable')
    const returnTo = `/chapters/${encodeURIComponent(chapter.id)}`
    if (operation === 'add') {
      await prisma.$transaction(async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${target.id}, 2))`
        const currentTarget = await transaction.user.findFirst({
          where: { id: target.id, schoolId: actor.schoolId, isActive: true },
          select: { role: true },
        })
        if (!currentTarget || (currentTarget.role !== AdminRole.MEMBER && currentTarget.role !== AdminRole.CHAPTER_ADMIN)) {
          fail(returnTo, 'role-conflict')
        }
        await transaction.chapterAdministrator.upsert({
          where: { chapterId_userId: { chapterId: chapter.id, userId: target.id } },
          create: { chapterId: chapter.id, userId: target.id },
          update: {},
        })
        if (currentTarget.role === AdminRole.MEMBER) {
          await transaction.user.update({ where: { id: target.id }, data: { role: AdminRole.CHAPTER_ADMIN } })
        }
      })
    } else {
      await prisma.$transaction(async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${target.id}, 2))`
        await transaction.chapterAdministrator.deleteMany({
          where: { chapterId: chapter.id, userId: target.id },
        })
        const remaining = await transaction.chapterAdministrator.count({ where: { userId: target.id } })
        const currentTarget = await transaction.user.findFirst({
          where: { id: target.id, schoolId: actor.schoolId, isActive: true },
          select: { role: true },
        })
        if (remaining === 0 && currentTarget?.role === AdminRole.CHAPTER_ADMIN) {
          await transaction.user.update({ where: { id: target.id }, data: { role: AdminRole.MEMBER } })
        }
      })
    }
    refreshCommunity(returnTo)
    redirect(`${returnTo}?communityNotice=administrator-updated`)
  }

  fail(path, 'scope-unavailable')
}

export async function createCommunitySet(formData: FormData) {
  const actor = await activeCommunityUser()
  const path = safeRedirectPath(formData)
  if (!actor) fail(path, 'sign-in-required')
  if (!(await hasSchoolWideCommunityRole(actor.id, actor.schoolId))) fail(path, 'not-authorized')
  const year = Number(text(formData, 'year', 4))
  const name = text(formData, 'name', 120) || `Set of ${year}`
  const description = text(formData, 'description', 3000)
  if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) {
    fail(path, 'invalid-set')
  }
  await prisma.cohort.upsert({
    where: { schoolId_year: { schoolId: actor.schoolId, year } },
    create: { schoolId: actor.schoolId, year, name, description: description || null },
    update: { name, description: description || null },
  })
  refreshCommunity(`/sets/${year}`)
  redirect(`/sets/${year}`)
}

export async function createCommunityChapter(formData: FormData) {
  const actor = await activeCommunityUser()
  const path = safeRedirectPath(formData)
  if (!actor) fail(path, 'sign-in-required')
  if (!(await hasSchoolWideCommunityRole(actor.id, actor.schoolId))) fail(path, 'not-authorized')
  const name = text(formData, 'name', 120)
  if (!name) fail(path, 'invalid-chapter')
  const chapter = await prisma.chapter.create({
    data: {
      schoolId: actor.schoolId,
      name,
      country: text(formData, 'country', 100) || null,
      region: text(formData, 'region', 100) || null,
      city: text(formData, 'city', 100) || null,
      description: text(formData, 'description', 3000) || null,
      contactInfo: text(formData, 'contactInfo', 200) || null,
    },
    select: { id: true },
  })
  refreshCommunity(`/chapters/${chapter.id}`)
  redirect(`/chapters/${encodeURIComponent(chapter.id)}`)
}

export async function cancelCommunityEvent(formData: FormData) {
  const actor = await activeCommunityUser()
  const path = safeRedirectPath(formData)
  if (!actor) fail(path, 'sign-in-required')
  const eventId = text(formData, 'eventId', 64)
  const event = await prisma.event.findFirst({
    where: { id: eventId, schoolId: actor.schoolId },
    select: { id: true, chapterId: true, cohortId: true },
  })
  if (!event) fail(path, 'event-unavailable')
  const allowed = event.chapterId
    ? await canManageChapter(actor.id, actor.schoolId, event.chapterId)
    : event.cohortId
      ? await canManageCohort(actor.id, actor.schoolId, event.cohortId)
      : await hasSchoolWideCommunityRole(actor.id, actor.schoolId)
  if (!allowed) fail(path, 'not-authorized')
  await prisma.event.update({
    where: { id: event.id },
    data: { status: EventStatus.CANCELLED },
  })
  refreshCommunity(path)
  redirect(path)
}

export async function setAnnouncementStatus(formData: FormData) {
  const actor = await activeCommunityUser()
  const path = safeRedirectPath(formData)
  if (!actor) fail(path, 'sign-in-required')
  const announcementId = text(formData, 'announcementId', 64)
  const statusText = text(formData, 'status', 20)
  const status = statusText === CommunityContentStatus.PUBLISHED
    ? CommunityContentStatus.PUBLISHED
    : statusText === CommunityContentStatus.CANCELLED
      ? CommunityContentStatus.CANCELLED
      : null
  if (!status) {
    fail(path, 'invalid-announcement')
  }
  const announcement = await prisma.announcement.findFirst({
    where: { id: announcementId, schoolId: actor.schoolId },
    select: { id: true, chapterId: true, cohortId: true },
  })
  if (!announcement) fail(path, 'announcement-unavailable')
  const allowed = announcement.chapterId
    ? await canManageChapter(actor.id, actor.schoolId, announcement.chapterId)
    : announcement.cohortId
      ? await canManageCohort(actor.id, actor.schoolId, announcement.cohortId)
      : await hasSchoolWideCommunityRole(actor.id, actor.schoolId)
  if (!allowed) fail(path, 'not-authorized')
  await prisma.announcement.update({
    where: { id: announcement.id },
    data: { status },
  })
  refreshCommunity(path)
  redirect(path)
}

export async function updateCommunityAnnouncement(formData: FormData) {
  const actor = await activeCommunityUser()
  const path = safeRedirectPath(formData)
  if (!actor) fail(path, 'sign-in-required')
  const announcementId = text(formData, 'announcementId', 64)
  const title = text(formData, 'title', 160)
  const content = text(formData, 'content', 10000)
  const expiresText = text(formData, 'expiresAt', 32)
  const expiresAt = expiresText ? dateTimeUtc(expiresText) : null
  if (!announcementId || !title || !content || (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()))) {
    fail(path, 'invalid-announcement')
  }
  const announcement = await prisma.announcement.findFirst({
    where: { id: announcementId, schoolId: actor.schoolId },
    select: { id: true, chapterId: true, cohortId: true },
  })
  if (!announcement) fail(path, 'announcement-unavailable')
  const allowed = announcement.chapterId
    ? await canManageChapter(actor.id, actor.schoolId, announcement.chapterId)
    : announcement.cohortId
      ? await canManageCohort(actor.id, actor.schoolId, announcement.cohortId)
      : await hasSchoolWideCommunityRole(actor.id, actor.schoolId)
  if (!allowed) fail(path, 'not-authorized')
  await prisma.announcement.update({
    where: { id: announcement.id },
    data: { title, content, expiresAt },
  })
  refreshCommunity(path)
  redirect(path)
}

export async function updateCommunityEvent(formData: FormData) {
  const actor = await activeCommunityUser()
  const path = safeRedirectPath(formData)
  if (!actor) fail(path, 'sign-in-required')
  const eventId = text(formData, 'eventId', 64)
  const title = text(formData, 'title', 160)
  const description = text(formData, 'description', 10000)
  const eventTypeText = text(formData, 'eventType', 40)
  const startAt = dateTimeUtc(text(formData, 'startAt', 40))
  const endText = text(formData, 'endAt', 40)
  const endAt = endText ? dateTimeUtc(endText) : null
  const deadlineText = text(formData, 'rsvpDeadline', 40)
  const rsvpDeadline = deadlineText ? dateTimeUtc(deadlineText) : null
  const capacityText = text(formData, 'capacity', 8)
  const capacity = capacityText ? Number(capacityText) : null
  const meetingUrl = text(formData, 'meetingUrl', 500)
  const location = text(formData, 'location', 200)
  if (
    !eventId ||
    !title ||
    Number.isNaN(startAt.getTime()) ||
    (endAt && (Number.isNaN(endAt.getTime()) || endAt < startAt)) ||
    (rsvpDeadline && (Number.isNaN(rsvpDeadline.getTime()) || rsvpDeadline > startAt)) ||
    (rsvpDeadline && rsvpDeadline <= new Date()) ||
    (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000)) ||
    !Object.values(EventType).includes(eventTypeText as EventType) ||
    (meetingUrl && !validHttpsUrl(meetingUrl))
  ) {
    fail(path, 'invalid-event')
  }
  const event = await prisma.event.findFirst({
    where: { id: eventId, schoolId: actor.schoolId },
    select: { id: true, chapterId: true, cohortId: true },
  })
  if (!event) fail(path, 'event-unavailable')
  const allowed = event.chapterId
    ? await canManageChapter(actor.id, actor.schoolId, event.chapterId)
    : event.cohortId
      ? await canManageCohort(actor.id, actor.schoolId, event.cohortId)
      : await hasSchoolWideCommunityRole(actor.id, actor.schoolId)
  if (!allowed) fail(path, 'not-authorized')
  await prisma.event.update({
    where: { id: event.id },
    data: {
      title,
      description: description || null,
      eventType: eventTypeText as EventType,
      startAt,
      endAt,
      location: location || null,
      meetingUrl: meetingUrl || null,
      capacity,
      rsvpDeadline,
    },
  })
  refreshCommunity(path)
  redirect(path)
}
