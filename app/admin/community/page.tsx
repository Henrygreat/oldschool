import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AdminAssignmentForm, CreateChapterForm, CreateSetForm, SetVerificationReviewForm } from '@/components/community/forms'
import { MemberPageLayout } from '@/components/members/member-nav'
import { currentSchoolAdministrator } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export default async function CommunityAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ communityError?: string; communityNotice?: string }>
}) {
  const admin = await currentSchoolAdministrator()
  if (!admin) redirect('/dashboard')
  const query = await searchParams
  const errorMessages: Record<string, string> = {
    'sign-in-required': 'Please sign in again to continue.',
    'not-authorized': 'You are not authorised to manage community administration.',
    'invalid-set': 'Enter a Set year between 1900 and the current year.',
    'invalid-chapter': 'A Chapter name is required.',
    'invalid-request': 'The verification review request is invalid.',
    'verification-request-unavailable': 'That verification request has already been reviewed or is unavailable.',
    'set-attendance-required': 'The member no longer has Set attendance on their profile.',
  }

  const [cohorts, chapters, verificationRequests] = await Promise.all([
    prisma.cohort.findMany({
      where: { schoolId: admin.schoolId },
      orderBy: { year: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        year: true,
        administrators: {
          where: { user: { is: { isActive: true } } },
          select: { user: { select: { firstName: true, surname: true } } },
        },
      },
    }),
    prisma.chapter.findMany({
      where: { schoolId: admin.schoolId, isActive: true },
      orderBy: { name: 'asc' },
      take: 100,
      select: {
        id: true,
        name: true,
        country: true,
        administrators: {
          where: { user: { is: { isActive: true } } },
          select: { user: { select: { firstName: true, surname: true } } },
        },
      },
    }),
    prisma.verificationRequest.findMany({
      where: {
        schoolId: admin.schoolId,
        status: 'PENDING',
        evidence: { startsWith: 'Member requested verification of Set of ' },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
      select: {
        id: true,
        evidence: true,
        createdAt: true,
        alumniProfile: {
          select: {
            user: { select: { firstName: true, middleName: true, surname: true } },
            schoolAttendance: {
              where: { schoolId: admin.schoolId, cohort: { is: { schoolId: admin.schoolId } } },
              take: 3,
              select: { cohort: { select: { name: true, year: true } } },
            },
          },
        },
      },
    }),
  ])

  return (
    <MemberPageLayout name={admin.firstName}>
      <section className="rounded-3xl bg-[#16070a] px-6 py-8 text-white sm:px-10">
        <Link className="text-sm font-semibold text-white/70 hover:text-white" href="/dashboard">← Dashboard</Link>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-white/60">Administration</p>
        <h1 className="mt-2 text-4xl font-bold">Community administration</h1>
        <p className="mt-3 max-w-3xl text-white/75">Assign Set and Chapter coordinators to specific communities. Scoped admins cannot manage other communities or school-wide settings.</p>
      </section>

      {query.communityError && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{errorMessages[query.communityError] ?? 'The community administration change could not be completed.'}</p>}
      {query.communityNotice === 'verification-reviewed' && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Set verification review saved.</p>}
      <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">An assignment also sets the member&apos;s scoped administrator role. Only active members of this school can be assigned. A member with another administrator role must first be reviewed by a system administrator.</p>

      <section className="mt-5 grid gap-3 lg:grid-cols-2">
        <CreateSetForm />
        <CreateChapterForm />
      </section>

      <section className="mt-9 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold">Set verification requests</h2>
        <p className="mt-1 text-sm text-slate-600">Approval marks the member&apos;s attendance verified and enables membership in that Set community. Review against association records before approving.</p>
        {verificationRequests.length ? (
          <div className="mt-3 divide-y divide-slate-100">
            {verificationRequests.map((request) => (
              <div className="flex flex-wrap items-center justify-between gap-3 py-4" key={request.id}>
                <div>
                  <p className="font-semibold">{[request.alumniProfile.user.firstName, request.alumniProfile.user.middleName, request.alumniProfile.user.surname].filter(Boolean).join(' ')}</p>
                  <p className="mt-1 text-sm text-slate-600">{request.alumniProfile.schoolAttendance.map(({ cohort }) => cohort ? `${cohort.name} (${cohort.year})` : null).filter(Boolean).join(', ') || request.evidence || 'Set attendance verification'}</p>
                  <p className="mt-1 text-xs text-slate-500">Requested {request.createdAt.toLocaleDateString()}</p>
                </div>
                <SetVerificationReviewForm requestId={request.id} returnTo="/admin/community" />
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-slate-600">No pending Set verification requests.</p>}
        {verificationRequests.length === 50 && <p className="mt-3 text-xs text-slate-500">Showing the first 50 pending requests.</p>}
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-wider text-[#9C0621]">Set access</p><h2 className="mt-1 text-2xl font-bold">Set administrators</h2></div><Link className="text-sm font-semibold text-[#9C0621] hover:underline" href="/sets">Browse Sets →</Link></div>
        {cohorts.length ? <div className="mt-4 grid gap-4 lg:grid-cols-2">{cohorts.map((cohort) => <article className="rounded-2xl border border-slate-200 bg-white p-5" key={cohort.id}><h3 className="font-bold">{cohort.name}</h3><ul className="mt-2 text-sm text-slate-600">{cohort.administrators.length ? cohort.administrators.map(({ user }, index) => <li key={`${user.firstName}-${user.surname}-${index}`}>{user.firstName} {user.surname} · Set administrator</li>) : <li>No Set administrator assigned.</li>}</ul><div className="mt-4 space-y-2"><AdminAssignmentForm scope="set" scopeId={cohort.id} returnTo={`/sets/${cohort.year}`} operation="add" /><AdminAssignmentForm scope="set" scopeId={cohort.id} returnTo={`/sets/${cohort.year}`} operation="remove" /></div></article>)}</div> : <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No Sets are available to administer yet.</p>}
        {cohorts.length === 100 && <p className="mt-3 text-xs text-slate-500">Showing the 100 most recent Sets.</p>}
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-wider text-[#9C0621]">Chapter access</p><h2 className="mt-1 text-2xl font-bold">Chapter administrators</h2></div><Link className="text-sm font-semibold text-[#9C0621] hover:underline" href="/chapters">Browse Chapters →</Link></div>
        {chapters.length ? <div className="mt-4 grid gap-4 lg:grid-cols-2">{chapters.map((chapter) => <article className="rounded-2xl border border-slate-200 bg-white p-5" key={chapter.id}><h3 className="font-bold">{chapter.name}</h3><p className="mt-1 text-sm text-slate-600">{chapter.country ?? 'Location not listed'}</p><ul className="mt-2 text-sm text-slate-600">{chapter.administrators.length ? chapter.administrators.map(({ user }, index) => <li key={`${user.firstName}-${user.surname}-${index}`}>{user.firstName} {user.surname} · Chapter administrator</li>) : <li>No Chapter administrator assigned.</li>}</ul><div className="mt-4 space-y-2"><AdminAssignmentForm scope="chapter" scopeId={chapter.id} returnTo={`/chapters/${chapter.id}`} operation="add" /><AdminAssignmentForm scope="chapter" scopeId={chapter.id} returnTo={`/chapters/${chapter.id}`} operation="remove" /></div></article>)}</div> : <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No active Chapters are available to administer yet.</p>}
        {chapters.length === 100 && <p className="mt-3 text-xs text-slate-500">Showing the first 100 active Chapters.</p>}
      </section>
    </MemberPageLayout>
  )
}
