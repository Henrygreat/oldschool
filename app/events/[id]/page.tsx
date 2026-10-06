import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { EventCancellationForm, EventEditForm, EventRSVPForm } from '@/components/community/forms'
import { MemberPageLayout } from '@/components/members/member-nav'
import {
  activeCommunityUser,
  canManageChapter,
  canManageCohort,
  formatCommunityDate,
  hasSchoolWideCommunityRole,
} from '@/lib/community'
import { prisma } from '@/lib/prisma'

const eventErrors: Record<string, string> = {
  'sign-in-required': 'Please sign in again to continue.',
  'invalid-rsvp': 'Choose a valid RSVP response.',
  'rsvp-unavailable': 'This event is not available to your account.',
  'rsvp-closed': 'RSVPs are closed for this event.',
  'rsvp-full': 'This event has reached its capacity.',
}

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ communityError?: string }>
}) {
  const member = await activeCommunityUser()
  if (!member) redirect('/auth/login?callbackUrl=%2Fevents')
  const { id } = await params
  const event = await prisma.event.findFirst({
    where: { id, schoolId: member.schoolId },
    select: {
      id: true,
      title: true,
      description: true,
      eventType: true,
      startAt: true,
      endAt: true,
      location: true,
      meetingUrl: true,
      capacity: true,
      rsvpDeadline: true,
      status: true,
      isNational: true,
      chapterId: true,
      cohortId: true,
      organizer: { select: { firstName: true, surname: true } },
      chapter: { select: { name: true } },
      cohort: { select: { name: true } },
    },
  })
  if (!event) notFound()

  const canManage = event.chapterId
    ? await canManageChapter(member.id, member.schoolId, event.chapterId)
    : event.cohortId
      ? await canManageCohort(member.id, member.schoolId, event.cohortId)
      : await hasSchoolWideCommunityRole(member.id, member.schoolId)
  const isSetMember = Boolean(
    event.cohortId && (
      (member.alumniProfile?.verificationStatus === 'VERIFIED' &&
        member.alumniProfile.schoolAttendance.some((attendance) => attendance.cohortId === event.cohortId)) ||
      member.claimedArchiveRecord?.cohortId === event.cohortId
    )
  )
  const isChapterMember = Boolean(event.chapterId && member.alumniProfile && await prisma.chapterMember.findUnique({
    where: { chapterId_alumniProfileId: { chapterId: event.chapterId, alumniProfileId: member.alumniProfile.id } },
    select: { id: true },
  }))
  const canView = event.isNational || isSetMember || isChapterMember || canManage
  if (!canView || (event.status !== 'PUBLISHED' && !canManage)) notFound()

  const [rsvp, counts, attendees] = await Promise.all([
    prisma.eventRSVP.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: member.id } },
      select: { response: true },
    }),
    prisma.eventRSVP.groupBy({
      by: ['response'],
      where: { eventId: event.id },
      _count: { _all: true },
    }),
    canManage
      ? prisma.eventRSVP.findMany({
          where: { eventId: event.id, response: 'GOING', user: { is: { isActive: true } } },
          orderBy: { createdAt: 'asc' },
          take: 100,
          select: { user: { select: { firstName: true, middleName: true, surname: true } } },
        })
      : Promise.resolve([]),
  ])
  const rsvpCounts = new Map(counts.map((row) => [row.response, row._count._all]))
  const canRSVP = event.status === 'PUBLISHED' &&
    event.startAt > new Date() &&
    (!event.rsvpDeadline || event.rsvpDeadline > new Date())
  const query = await searchParams
  const returnTo = `/events/${encodeURIComponent(event.id)}`

  return (
    <MemberPageLayout name={member.firstName}>
      <section className="rounded-3xl bg-[#16070a] px-6 py-8 text-white sm:px-10">
        <Link className="text-sm font-semibold text-white/70 hover:text-white" href="/events">← Events</Link>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-white/60">{event.eventType.replaceAll('_', ' ')} · {event.isNational ? 'National event' : event.chapter?.name ?? event.cohort?.name ?? 'Community event'}</p>
        <h1 className="mt-2 text-4xl font-bold">{event.title}</h1>
        <p className="mt-3 text-white/75">{formatCommunityDate(event.startAt)}{event.endAt ? ` – ${event.endAt.toLocaleString('en-GB', { timeZone: 'UTC' })} UTC` : ''}{event.location ? ` · ${event.location}` : ''}</p>
      </section>
      {query.communityError && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{eventErrors[query.communityError] ?? 'The RSVP could not be saved.'}</p>}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold">About this event</h2>
          {event.description ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{event.description}</p> : <p className="mt-3 text-sm text-slate-600">Details will be shared by the event organiser.</p>}
          <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
            <div><dt className="font-semibold text-slate-500">Organiser</dt><dd className="mt-1">{event.organizer.firstName} {event.organizer.surname}</dd></div>
            <div><dt className="font-semibold text-slate-500">Location</dt><dd className="mt-1">{event.location ?? 'To be announced'}</dd></div>
            {event.meetingUrl && <div><dt className="font-semibold text-slate-500">Online meeting</dt><dd className="mt-1"><a className="font-semibold text-[#9C0621] hover:underline" href={event.meetingUrl} rel="noreferrer" target="_blank">Open meeting link</a></dd></div>}
            {event.rsvpDeadline && <div><dt className="font-semibold text-slate-500">RSVP deadline</dt><dd className="mt-1">{formatCommunityDate(event.rsvpDeadline)}</dd></div>}
            {event.capacity !== null && <div><dt className="font-semibold text-slate-500">Capacity</dt><dd className="mt-1">{event.capacity}</dd></div>}
          </dl>
        </article>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold">Your RSVP</h2>
            <p className="mt-2 text-sm text-slate-600">Going: {rsvpCounts.get('GOING') ?? 0} · Maybe: {rsvpCounts.get('MAYBE') ?? 0} · Not going: {rsvpCounts.get('NOT_GOING') ?? 0}</p>
            <div className="mt-4"><EventRSVPForm eventId={event.id} returnTo={returnTo} currentResponse={rsvp?.response ?? null} closed={!canRSVP} /></div>
          </section>
          {canManage && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold">Event administration</h2>
              <p className="mt-2 text-sm text-slate-600">You can manage this event within its authorised community scope.</p>
              {event.status === 'PUBLISHED' && <EventEditForm event={event} returnTo={returnTo} />}
              {event.status === 'PUBLISHED' && <div className="mt-4"><EventCancellationForm eventId={event.id} returnTo="/events" /></div>}
            </section>
          )}
        </aside>
      </div>

      {canManage && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-bold">Going</h2><p className="mt-1 text-sm text-slate-600">Visible only to authorised event administrators. Personal contact details are not included.</p></div></div>
          {attendees.length ? <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{attendees.map(({ user }, index) => <li className="rounded-xl bg-slate-50 px-3 py-2 text-sm" key={`${user.firstName}-${user.surname}-${index}`}>{[user.firstName, user.middleName, user.surname].filter(Boolean).join(' ')}</li>)}</ul> : <p className="mt-3 text-sm text-slate-600">No member has RSVP&apos;d as going yet.</p>}
          {attendees.length === 100 && <p className="mt-3 text-xs text-slate-500">Showing up to 100 attendees.</p>}
        </section>
      )}
    </MemberPageLayout>
  )
}
