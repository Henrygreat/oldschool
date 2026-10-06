import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { MemberCard } from '@/components/members/member-card'
import { MemberPageLayout } from '@/components/members/member-nav'
import {
  AnnouncementForm,
  AnnouncementEditForm,
  AnnouncementStatusForm,
  CommunityDetailsForm,
  EventCancellationForm,
  EventForm,
  SetVerificationRequestForm,
} from '@/components/community/forms'
import { activeCommunityUser, canManageCohort, formatCommunityDate } from '@/lib/community'
import { parseDirectoryFilters, searchDirectory } from '@/lib/directory'
import { prisma } from '@/lib/prisma'

const communityErrors: Record<string, string> = {
  'sign-in-required': 'Please sign in again to continue.',
  'not-authorized': 'You are not authorised to manage this community.',
  'invalid-announcement': 'Enter a valid announcement title, content, and expiry.',
  'invalid-event': 'Check the event title, dates, capacity, and HTTPS URLs.',
  'invalid-administrator': 'No active member with that account email was found.',
  'role-conflict': 'That member already has another administrator role.',
  'scope-unavailable': 'That community is no longer available.',
  'request-already-reviewed': 'This Chapter request has already been reviewed.',
  'member-profile-unavailable': 'The requester no longer has an active profile.',
  'announcement-unavailable': 'This announcement is no longer available.',
  'event-unavailable': 'This event is no longer available.',
  'invalid-set': 'Choose a valid Set year.',
  'set-attendance-required': 'Add this Set to your school attendance details before requesting verification.',
  'verification-already-pending': 'Your school attendance verification request is already being reviewed.',
  'already-verified': 'Your school attendance has already been verified.',
  'profile-required': 'Complete your member profile before requesting verification.',
}

