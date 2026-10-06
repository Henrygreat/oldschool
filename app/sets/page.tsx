import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MemberPageLayout } from '@/components/members/member-nav'
import { activeCommunityUser } from '@/lib/community'
import { prisma } from '@/lib/prisma'

export default async function SetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const member = await activeCommunityUser()
  if (!member) redirect('/auth/login?callbackUrl=%2Fsets')

  const params = await searchParams
  const query = params.q?.trim().slice(0, 40) ?? ''
  const numericYear = /^\d{4}$/.test(query) ? Number(query) : null
  const [cohorts, archiveYears, registeredCounts, archiveCounts] = await Promise.all([
    prisma.cohort.findMany({
      where: {
        schoolId: member.schoolId,
        ...(query ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' as const } },
            ...(numericYear ? [{ year: numericYear }] : []),
          ],
        } : {}),
      },
      orderBy: { year: 'desc' },
      take: 100,
      select: { id: true, name: true, year: true, description: true },
    }),
    prisma.alumniArchiveRecord.groupBy({
      by: ['setYear'],
      where: {
        schoolId: member.schoolId,
        archivedAt: null,
        ...(numericYear ? { setYear: numericYear } : {}),
      },
      orderBy: { setYear: 'desc' },
      take: 100,
      _count: { _all: true },
    }),
    prisma.schoolAttendance.groupBy({
      by: ['cohortId'],
      where: {
        schoolId: member.schoolId,
        cohortId: { not: null },
        alumniProfile: {
          is: {
            verificationStatus: 'VERIFIED',
            user: { is: { isActive: true } },
          },
        },
      },
      _count: { _all: true },
    }),
    prisma.alumniArchiveRecord.groupBy({
      by: ['setYear'],
      where: {
        schoolId: member.schoolId,
        archivedAt: null,
        claimedByUserId: null,
      },
      _count: { _all: true },
    }),
  ])

  const cohortYears = new Map(cohorts.map(({ id, year }) => [id, year]))
  const memberCounts = new Map<number, number>()
  for (const row of registeredCounts) {
    if (row.cohortId) {
      const year = cohortYears.get(row.cohortId)
      if (year !== undefined) memberCounts.set(year, row._count._all)
    }
  }
  const recordCounts = new Map(archiveCounts.map((row) => [row.setYear, row._count._all]))
  const setsByYear = new Map(cohorts.map((cohort) => [cohort.year, cohort]))
  for (const row of archiveYears) {
    if (!setsByYear.has(row.setYear)) {
      setsByYear.set(row.setYear, {
        id: '',
        name: `Set of ${row.setYear}`,
        year: row.setYear,
        description: null,
      })
    }
  }
  const sets = [...setsByYear.values()]
    .filter((set) => !query || set.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) || String(set.year) === query)
    .sort((left, right) => right.year - left.year)
    .slice(0, 100)

  return (
    <MemberPageLayout name={member.firstName}>
      <section className="rounded-3xl bg-[#16070a] px-6 py-8 text-white sm:px-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/60">GCUOBA communities</p>
        <h1 className="mt-2 text-4xl font-bold">Browse Sets</h1>
        <p className="mt-3 max-w-2xl text-white/75">Reconnect with registered members and explore historical alumni records from your Set.</p>
      </section>
      <form action="/sets" className="mt-6 flex gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <label className="sr-only" htmlFor="set-filter">Search Sets</label>
        <input className="min-w-0 flex-1 rounded-xl bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#9C0621]/20" defaultValue={query} id="set-filter" maxLength={40} name="q" placeholder="Search by Set name or year" />
        <button className="rounded-xl bg-[#9C0621] px-5 py-3 text-sm font-bold text-white hover:bg-[#80051b]" type="submit">Search</button>
      </form>
      {sets.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((set) => (
            <Link className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9C0621]/40 hover:shadow-md" href={`/sets/${set.year}`} key={set.year}>
              <p className="text-sm font-semibold uppercase tracking-wider text-[#9C0621]">{set.year} Set</p>
              <h2 className="mt-2 text-xl font-bold">{set.name}</h2>
              {set.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{set.description}</p>}
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                <div><dt className="text-slate-500">Registered members</dt><dd className="mt-1 font-bold">{memberCounts.get(set.year) ?? 0}</dd></div>
                <div><dt className="text-slate-500">Historical records</dt><dd className="mt-1 font-bold">{recordCounts.get(set.year) ?? 0}</dd></div>
              </dl>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">No Sets match that search yet.</p>
      )}
      {sets.length === 100 && (
        <p className="mt-4 text-center text-xs text-slate-500">Showing the 100 most recent matching Sets. Refine your search to find a specific year.</p>
      )}
      <div className="mt-8 flex justify-end">
        <Link className="font-semibold text-[#9C0621] hover:underline" href="/directory">Browse the full Old Boys directory →</Link>
      </div>
    </MemberPageLayout>
  )
}
