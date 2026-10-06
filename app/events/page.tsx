import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AnnouncementEditForm, AnnouncementForm, AnnouncementStatusForm, EventForm } from '@/components/community/forms'
import { MemberPageLayout } from '@/components/members/member-nav'
import { activeCommunityUser, formatCommunityDate, hasSchoolWideCommunityRole, visibleEventFilter } from '@/lib/community'
import { prisma } from '@/lib/prisma'

const pageSize = 12
const filters = [
  ['all', 'All'],
  ['national', 'National'],
  ['chapter', 'My Chapter'],
  ['set', 'My Set'],
] as const

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; upcomingPage?: string; pastPage?: string; communityError?: string }>
}) {
  const member = await activeCommunityUser()
  if (!member) redirect('/auth/login?callbackUrl=%2Fevents')
  const params = await searchParams
  const communityErrors: Record<string, string> = {
    'sign-in-required': 'Please sign in again to continue.',
    'not-authorized': 'You are not authorised to manage this content.',
    'invalid-event': 'Check the event title, dates, capacity, and HTTPS URL.',
    'invalid-announcement': 'Enter a valid announcement title, content, and future expiry.',
    'event-unavailable': 'This event is no longer available.',
    'announcement-unavailable': 'This announcement is no longer available.',
  }
  const filter = filters.some(([key]) => key === params.filter) ? params.filter ?? 'all' : 'all'
  const chapterIds = member.alumniProfile
    ? await prisma.chapterMember.findMany({
        where: { alumniProfileId: member.alumniProfile.id, chapter: { schoolId: member.schoolId, isActive: true } },
        select: { chapterId: true },
      }).then((rows) => rows.map(({ chapterId }) => chapterId))
    : []
  const cohortIds = [
    ...(member.alumniProfile?.verificationStatus === 'VERIFIED'
      ? member.alumniProfile.schoolAttendance
          .map(({ cohortId }) => cohortId)
          .filter((cohortId): cohortId is string => Boolean(cohortId))
      : []),
    ...(member.claimedArchiveRecord?.cohortId ? [member.claimedArchiveRecord.cohortId] : []),
  ]
  const visibility = filter === 'national'
    ? { isNational: true }
    : filter === 'chapter'
      ? { chapterId: { in: chapterIds.length ? chapterIds : ['__no_chapters__'] } }
      : filter === 'set'
        ? { cohortId: { in: cohortIds.length ? cohortIds : ['__no_sets__'] } }
        : visibleEventFilter(member.id)
  const baseWhere = {
    schoolId: member.schoolId,
    status: 'PUBLISHED' as const,
    AND: [visibility],
  }
  const now = new Date()
  const parsePage = (value?: string) => value && /^[1-9]\d{0,3}$/.test(value) ? Number(value) : 1
  const [upcomingCount, pastCount, canManageNational, nationalAnnouncements] = await Promise.all([
    prisma.event.count({ where: { ...baseWhere, startAt: { gte: now } } }),
    prisma.event.count({ where: { ...baseWhere, startAt: { lt: now } } }),
    hasSchoolWideCommunityRole(member.id, member.schoolId),
    prisma.announcement.findMany({
      where: {
        schoolId: member.schoolId,
        isNational: true,
        status: 'PUBLISHED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        content: true,
        publishedAt: true,
        expiresAt: true,
        author: { select: { firstName: true, surname: true } },
      },
    }),
  ])
  const upcomingPages = Math.max(1, Math.ceil(upcomingCount / pageSize))
  const pastPages = Math.max(1, Math.ceil(pastCount / pageSize))
  const upcomingPage = Math.min(parsePage(params.upcomingPage), upcomingPages)
  const pastPage = Math.min(parsePage(params.pastPage), pastPages)
  const [upcoming, past] = await Promise.all([
    prisma.event.findMany({
      where: { ...baseWhere, startAt: { gte: now } },
      orderBy: { startAt: 'asc' },
      skip: (upcomingPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        description: true,
        eventType: true,
        startAt: true,
        endAt: true,
        location: true,
        isNational: true,
        chapter: { select: { name: true } },
        cohort: { select: { name: true } },
        _count: { select: { rsvps: { where: { response: 'GOING' } } } },
      },
    }),
    prisma.event.findMany({
      where: { ...baseWhere, startAt: { lt: now } },
      orderBy: { startAt: 'desc' },
      skip: (pastPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        description: true,
        eventType: true,
        startAt: true,
        location: true,
        isNational: true,
        chapter: { select: { name: true } },
        cohort: { select: { name: true } },
        _count: { select: { rsvps: { where: { response: 'GOING' } } } },
      },
    }),
  ])

  function pageLink(section: 'upcoming' | 'past', page: number) {
    const search = new URLSearchParams()
    if (filter !== 'all') search.set('filter', filter)
    if (section === 'upcoming') search.set('upcomingPage', String(page))
    else search.set('pastPage', String(page))
    return `/events?${search.toString()}`
  }

  return (
    <MemberPageLayout name={member.firstName}>
      <section className="rounded-3xl bg-[#16070a] px-6 py-8 text-white sm:px-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/60">GCUOBA community calendar</p>
        <h1 className="mt-2 text-4xl font-bold">Events</h1>
        <p className="mt-3 max-w-2xl text-white/75">National, Set, and Chapter events for members. Private community events are shown only to their members.</p>
      </section>
      <nav aria-label="Filter events" className="mt-5 flex flex-wrap gap-2">
        {filters.map(([key, label]) => <Link className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${filter === key ? 'bg-[#9C0621] text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-[#9C0621]'}`} href={`/events${key === 'all' ? '' : `?filter=${key}`}`} key={key}>{label}</Link>)}
      </nav>
      {params.communityError && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{communityErrors[params.communityError] ?? 'The community action could not be completed.'}</p>}
      {canManageNational && (
        <section className="mt-5 space-y-3">
          <EventForm scope="national" returnTo="/events" />
          <AnnouncementForm scope="national" returnTo="/events" />
        </section>
      )}
      <section className="mt-8">
        <h2 className="text-xl font-bold">National announcements</h2>
        {nationalAnnouncements.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {nationalAnnouncements.map((announcement) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-5" key={announcement.id}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold">{announcement.title}</h3>
                  {canManageNational && <AnnouncementStatusForm announcementId={announcement.id} returnTo="/events" status="PUBLISHED" />}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{announcement.content}</p>
                <p className="mt-3 text-xs text-slate-500">Posted by {announcement.author.firstName} {announcement.author.surname}{announcement.publishedAt ? ` · ${announcement.publishedAt.toLocaleDateString()}` : ''}</p>
                {canManageNational && <AnnouncementEditForm announcement={announcement} returnTo="/events" />}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">No national announcements have been posted yet.</p>
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Upcoming Events</h2>
            <p className="mt-1 text-sm text-slate-600">{upcomingCount} upcoming {upcomingCount === 1 ? 'event' : 'events'}</p>
          </div>
        </div>
        {upcoming.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((event) => (
              <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={event.id}>
                <p className="text-xs font-bold uppercase tracking-wider text-[#9C0621]">{event.eventType.replaceAll('_', ' ')}</p>
                <h3 className="mt-2 text-xl font-bold"><Link className="hover:text-[#9C0621]" href={`/events/${event.id}`}>{event.title}</Link></h3>
                <p className="mt-2 flex-1 text-sm text-slate-600">{event.description?.slice(0, 180) ?? 'Join Old Boys at this GCUOBA community event.'}</p>
                <dl className="mt-4 space-y-1 text-sm text-slate-600">
                  <div><dt className="sr-only">Date</dt><dd>{formatCommunityDate(event.startAt)}{event.endAt ? ` – ${event.endAt.toLocaleTimeString('en-GB', { timeZone: 'UTC' })} UTC` : ''}</dd></div>
                  {event.location && <div><dt className="sr-only">Location</dt><dd>{event.location}</dd></div>}
                  <div><dt className="sr-only">Community</dt><dd>{event.isNational ? 'National event' : event.chapter?.name ?? event.cohort?.name ?? 'Community event'}</dd></div>
                </dl>
                <p className="mt-3 text-sm font-semibold text-slate-700">{event._count.rsvps} going</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No upcoming events.</p>
        )}
        {upcomingPages > 1 && (
          <nav aria-label="Upcoming event pagination" className="mt-4 flex justify-between rounded-xl border border-slate-200 bg-white p-3">
            <Link aria-disabled={upcomingPage <= 1} className={upcomingPage <= 1 ? 'pointer-events-none text-slate-300' : 'font-semibold text-[#9C0621]'} href={pageLink('upcoming', upcomingPage - 1)}>Previous</Link>
            <span className="text-sm text-slate-600">Page {upcomingPage} of {upcomingPages}</span>
            <Link aria-disabled={upcomingPage >= upcomingPages} className={upcomingPage >= upcomingPages ? 'pointer-events-none text-slate-300' : 'font-semibold text-[#9C0621]'} href={pageLink('upcoming', upcomingPage + 1)}>Next</Link>
          </nav>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Past Events</h2>
        {past.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {past.map((event) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-5" key={event.id}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{event.eventType.replaceAll('_', ' ')}</p>
                <h3 className="mt-2 font-bold"><Link className="hover:text-[#9C0621]" href={`/events/${event.id}`}>{event.title}</Link></h3>
                <p className="mt-2 text-sm text-slate-600">{formatCommunityDate(event.startAt)}{event.location ? ` · ${event.location}` : ''}</p>
                <p className="mt-2 text-xs text-slate-500">{event.isNational ? 'National event' : event.chapter?.name ?? event.cohort?.name ?? 'Community event'} · {event._count.rsvps} went</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No past events in this view.</p>
        )}
        {pastPages > 1 && (
          <nav aria-label="Past event pagination" className="mt-4 flex justify-between rounded-xl border border-slate-200 bg-white p-3">
            <Link aria-disabled={pastPage <= 1} className={pastPage <= 1 ? 'pointer-events-none text-slate-300' : 'font-semibold text-[#9C0621]'} href={pageLink('past', pastPage - 1)}>Previous</Link>
            <span className="text-sm text-slate-600">Page {pastPage} of {pastPages}</span>
            <Link aria-disabled={pastPage >= pastPages} className={pastPage >= pastPages ? 'pointer-events-none text-slate-300' : 'font-semibold text-[#9C0621]'} href={pageLink('past', pastPage + 1)}>Next</Link>
          </nav>
        )}
      </section>
    </MemberPageLayout>
  )
}
