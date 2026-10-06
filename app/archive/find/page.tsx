import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Archive, Search } from 'lucide-react'
import { ArchiveMatchResults } from '@/components/archive/archive-match-results'
import { MemberPageLayout } from '@/components/members/member-nav'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const parseYear = (value: string | undefined) => {
  if (!value || !/^\d{4}$/.test(value)) return null
  const year = Number(value)
  return year >= 1900 && year <= new Date().getFullYear() ? year : null
}

export default async function FindHistoricalRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; setYear?: string; house?: string; onboarding?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) {
    redirect('/auth/login?callbackUrl=%2Farchive%2Ffind')
  }
  const user = await prisma.user.findFirst({
    where: { id: session.user.id, schoolId: session.user.schoolId, isActive: true },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      surname: true,
      alumniProfile: {
        select: {
          schoolAttendance: {
            take: 1,
            orderBy: { updatedAt: 'desc' },
            select: { cohort: { select: { year: true } }, house: { select: { name: true } } },
          },
        },
      },
    },
  })
  if (!user) redirect('/auth/login?callbackUrl=%2Farchive%2Ffind')

  const params = await searchParams
  const onboarding = params.onboarding === '1'
  const defaultQuery = [user.firstName, user.middleName, user.surname].filter(Boolean).join(' ')
  const attendance = user.alumniProfile?.schoolAttendance[0]
  const query = (params.q ?? (onboarding ? defaultQuery : '')).trim().slice(0, 80)
  const yearText = params.setYear ?? (onboarding ? attendance?.cohort?.year.toString() : undefined)
  const setYear = parseYear(yearText)
  const house = (params.house ?? (onboarding ? attendance?.house?.name : '') ?? '').trim().slice(0, 80)
  const searchSubmitted = Boolean(params.q || params.setYear || params.house || onboarding)

  const nameParts = query.split(/\s+/).filter(Boolean).slice(0, 5)
  const nameConditions = query
    ? [
        { fullName: { contains: query, mode: 'insensitive' as const } },
        ...(nameParts.length > 1
          ? [{ AND: nameParts.map((part) => ({ fullName: { contains: part, mode: 'insensitive' as const } })) }]
          : []),
        { firstName: { contains: query, mode: 'insensitive' as const } },
        { surname: { contains: query, mode: 'insensitive' as const } },
      ]
    : []
  const where = {
    schoolId: session.user.schoolId,
    archivedAt: null,
    claimedByUserId: null,
    status: 'LIVING' as const,
    ...(nameConditions.length ? { OR: nameConditions } : {}),
    ...(setYear !== null ? { setYear } : {}),
    ...(house ? { house: { contains: house, mode: 'insensitive' as const } } : {}),
  }
  const records = searchSubmitted && (query || setYear !== null || house)
    ? await prisma.alumniArchiveRecord.findMany({
        where,
        orderBy: [
          ...(setYear !== null ? [{ setYear: 'asc' as const }] : [{ setYear: 'desc' as const }]),
          { fullName: 'asc' },
          { id: 'asc' },
        ],
        take: 25,
        select: { id: true, fullName: true, title: true, setYear: true, house: true },
      })
    : []

  return (
    <MemberPageLayout name={user.firstName}>
      <section className="rounded-3xl bg-[#16070a] px-6 py-8 text-white sm:px-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/60">Historical alumni records</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Find your old school record</h1>
        <p className="mt-3 max-w-2xl text-white/75">If your name already appears in GCUOBA’s historical records, you can ask an administrator to link that record to your account. A possible match is only a suggestion; nothing is linked automatically.</p>
      </section>

      <form action="/archive/find" className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3">
        {onboarding && <input name="onboarding" type="hidden" value="1" />}
        <label className="text-sm font-semibold text-slate-700">Name
          <input className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" defaultValue={query} maxLength={80} name="q" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Set / year
          <input className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" defaultValue={setYear?.toString() ?? ''} max={new Date().getFullYear()} min="1900" name="setYear" type="number" />
        </label>
        <label className="text-sm font-semibold text-slate-700">House
          <input className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" defaultValue={house} maxLength={80} name="house" />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <button className="inline-flex items-center gap-2 rounded-xl bg-[#9C0621] px-5 py-3 text-sm font-bold text-white hover:bg-[#80051b]" type="submit"><Search className="h-4 w-4" /> Search historical records</button>
          <Link className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-[#9C0621] hover:text-[#9C0621]" href="/dashboard"><Archive className="h-4 w-4" /> Skip for now</Link>
        </div>
      </form>

      {searchSubmitted && (
        <section className="mt-8" aria-live="polite">
          <h2 className="text-xl font-bold">Possible historical records</h2>
          <p className="mt-1 text-sm text-slate-600">Check the set and house carefully. Matching names do not prove that a record belongs to you.</p>
          <ArchiveMatchResults records={records} />
        </section>
      )}
    </MemberPageLayout>
  )
}
