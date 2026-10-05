import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { MemberCard } from '@/components/members/member-card'
import { MemberPageLayout } from '@/components/members/member-nav'
import { auth } from '@/lib/auth'
import { parseDirectoryFilters, searchDirectory } from '@/lib/directory'
import { prisma } from '@/lib/prisma'

export default async function SetPage({
  params,
  searchParams,
}: {
  params: Promise<{ year: string }>
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) {
    redirect('/auth/login?callbackUrl=%2Fsets')
  }
  const activeUser = await prisma.user.findFirst({
    where: { id: session.user.id, schoolId: session.user.schoolId, isActive: true },
    select: { id: true },
  })
  if (!activeUser) redirect('/auth/login?callbackUrl=%2Fsets')

  const { year: yearText } = await params
  if (!/^(19|20)\d{2}$/.test(yearText)) notFound()
  const year = Number(yearText)
  const cohort = await prisma.cohort.findFirst({
    where: { schoolId: session.user.schoolId, year },
    select: { name: true },
  })
  const query = await searchParams
  const filters = parseDirectoryFilters({
    q: query.q,
    setYear: String(year),
    page: query.page,
  })
  const result = await searchDirectory(session.user.schoolId, activeUser.id, filters)
  const registeredCount = await prisma.user.count({
    where: {
      schoolId: session.user.schoolId,
      isActive: true,
      alumniProfile: {
        is: { schoolAttendance: { some: { cohort: { is: { year } } } } },
      },
    },
  })
  const archiveCount = await prisma.alumniArchiveRecord.count({
    where: { schoolId: session.user.schoolId, setYear: year, archivedAt: null },
  })

  function pageHref(page: number) {
    const params = new URLSearchParams()
    if (query.q) params.set('q', query.q.slice(0, 80))
    if (page > 1) params.set('page', String(page))
    const suffix = params.toString()
    return `/sets/${year}${suffix ? `?${suffix}` : ''}`
  }

  return (
    <MemberPageLayout name={session.user.name?.split(' ')[0] ?? 'Member'}>
      <section className="rounded-3xl bg-[#16070a] px-6 py-8 text-white sm:px-10">
        <Link className="text-sm font-semibold text-white/70 hover:text-white" href="/directory">← Back to directory</Link>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-white/60">GCUOBA alumni</p>
        <h1 className="mt-2 text-4xl font-bold">{cohort?.name ?? `Set of ${year}`}</h1>
        <p className="mt-3 text-white/75">{registeredCount} registered members · {archiveCount} archive records</p>
      </section>
      <form action={`/sets/${year}`} className="mt-6 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row">
        <label className="sr-only" htmlFor="set-search">Search this Set</label>
        <input className="min-w-0 flex-1 rounded-xl bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#9C0621]/20" defaultValue={query.q} id="set-search" maxLength={80} name="q" placeholder="Search members and historical records" />
        <button className="rounded-xl bg-[#9C0621] px-5 py-3 text-sm font-bold text-white hover:bg-[#80051b]" type="submit">Search this Set</button>
      </form>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Registered members</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.members.length
            ? result.members.map((member) => <MemberCard key={member.id} member={member} />)
            : <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No registered members matched this Set search.</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Historical records</h2>
        <p className="mt-1 text-sm text-slate-600">Historical archive entries. Email, phone, biographies, and remarks are never shown here.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.archiveRecords.length
            ? result.archiveRecords.map((member) => <MemberCard key={member.id} member={member} />)
            : <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No historical records matched this Set search.</p>}
        </div>
      </section>
      {result.pages > 1 && (
        <nav aria-label="Set pagination" className="mt-7 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
          <Link aria-disabled={result.page <= 1} className={result.page <= 1 ? 'pointer-events-none text-slate-300' : 'font-semibold text-[#9C0621]'} href={pageHref(result.page - 1)}>Previous</Link>
          <span className="text-sm text-slate-600">Page {result.page} of {result.pages}</span>
          <Link aria-disabled={result.page >= result.pages} className={result.page >= result.pages ? 'pointer-events-none text-slate-300' : 'font-semibold text-[#9C0621]'} href={pageHref(result.page + 1)}>Next</Link>
        </nav>
      )}
    </MemberPageLayout>
  )
}
