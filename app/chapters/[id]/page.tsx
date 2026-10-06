import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AnnouncementEditForm, AnnouncementForm, AnnouncementStatusForm, ChapterMembershipControls, CommunityDetailsForm, EventCancellationForm, EventForm, JoinRequestReview } from '@/components/community/forms'
import { MemberCard } from '@/components/members/member-card'
import { MemberPageLayout } from '@/components/members/member-nav'
import { activeCommunityUser, canManageChapter, formatCommunityDate } from '@/lib/community'
import { canViewField, memberPhotoUrl, privacyFor } from '@/lib/profile'
import { prisma } from '@/lib/prisma'
import type { DirectoryCardMember } from '@/components/members/member-card'

const communityErrors: Record<string, string> = {
  'sign-in-required': 'Please sign in again to continue.',
  'not-authorized': 'You are not authorised to manage this community.',
  'invalid-announcement': 'Enter a valid announcement title, content, and expiry.',
  'invalid-event': 'Check the event title, dates, capacity, and HTTPS URLs.',
  'already-member': 'You are already a Chapter member.',
  'request-pending': 'Your membership request is awaiting review.',
  'chapter-unavailable': 'This Chapter is no longer available.',
  'profile-required': 'Complete your member profile before requesting membership.',
  'invalid-request': 'The membership review request is invalid.',
  'request-already-reviewed': 'This Chapter request has already been reviewed.',
  'member-profile-unavailable': 'The requester no longer has an active profile.',
  'invalid-administrator': 'No active member with that account email was found.',
  'role-conflict': 'That member already has another administrator role.',
  'scope-unavailable': 'This Chapter is no longer available.',
  'announcement-unavailable': 'This announcement is no longer available.',
  'event-unavailable': 'This event is no longer available.',
}