export default async function SetPage({
  params,
  searchParams,
}: {
  params: Promise<{ year: string }>
  searchParams: Promise<{ q?: string; page?: string; communityError?: string; communityNotice?: string }>
}) {
  const member = await activeCommunityUser()
  if (!member) redirect('/auth/login?callbackUrl=%2Fsets')

  const { year: yearText } = await params
  if (!/^(19|20)\d{2}$/.test(yearText)) notFound()
  const year = Number(yearText)
  const query = await searchParams
  const cohort = await prisma.cohort.findFirst({
    where: { schoolId: member.schoolId, year },
    select: {
      id: true,
      name: true,
      description: true,
      administrators: {
        where: { user: { is: { isActive: true } } },
        take: 8,
        orderBy: { createdAt: 'asc' },
        select: { user: { select: { firstName: true, surname: true } } },
      },
    },
  })
  const filters = parseDirectoryFilters({
    q: query.q,
    setYear: String(year),
    page: query.page,
  })
  const isSetMember = Boolean(
    member.claimedArchiveRecord?.setYear === year ||
      (cohort && (
      (member.alumniProfile?.verificationStatus === 'VERIFIED' &&
        member.alumniProfile.schoolAttendance.some((attendance) => attendance.cohortId === cohort.id)) ||
      member.claimedArchiveRecord?.cohortId === cohort.id
      ))
  )
  const hasSetAttendance = Boolean(
    cohort && member.alumniProfile?.schoolAttendance.some((attendance) => attendance.cohortId === cohort.id)
  )
  const canManage = Boolean(cohort && await canManageCohort(member.id, member.schoolId, cohort.id))
  const now = new Date()
  const [result, registeredCount, archiveCount, announcements, events] = await Promise.all([
    searchDirectory(member.schoolId, member.id, filters, { requireVerifiedSetMembership: true }),
    prisma.user.count({
      where: {
        schoolId: member.schoolId,
        isActive: true,
        OR: [
          {
            alumniProfile: {
              is: {
                verificationStatus: 'VERIFIED',
                schoolAttendance: { some: { cohort: { is: { year, schoolId: member.schoolId } } } },
              },
            },
          },
          { claimedArchiveRecord: { is: { schoolId: member.schoolId, archivedAt: null, setYear: year } } },
        ],
      },
    }),
    prisma.alumniArchiveRecord.count({
      where: {
        schoolId: member.schoolId,
        setYear: year,
        archivedAt: null,
        claimedByUserId: null,
      },
    }),
    prisma.announcement.findMany({
      where: {
        schoolId: member.schoolId,
        status: 'PUBLISHED',
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          {
            OR: [
              { isNational: true },
              ...(isSetMember && cohort ? [{ cohortId: cohort.id }] : []),
            ],
          },
        ],
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
    prisma.event.findMany({
      where: {
        schoolId: member.schoolId,
        status: 'PUBLISHED',
        startAt: { gte: now },
        OR: [
          { isNational: true },
          ...(isSetMember && cohort ? [{ cohortId: cohort.id }] : []),
        ],
      },
      orderBy: { startAt: 'asc' },
      take: 5,
      select: {
        id: true,
        title: true,
        startAt: true,
        location: true,
        eventType: true,
        isNational: true,
        _count: { select: { rsvps: { where: { response: 'GOING' } } } },
      },
    }),
  ])

  function pageHref(page: number) {
    const params = new URLSearchParams()
    if (query.q) params.set('q', query.q.slice(0, 80))
    if (page > 1) params.set('page', String(page))
    const suffix = params.toString()
    return `/sets/${year}${suffix ? `?${suffix}` : ''}`
  }

  return (
    <MemberPageLayout name={member.firstName}>
      <section className="rounded-3xl bg-[#16070a] px-6 py-8 text-white sm:px-10">
        <Link className="text-sm font-semibold text-white/70 hover:text-white" href="/sets">← Browse Sets</Link>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-white/60">GCUOBA Set community</p>
        <h1 className="mt-2 text-4xl font-bold">{cohort?.name ?? `Set of ${year}`}</h1>
        <p className="mt-3 text-white/75">{registeredCount} registered members · {archiveCount} unclaimed historical records</p>
        {cohort?.description && <p className="mt-4 max-w-3xl text-white/85">{cohort.description}</p>}
        <nav aria-label="Set sections" className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
          {['Overview', 'Members', 'Announcements', 'Events'].map((label) => (
            <a className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20" href={`#${label.toLowerCase()}`} key={label}>{label}</a>
          ))}
        </nav>
      </section>

      {query.communityError && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{communityErrors[query.communityError] ?? 'The community change could not be completed.'}</p>}
      {query.communityNotice === 'administrator-updated' && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Set administrator assignment updated.</p>}
      {query.communityNotice === 'verification-requested' && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Your Set verification request was submitted for school administrator review.</p>}

      <section className="mt-6 grid gap-4 lg:grid-cols-2" id="overview">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Set leadership</h2>
          {cohort?.administrators.length ? (
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {cohort.administrators.map(({ user }, index) => <li key={`${user.firstName}-${user.surname}-${index}`}>{user.firstName} {user.surname} <span className="text-slate-500">· Set coordinator</span></li>)}
            </ul>
          ) : <p className="mt-2 text-sm text-slate-600">No Set coordinators have been listed.</p>}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Your Set membership</h2>
          <p className="mt-2 text-sm text-slate-600">
            {isSetMember
              ? 'Your verified attendance or approved archive claim links you to this Set.'
              : hasSetAttendance && member.alumniProfile?.verificationStatus === 'PENDING'
                ? 'Your Set attendance verification request is awaiting school administrator review.'
                : hasSetAttendance
                  ? 'Your school years are saved but do not grant Set membership until verified.'
                  : 'Set membership is based on verified school years. Historical records remain unclaimed archive entries.'}
          </p>
          {!isSetMember && hasSetAttendance && member.alumniProfile?.verificationStatus !== 'PENDING' && (
            <div className="mt-3"><SetVerificationRequestForm year={year} returnTo={`/sets/${year}`} /></div>
          )}
          {!isSetMember && !hasSetAttendance && <Link className="mt-3 inline-block text-sm font-semibold text-[#9C0621] hover:underline" href="/profile/edit">Add your school years</Link>}
        </article>
      </section>

      {canManage && cohort && (
        <section className="mt-5 space-y-3">
          <CommunityDetailsForm scope="set" scopeId={cohort.id} returnTo={`/sets/${year}`} description={cohort.description} />
          <AnnouncementForm scope="set" scopeId={cohort.id} returnTo={`/sets/${year}`} />
          <EventForm scope="set" scopeId={cohort.id} returnTo={`/sets/${year}`} />
          <p className="text-xs text-slate-500">Set leadership assignments are managed by a school administrator from the Community Admin page.</p>
        </section>
      )}

      <section className="mt-8" id="members">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-bold">Members and historical records</h2><p className="mt-1 text-sm text-slate-600">{result.total} matching directory entries</p></div>
          <Link className="text-sm font-semibold text-[#9C0621] hover:underline" href="/directory">Full directory →</Link>
        </div>
        <form action={`/sets/${year}`} className="mt-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row">
          <label className="sr-only" htmlFor="set-search">Search this Set</label>
          <input className="min-w-0 flex-1 rounded-xl bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#9C0621]/20" defaultValue={query.q} id="set-search" maxLength={80} name="q" placeholder="Search registered members and historical records" />
          <button className="rounded-xl bg-[#9C0621] px-5 py-3 text-sm font-bold text-white hover:bg-[#80051b]" type="submit">Search this Set</button>
        </form>
        {result.members.length || result.archiveRecords.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.members.map((directoryMember) => <MemberCard key={`user-${directoryMember.id}`} member={directoryMember} />)}
            {result.archiveRecords.map((record) => <MemberCard key={`archive-${record.id}`} member={record} />)}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No registered members or historical records matched this Set search.</p>
        )}
        {result.pages > 1 && (
          <nav aria-label="Set pagination" className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
            <Link aria-disabled={result.page <= 1} className={result.page <= 1 ? 'pointer-events-none text-slate-300' : 'font-semibold text-[#9C0621]'} href={pageHref(result.page - 1)}>Previous</Link>
            <span className="text-sm text-slate-600">Page {result.page} of {result.pages}</span>
            <Link aria-disabled={result.page >= result.pages} className={result.page >= result.pages ? 'pointer-events-none text-slate-300' : 'font-semibold text-[#9C0621]'} href={pageHref(result.page + 1)}>Next</Link>
          </nav>
        )}
      </section>

      <section className="mt-10" id="announcements">
        <div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Announcements</h2><p className="mt-1 text-sm text-slate-600">Official updates visible to Set members and all GCUOBA members where nationally published.</p></div><Link className="text-sm font-semibold text-[#9C0621] hover:underline" href="/events">Community events →</Link></div>
        {announcements.length ? (
          <div className="mt-4 grid gap-3">
            {announcements.map((announcement) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-5" key={announcement.id}>
                <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-bold">{announcement.title}</h3>{canManage && <AnnouncementStatusForm announcementId={announcement.id} returnTo={`/sets/${year}`} status="PUBLISHED" />}</div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{announcement.content}</p>
                <p className="mt-3 text-xs text-slate-500">Posted by {announcement.author.firstName} {announcement.author.surname}{announcement.publishedAt ? ` · ${announcement.publishedAt.toLocaleDateString()}` : ''}</p>
                {canManage && <AnnouncementEditForm announcement={announcement} returnTo={`/sets/${year}`} />}
              </article>
            ))}
          </div>
        ) : <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No announcements have been posted yet.</p>}
      </section>

      <section className="mt-10" id="events">
        <h2 className="text-xl font-bold">Upcoming Set and national events</h2>
        {events.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {events.map((event) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-5" key={event.id}>
                <p className="text-xs font-bold uppercase tracking-wider text-[#9C0621]">{event.eventType.replaceAll('_', ' ')} · {event.isNational ? 'National' : 'Set event'}</p>
                <h3 className="mt-2 text-lg font-bold"><Link className="hover:text-[#9C0621]" href={`/events/${event.id}`}>{event.title}</Link></h3>
                <p className="mt-2 text-sm text-slate-600">{formatCommunityDate(event.startAt)}{event.location ? ` · ${event.location}` : ''}</p>
                <p className="mt-2 text-sm text-slate-600">{event._count.rsvps} going</p>
                {canManage && <div className="mt-3"><EventCancellationForm eventId={event.id} returnTo={`/sets/${year}`} /></div>}
              </article>
            ))}
          </div>
        ) : <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No upcoming events.</p>}
      </section>
    </MemberPageLayout>
  )
}
