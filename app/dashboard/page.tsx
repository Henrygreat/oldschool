import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Archive, BriefcaseBusiness, GraduationCap, Search, UserRound } from 'lucide-react'
import { Avatar } from '@/components/members/avatar'
import { MemberCard } from '@/components/members/member-card'
import { MemberPageLayout } from '@/components/members/member-nav'
import { auth } from '@/lib/auth'
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
      alumniProfile: {
        select: {
          profession: true,
          industry: true,
          company: true,
          jobTitle: true,
          biography: true,
          schoolAttendance: {
            take: 1,
            orderBy: { updatedAt: 'desc' },
            select: {
              entryYear: true,
              leavingYear: true,
              cohort: { select: { year: true, name: true } },
              house: { select: { name: true } },
            },
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
              <div><p className="text-sm font-semibold text-slate-500">Your GCU years</p><p className="mt-1 font-bold">{attendance?.cohort?.name ?? 'Set not added yet'}</p><p className="text-sm text-slate-600">{attendance?.entryYear ?? '—'} – {attendance?.leavingYear ?? '—'}</p></div>
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
            <Link className="flex items-center justify-between rounded-xl bg-slate-50 p-4 font-semibold hover:bg-slate-100" href="/profile/edit"><span className="flex items-center gap-3"><UserRound className="h-5 w-5 text-[#9C0621]" />Edit profile</span><ArrowRight className="h-4 w-4" /></Link>
            <Link className="flex items-center justify-between rounded-xl bg-slate-50 p-4 font-semibold hover:bg-slate-100" href={`/members/${user.id}`}><span>View my profile</span><ArrowRight className="h-4 w-4" /></Link>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Set communities are planned for a future phase.</p>
        </section>
      </div>

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