export default async function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ communityError?: string; communityNotice?: string }>
}) {
  const member = await activeCommunityUser()
  if (!member) redirect('/auth/login?callbackUrl=%2Fchapters')
  const { id } = await params
  const chapter = await prisma.chapter.findFirst({
    where: { id, schoolId: member.schoolId, isActive: true },
    select: {
      id: true,
      name: true,
      country: true,
      region: true,
      city: true,
      description: true,
      contactInfo: true,
      administrators: {
        where: { user: { is: { isActive: true } } },
        take: 8,
        orderBy: { createdAt: 'asc' },
        select: { user: { select: { firstName: true, surname: true } } },
      },
    },
  })
  if (!chapter) notFound()

  const isMember = Boolean(member.alumniProfile && await prisma.chapterMember.findUnique({
    where: { chapterId_alumniProfileId: { chapterId: chapter.id, alumniProfileId: member.alumniProfile.id } },
    select: { id: true },
  }))
  const canManage = await canManageChapter(member.id, member.schoolId, chapter.id)
  const [membershipRequest, memberCount, memberRows, pendingRequests, announcements, events] = await Promise.all([
    prisma.chapterJoinRequest.findUnique({
      where: { chapterId_userId: { chapterId: chapter.id, userId: member.id } },
      select: { status: true },
    }),
    prisma.chapterMember.count({
      where: { chapterId: chapter.id, alumniProfile: { is: { user: { is: { isActive: true } } } } },
    }),
    prisma.chapterMember.findMany({
      where: { chapterId: chapter.id, alumniProfile: { is: { user: { is: { isActive: true } } } } },
      orderBy: { joinedAt: 'desc' },
      take: 12,
      select: {
        alumniProfile: {
          select: {
            profession: true,
            company: true,
            currentCity: true,
            currentCountry: true,
            schoolAttendance: {
              take: 1,
              orderBy: { updatedAt: 'desc' },
              select: { cohort: { select: { name: true } }, house: { select: { name: true } } },
            },
            user: {
              select: {
                id: true,
                firstName: true,
                middleName: true,
                surname: true,
                nickname: true,
                profilePhotoUrl: true,
                profilePhotoKey: true,
                updatedAt: true,
                privacySettings: { select: { field: true, visibility: true } },
              },
            },
          },
        },
      },
    }),
    canManage
      ? prisma.chapterJoinRequest.findMany({
          where: { chapterId: chapter.id, schoolId: member.schoolId, status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
          take: 50,
          select: {
            id: true,
            message: true,
            createdAt: true,
            user: { select: { firstName: true, middleName: true, surname: true } },
          },
        })
      : Promise.resolve([]),
    prisma.announcement.findMany({
      where: {
        schoolId: member.schoolId,
        status: 'PUBLISHED',
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          { OR: [{ isNational: true }, ...(isMember ? [{ chapterId: chapter.id }] : [])] },
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
        startAt: { gte: new Date() },
        OR: [{ isNational: true }, ...(isMember ? [{ chapterId: chapter.id }] : [])],
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

  const members: DirectoryCardMember[] = memberRows.map(({ alumniProfile }) => {
    const user = alumniProfile.user
    const privacy = privacyFor(user.privacySettings)
    const canSeePhoto = canViewField(privacy.photo, true, user.id === member.id, false)
    const canSeeCompany = canViewField(privacy.company, true, user.id === member.id, false)
    const canSeeLocation = canViewField(privacy.location, true, user.id === member.id, false)
    return {
      id: user.id,
      name: [user.firstName, user.middleName, user.surname].filter(Boolean).join(' '),
      nickname: user.nickname,
      photoUrl: canSeePhoto ? memberPhotoUrl(user.id, user.profilePhotoKey, user.profilePhotoUrl, user.updatedAt) : null,
      setName: alumniProfile.schoolAttendance[0]?.cohort?.name ?? null,
      houseName: alumniProfile.schoolAttendance[0]?.house?.name ?? null,
      profession: alumniProfile.profession,
      company: canSeeCompany ? alumniProfile.company : null,
      location: canSeeLocation
        ? [alumniProfile.currentCity, alumniProfile.currentCountry].filter(Boolean).join(', ') || null
        : null,
      verified: false,
      profileHref: `/members/${user.id}`,
    }
  })
  const query = await searchParams
  const returnTo = `/chapters/${encodeURIComponent(chapter.id)}`

  return (
    <MemberPageLayout name={member.firstName}>
      <section className="rounded-3xl bg-[#16070a] px-6 py-8 text-white sm:px-10">
        <Link className="text-sm font-semibold text-white/70 hover:text-white" href="/chapters">← Browse Chapters</Link>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-white/60">GCUOBA Chapter</p>
        <h1 className="mt-2 text-4xl font-bold">{chapter.name}</h1>
        <p className="mt-3 text-white/75">{[chapter.city, chapter.region, chapter.country].filter(Boolean).join(', ') || 'Location not listed'} · {memberCount} registered members</p>
        {chapter.description && <p className="mt-4 max-w-3xl text-white/85">{chapter.description}</p>}
        <nav aria-label="Chapter sections" className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
          {['Overview', 'Members', 'Announcements', 'Events'].map((label) => <a className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20" href={`#${label.toLowerCase()}`} key={label}>{label}</a>)}
        </nav>
      </section>
      {query.communityError && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{communityErrors[query.communityError] ?? 'The community change could not be completed.'}</p>}
      {query.communityNotice === 'administrator-updated' && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Chapter administrator assignment updated.</p>}
      {query.communityNotice === 'requested' && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Your Chapter membership request was submitted.</p>}
      {query.communityNotice === 'left' && <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">You have left this Chapter.</p>}

      <section className="mt-6 grid gap-4 lg:grid-cols-2" id="overview">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Chapter leadership</h2>
          {chapter.administrators.length ? (
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {chapter.administrators.map(({ user }, index) => <li key={`${user.firstName}-${user.surname}-${index}`}>{user.firstName} {user.surname} <span className="text-slate-500">· Chapter coordinator</span></li>)}
            </ul>
          ) : <p className="mt-2 text-sm text-slate-600">No Chapter coordinators have been listed.</p>}
          {chapter.contactInfo && <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">Contact: {chapter.contactInfo}</p>}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Your membership</h2>
          <p className="mt-2 text-sm text-slate-600">{isMember ? 'You are a registered member of this Chapter.' : 'Membership is opt-in and is not assigned from your current location.'}</p>
          <div className="mt-4"><ChapterMembershipControls chapterId={chapter.id} returnTo={returnTo} isMember={isMember} hasProfile={Boolean(member.alumniProfile)} requestStatus={membershipRequest?.status ?? null} /></div>
        </article>
      </section>

      {canManage && (
        <section className="mt-5 space-y-3">
          <CommunityDetailsForm scope="chapter" scopeId={chapter.id} returnTo={returnTo} description={chapter.description} chapter={{ country: chapter.country, region: chapter.region, city: chapter.city, contactInfo: chapter.contactInfo }} />
          <AnnouncementForm scope="chapter" scopeId={chapter.id} returnTo={returnTo} />
          <EventForm scope="chapter" scopeId={chapter.id} returnTo={returnTo} />
        </section>
      )}

      {canManage && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Pending membership requests</h2>
          {pendingRequests.length ? (
            <div className="mt-3 divide-y divide-slate-100">
              {pendingRequests.map((request) => (
                <div className="flex flex-wrap items-center justify-between gap-3 py-4" key={request.id}>
                  <div><p className="font-semibold">{[request.user.firstName, request.user.middleName, request.user.surname].filter(Boolean).join(' ')}</p>{request.message && <p className="mt-1 text-sm text-slate-600">{request.message}</p>}<p className="mt-1 text-xs text-slate-500">Requested {request.createdAt.toLocaleDateString()}</p></div>
                  <JoinRequestReview requestId={request.id} returnTo={returnTo} />
                </div>
              ))}
            </div>
          ) : <p className="mt-2 text-sm text-slate-600">No pending Chapter membership requests.</p>}
          {pendingRequests.length === 50 && <p className="mt-2 text-xs text-slate-500">Showing the first 50 pending requests.</p>}
        </section>
      )}

      <section className="mt-9" id="members">
        <div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Chapter members</h2><p className="mt-1 text-sm text-slate-600">Showing {members.length} of {memberCount} registered members.</p></div></div>
        {members.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{members.map((person) => <MemberCard key={person.id} member={person} />)}</div> : <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No registered members have joined this Chapter yet.</p>}
      </section>

      <section className="mt-10" id="announcements">
        <h2 className="text-xl font-bold">Announcements</h2>
        {announcements.length ? <div className="mt-4 grid gap-3">        {announcements.map((announcement) => <article className="rounded-2xl border border-slate-200 bg-white p-5" key={announcement.id}><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-bold">{announcement.title}</h3>{canManage && <AnnouncementStatusForm announcementId={announcement.id} returnTo={returnTo} status="PUBLISHED" />}</div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{announcement.content}</p><p className="mt-3 text-xs text-slate-500">Posted by {announcement.author.firstName} {announcement.author.surname}{announcement.publishedAt ? ` · ${announcement.publishedAt.toLocaleDateString()}` : ''}</p>{canManage && <AnnouncementEditForm announcement={announcement} returnTo={returnTo} />}</article>)}</div> : <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No announcements have been posted yet.</p>}
      </section>

      <section className="mt-10" id="events">
        <h2 className="text-xl font-bold">Upcoming Chapter and national events</h2>
        {events.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{events.map((event) => <article className="rounded-2xl border border-slate-200 bg-white p-5" key={event.id}><p className="text-xs font-bold uppercase tracking-wider text-[#9C0621]">{event.eventType.replaceAll('_', ' ')} · {event.isNational ? 'National' : 'Chapter event'}</p><h3 className="mt-2 text-lg font-bold"><Link className="hover:text-[#9C0621]" href={`/events/${event.id}`}>{event.title}</Link></h3><p className="mt-2 text-sm text-slate-600">{formatCommunityDate(event.startAt)}{event.location ? ` · ${event.location}` : ''}</p><p className="mt-2 text-sm text-slate-600">{event._count.rsvps} going</p>{canManage && <div className="mt-3"><EventCancellationForm eventId={event.id} returnTo={returnTo} /></div>}</article>)}</div> : <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No upcoming events.</p>}
      </section>
    </MemberPageLayout>
  )
}
