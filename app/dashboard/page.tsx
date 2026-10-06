import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Archive, BriefcaseBusiness, GraduationCap, Search, UserRound } from 'lucide-react'
import { Avatar } from '@/components/members/avatar'
import { MemberCard } from '@/components/members/member-card'
import { MemberPageLayout } from '@/components/members/member-nav'
import { auth } from '@/lib/auth'
import { formatCommunityDate } from '@/lib/community'
import { searchDirectory } from '@/lib/directory'
import { memberPhotoUrl, profileCompletion } from '@/lib/profile'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) redirect('/auth/login')

  const user = await prisma.user.findFirst({
    where: { id: session.user.id, schoolId: session.user.schoolId, isActive: true },
    select: {
      id: true,
      firstName: true,
      surname: true,
      profilePhotoUrl: true,
      profilePhotoKey: true,
      updatedAt: true,
      claimedArchiveRecord: { select: { setYear: true, cohortId: true } },
      alumniProfile: {
        select: {
          profession: true,
          industry: true,
          company: true,
          jobTitle: true,
          biography: true,
          verificationStatus: true,
          schoolAttendance: {
            take: 1,
            orderBy: { updatedAt: 'desc' },
            select: {
              entryYear: true,
              leavingYear: true,
              cohort: { select: { id: true, year: true, name: true } },
              house: { select: { name: true } },
            },
          },
          chapterMemberships: {
            take: 5,
            orderBy: { joinedAt: 'desc' },
            select: { chapter: { select: { id: true, name: true } } },
          },
        },
      },
    },
  })
  if (!user) redirect('/auth/login')

  const profile = user.alumniProfile
  const attendance = profile?.schoolAttendance[0]
  const completion = profileCompletion({
    firstName: user.firstName,
    surname: user.surname,
    entryYear: attendance?.entryYear ?? null,
    leavingYear: attendance?.leavingYear ?? null,
    setYear: attendance?.cohort?.year ?? null,
    profession: profile?.profession ?? null,
    company: profile?.company ?? null,
    jobTitle: profile?.jobTitle ?? null,
    industry: profile?.industry ?? null,
    biography: profile?.biography ?? null,
  })

  const suggestions = await searchDirectory(session.user.schoolId, user.id, {
    q: '',
    setYear: null,
    entryYear: null,
    leavingYear: null,
    house: '',
    country: '',
    city: '',
    profession: '',
    industry: '',
    page: 1,
    invalid: false,
  })
  const chapterMemberships = profile?.chapterMemberships ?? []
  const chapterIds = chapterMemberships.map(({ chapter }) => chapter.id)
  const cohortId = profile?.verificationStatus === 'VERIFIED'
    ? attendance?.cohort?.id
    : user.claimedArchiveRecord?.cohortId ?? undefined
  const now = new Date()
  const [announcements, events, pendingConnectionCount, communityNotifications] = await Promise.all([
    prisma.announcement.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: 'PUBLISHED',
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          {
            OR: [
              { isNational: true },
              ...(cohortId ? [{ cohortId }] : []),
              ...(chapterIds.length ? [{ chapterId: { in: chapterIds } }] : []),
            ],
          },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        content: true,
        publishedAt: true,
        chapter: { select: { id: true, name: true } },
        cohort: { select: { year: true, name: true } },
      },
    }),
    prisma.event.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: 'PUBLISHED',
        startAt: { gte: now },
        OR: [
          { isNational: true },
          ...(cohortId ? [{ cohortId }] : []),
          ...(chapterIds.length ? [{ chapterId: { in: chapterIds } }] : []),
        ],
      },
      orderBy: { startAt: 'asc' },
      take: 3,
      select: {
        id: true,
        title: true,
        startAt: true,
        location: true,
        isNational: true,
        chapter: { select: { name: true } },
        cohort: { select: { name: true } },
        _count: { select: { rsvps: { where: { response: 'GOING' } } } },
      },
    }),
    prisma.connection.count({
      where: { toUserId: user.id, toUser: { schoolId: session.user.schoolId, isActive: true }, status: 'PENDING' },
    }),
    prisma.notification.findMany({
      where: { userId: user.id, type: { in: ['CHAPTER_MEMBERSHIP', 'SET_VERIFICATION'] } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, content: true, link: true, createdAt: true, isRead: true },
    }),
  ])
  const displayName = `${user.firstName} ${user.surname}`

  return (
    <MemberPageLayout name={user.firstName}>
      <section className="overflow-hidden rounded-3xl bg-[#16070a] text-white">
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-center gap-5">
            <Avatar name={displayName} photoUrl={memberPhotoUrl(user.id, user.profilePhotoKey, user.profilePhotoUrl, user.updatedAt)} size="lg" />
            <div>
              <p className="text-sm font-semibold text-white/60">GCUOBA MEMBER DASHBOARD</p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Welcome back, {user.firstName}.</h1>
              <p className="mt-2 text-white/70">Your GCU community is here whenever you are ready to reconnect.</p>
            </div>
          </div>
          <Link className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9C0621] px-5 py-3 font-semibold text-white transition hover:bg-[#80051b]" href="/directory">
            <Search className="h-5 w-5" /> Find Old Boys
          </Link>
        </div>
      </section>

      <div className="mt-7 grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Profile completion</p>
              <h2 className="mt-2 text-2xl font-bold">{completion.percent}% complete</h2>
              <p className="mt-1 text-sm text-slate-600">{completion.isComplete ? 'Your profile is looking good.' : 'Add a few details to help your schoolmates recognise and find you.'}</p>
            </div>
            <Link className="rounded-xl bg-[#9C0621] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#80051b]" href="/profile/edit">
              {completion.isComplete ? 'Edit profile' : 'Complete profile'}
            </Link>
          </div>
          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#9C0621]" style={{ width: `${completion.percent}%` }} />
          </div>
          <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9C0621]/10 text-[#9C0621]"><GraduationCap className="h-5 w-5" /></span>
              <div><p className="text-sm font-semibold text-slate-500">Your GCU years</p><p className="mt-1 font-bold">{profile?.verificationStatus === 'VERIFIED' ? attendance?.cohort?.name ?? (user.claimedArchiveRecord ? `Set of ${user.claimedArchiveRecord.setYear}` : 'Set not added yet') : user.claimedArchiveRecord ? `Set of ${user.claimedArchiveRecord.setYear}` : attendance?.cohort ? 'Set awaiting verification' : 'Set not added yet'}</p><p className="text-sm text-slate-600">{attendance?.entryYear ?? '—'} – {attendance?.leavingYear ?? '—'}</p></div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9C0621]/10 text-[#9C0621]"><BriefcaseBusiness className="h-5 w-5" /></span>
              <div><p className="text-sm font-semibold text-slate-500">House & profession</p><p className="mt-1 font-bold">{attendance?.house?.name ?? 'House not added yet'}</p><p className="text-sm text-slate-600">{profile?.profession ?? 'Profession not added yet'}</p></div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Quick actions</p>
          <div className="mt-4 space-y-2">
            <Link className="flex items-center justify-between rounded-xl bg-slate-50 p-4 font-semibold hover:bg-slate-100" href="/directory"><span className="flex items-center gap-3"><Search className="h-5 w-5 text-[#9C0621]" />Find Old Boys</span><ArrowRight className="h-4 w-4" /></Link>
            <Link className="flex items-center justify-between rounded-xl bg-slate-50 p-4 font-semibold hover:bg-slate-100" href="/archive/find"><span className="flex items-center gap-3"><Archive className="h-5 w-5 text-[#9C0621]" />Find your old school record</span><ArrowRight className="h-4 w-4" /></Link>
            <Link className="flex items-center justify-between rounded-xl bg-slate-50 p-4 font-semibold hover:bg-slate-100" href="/network"><span className="flex items-center gap-3"><UserRound className="h-5 w-5 text-[#9C0621]" />My Network</span><ArrowRight className="h-4 w-4" /></Link>
            <Link className="flex items-center justify-between rounded-xl bg-slate-50 p-4 font-semibold hover:bg-slate-100" href="/sets"><span>Browse Sets</span><ArrowRight className="h-4 w-4" /></Link>
            <Link className="flex items-center justify-between rounded-xl bg-slate-50 p-4 font-semibold hover:bg-slate-100" href="/chapters"><span>Find your Chapter</span><ArrowRight className="h-4 w-4" /></Link>
            <Link className="flex items-center justify-between rounded-xl bg-slate-50 p-4 font-semibold hover:bg-slate-100" href="/events"><span>Upcoming events</span><ArrowRight className="h-4 w-4" /></Link>
            <Link className="flex items-center justify-between rounded-xl bg-slate-50 p-4 font-semibold hover:bg-slate-100" href="/network?tab=received"><span>Connection requests{pendingConnectionCount ? ` (${pendingConnectionCount})` : ''}</span><ArrowRight className="h-4 w-4" /></Link>
            <Link className="flex items-center justify-between rounded-xl bg-slate-50 p-4 font-semibold hover:bg-slate-100" href="/profile/edit"><span className="flex items-center gap-3"><UserRound className="h-5 w-5 text-[#9C0621]" />Edit profile</span><ArrowRight className="h-4 w-4" /></Link>
            <Link className="flex items-center justify-between rounded-xl bg-slate-50 p-4 font-semibold hover:bg-slate-100" href={`/members/${user.id}`}><span>View my profile</span><ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </div>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-wider text-[#9C0621]">Your communities</p><h2 className="mt-1 text-xl font-bold">Set and Chapter</h2></div><GraduationCap className="h-5 w-5 text-[#9C0621]" /></div>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your Set</p>{user.claimedArchiveRecord ? <Link className="mt-1 inline-block font-bold text-[#9C0621] hover:underline" href={`/sets/${user.claimedArchiveRecord.setYear}`}>Set of {user.claimedArchiveRecord.setYear}</Link> : attendance?.cohort ? <><Link className="mt-1 inline-block font-bold text-[#9C0621] hover:underline" href={`/sets/${attendance.cohort.year}`}>{attendance.cohort.name}</Link>{profile?.verificationStatus !== 'VERIFIED' && <p className="mt-1 text-sm text-slate-600">School attendance verification is pending.</p>}</> : <><p className="mt-1 font-semibold">Add your school years</p><Link className="mt-1 inline-block text-sm font-semibold text-[#9C0621] hover:underline" href="/profile/edit">Update your profile →</Link></>}</div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your Chapters</p>{chapterMemberships.length ? <ul className="mt-1 space-y-1">{chapterMemberships.map(({ chapter }) => <li key={chapter.id}><Link className="font-bold text-[#9C0621] hover:underline" href={`/chapters/${chapter.id}`}>{chapter.name}</Link></li>)}</ul> : <><p className="mt-1 font-semibold">You haven&apos;t joined a Chapter yet.</p><Link className="mt-1 inline-block text-sm font-semibold text-[#9C0621] hover:underline" href="/chapters">Find your Chapter →</Link></>}</div>
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-wider text-[#9C0621]">Your calendar</p><h2 className="mt-1 text-xl font-bold">Upcoming Events</h2></div><Link className="text-sm font-bold text-[#9C0621] hover:underline" href="/events">View all →</Link></div>
          {events.length ? <ul className="mt-4 divide-y divide-slate-100">{events.map((event) => <li className="py-3" key={event.id}><Link className="font-semibold hover:text-[#9C0621]" href={`/events/${event.id}`}>{event.title}</Link><p className="mt-1 text-sm text-slate-600">{formatCommunityDate(event.startAt)} · {event.isNational ? 'National' : event.chapter?.name ?? event.cohort?.name ?? 'Community'} · {event._count.rsvps} going</p></li>)}</ul> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No upcoming events.</p>}
        </article>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-wider text-[#9C0621]">Community updates</p><h2 className="mt-1 text-2xl font-bold">Latest announcements</h2></div><Link className="text-sm font-bold text-[#9C0621] hover:underline" href="/sets">Explore Set communities →</Link></div>
        {announcements.length ? <div className="mt-4 grid gap-3 md:grid-cols-3">{announcements.map((announcement) => <article className="rounded-2xl border border-slate-200 bg-white p-5" key={announcement.id}><h3 className="font-bold">{announcement.title}</h3><p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-slate-600">{announcement.content}</p><p className="mt-3 text-xs text-slate-500">{announcement.chapter?.name ?? announcement.cohort?.name ?? 'National announcement'}{announcement.publishedAt ? ` · ${announcement.publishedAt.toLocaleDateString()}` : ''}</p></article>)}</div> : <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No announcements have been posted yet.</p>}
      </section>

      {communityNotifications.length > 0 && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Community activity</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {communityNotifications.map((notification) => (
              <li className="py-3" key={notification.id}>
                {notification.link
                  ? <Link className="font-medium hover:text-[#9C0621]" href={notification.link}>{notification.content}</Link>
                  : <p className="font-medium">{notification.content}</p>}
                <p className="mt-1 text-xs text-slate-500">{notification.createdAt.toLocaleDateString()}{notification.isRead ? '' : ' · New'}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-sm font-bold uppercase tracking-wider text-[#9C0621]">Reconnect</p><h2 className="mt-1 text-2xl font-bold">Old Boys in the directory</h2></div>
          <Link className="text-sm font-bold text-[#9C0621] hover:underline" href="/directory">Browse directory →</Link>
        </div>
        {suggestions.members.filter((member) => member.id !== user.id).length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {suggestions.members.filter((member) => member.id !== user.id).slice(0, 4).map((member) => <MemberCard key={member.id} member={member} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <h3 className="font-bold">Your schoolmates are joining</h3>
            <p className="mt-2 text-sm text-slate-600">There are no other member profiles to show yet. Check back as more Old Boys join.</p>
          </div>
        )}
      </section>
    </MemberPageLayout>
  )
}
