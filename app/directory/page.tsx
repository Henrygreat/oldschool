import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import { MemberCard } from '@/components/members/member-card'
import { MemberPageLayout } from '@/components/members/member-nav'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/auth'
import { parseDirectoryFilters, searchDirectory } from '@/lib/directory'

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15'

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) redirect('/auth/login?callbackUrl=%2Fdirectory')

  const rawParams = await searchParams
  const filters = parseDirectoryFilters(rawParams)
  const result = await searchDirectory(session.user.schoolId, session.user.id, filters)
  const memberName = session.user.name?.split(' ')[0] || 'Member'

  function pageHref(page: number) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(rawParams)) {
      if (typeof value === 'string' && value) params.set(key, value)
    }
    if (page > 1) params.set('page', String(page))
    else params.delete('page')
    const query = params.toString()
    return query ? `/directory?${query}` : '/directory'
  }

  return (
    <MemberPageLayout name={memberName}>
      <section className="rounded-3xl bg-[#16070a] px-6 py-8 text-white sm:px-10 sm:py-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/60">Find your schoolmates</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">GCUOBA Directory</h1>
        <p className="mt-3 max-w-2xl text-white/70">Find Old Boys by name, Set, school years, location or profession. Your filters work together.</p>
        <form action="/directory" className="mt-7 flex flex-col gap-2 rounded-2xl bg-white p-2 sm:flex-row">
          <label className="flex flex-1 items-center gap-3 rounded-xl bg-slate-50 px-4">
            <Search className="h-5 w-5 shrink-0 text-[#9C0621]" />
            <span className="sr-only">Search name, nickname, profession or company</span>
            <input className="min-w-0 flex-1 bg-transparent py-3 text-slate-900 outline-none placeholder:text-slate-400" defaultValue={filters.q} maxLength={80} name="q" placeholder="Name, nickname, profession or company" />
          </label>
          <Button className="h-12 bg-[#9C0621] px-6 text-white hover:bg-[#80051b]" type="submit">Search Old Boys</Button>
        </form>
      </section>

      <div className="mt-7 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 font-bold"><SlidersHorizontal className="h-4 w-4 text-[#9C0621]" /> Refine results</div>
          <form action="/directory" className="mt-5 space-y-4">
            {filters.q && <input name="q" type="hidden" value={filters.q} />}
            <label className="block text-sm font-semibold text-slate-700">Set / year
              <select className={`${inputClass} mt-1.5`} defaultValue={filters.setYear?.toString() ?? ''} name="setYear">
                <option value="">Any Set</option>
                {result.cohorts.map((cohort) => <option key={cohort.year} value={cohort.year}>{cohort.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold text-slate-700">Entry year<input className={`${inputClass} mt-1.5`} defaultValue={filters.entryYear?.toString() ?? ''} max={new Date().getFullYear()} min="1900" name="entryYear" type="number" /></label>
              <label className="block text-sm font-semibold text-slate-700">Leaving year<input className={`${inputClass} mt-1.5`} defaultValue={filters.leavingYear?.toString() ?? ''} max={new Date().getFullYear()} min="1900" name="leavingYear" type="number" /></label>
            </div>
            <label className="block text-sm font-semibold text-slate-700">House
              <select className={`${inputClass} mt-1.5`} defaultValue={filters.house} name="house">
                <option value="">Any house</option>
                {result.houses.map((house) => <option key={house.id} value={house.name}>{house.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">Country<input className={`${inputClass} mt-1.5`} defaultValue={filters.country} maxLength={80} name="country" /></label>
            <label className="block text-sm font-semibold text-slate-700">City<input className={`${inputClass} mt-1.5`} defaultValue={filters.city} maxLength={80} name="city" /></label>
            <label className="block text-sm font-semibold text-slate-700">Profession<input className={`${inputClass} mt-1.5`} defaultValue={filters.profession} maxLength={80} name="profession" /></label>
            <label className="block text-sm font-semibold text-slate-700">Industry<input className={`${inputClass} mt-1.5`} defaultValue={filters.industry} maxLength={80} name="industry" /></label>
            <Button className="w-full bg-[#9C0621] text-white hover:bg-[#80051b]" type="submit">Apply filters</Button>
            <Link className="block text-center text-sm font-semibold text-slate-500 hover:text-[#9C0621]" href="/directory">Clear filters</Link>
          </form>
        </aside>

        <section aria-live="polite">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-xl font-bold">Old Boys</h2><p className="mt-1 text-sm text-slate-600">{result.total} {result.total === 1 ? 'directory entry' : 'directory entries'} found</p></div>
            {filters.invalid && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">One or more year or page filters were invalid and have been ignored.</p>}
          </div>
          {result.members.length || result.archiveRecords.length ? (
            result.members.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.members.map((member) => <MemberCard key={member.id} member={member} />)}
              </div>
            ) : null
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#9C0621]/10 text-[#9C0621]"><Search className="h-5 w-5" /></div>
              <h3 className="mt-4 text-lg font-bold">No Old Boys found</h3>
              <p className="mt-2 text-sm text-slate-600">We couldn’t find any Old Boys matching those filters.</p>
              <Link className="mt-4 inline-block font-semibold text-[#9C0621] hover:underline" href="/directory">Clear your search</Link>
            </div>
          )}
          {result.pages > 1 && (
            <nav aria-label="Directory pagination" className="mt-7 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
              <Link aria-disabled={result.page <= 1} className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold ${result.page <= 1 ? 'pointer-events-none text-slate-300' : 'text-slate-700 hover:bg-slate-50'}`} href={pageHref(result.page - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Link>
              <span className="text-sm text-slate-600">Page {result.page} of {result.pages}</span>
              <Link aria-disabled={result.page >= result.pages} className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold ${result.page >= result.pages ? 'pointer-events-none text-slate-300' : 'text-slate-700 hover:bg-slate-50'}`} href={pageHref(result.page + 1)}>Next <ChevronRight className="h-4 w-4" /></Link>
            </nav>
          )}
        </section>
      </div>
      {result.archiveRecords.length > 0 && (
        <section className="mt-10" aria-label="Historical alumni archive results">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-[#9C0621]">From the archive</p>
              <h2 className="mt-1 text-2xl font-bold">Historical alumni records</h2>
              <p className="mt-1 text-sm text-slate-600">These entries are not necessarily registered members. Archive contact details and remarks are not shown.</p>
            </div>
            {filters.setYear !== null && <Link className="text-sm font-bold text-[#9C0621] hover:underline" href={`/sets/${filters.setYear}`}>Explore Set of {filters.setYear}</Link>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.archiveRecords.map((member) => <MemberCard key={member.id} member={member} />)}
          </div>
        </section>
      )}
    </MemberPageLayout>
  )
}
