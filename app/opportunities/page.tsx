import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { Empty, Pager, ProfessionalShell, inputClass, primaryButton, secondaryButton } from '@/components/professional/ui'
import { isOpportunityExpired, liveOpportunityWhere, one, parsePage, requireViewer } from '@/lib/professional'
import { PROFESSIONAL_PAGE_SIZE, opportunityTypeLabel, opportunityTypeOptions, workModeLabel, workModeOptions } from '@/lib/professional-shared'
import { prisma } from '@/lib/prisma'

type Params = Record<string, string | string[] | undefined>

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const viewer = await requireViewer('/opportunities')
  const params = await searchParams
  const q = one(params.q)
  const location = one(params.location)
  const type = opportunityTypeOptions.find((option) => option.value === params.type)?.value
  const workMode = workModeOptions.find((option) => option.value === params.workMode)?.value
  const mine = params.mine === '1'
  const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const })
  const where: Prisma.OpportunityWhereInput = {
    schoolId: viewer.schoolId,
    ...(mine ? { postedByUserId: viewer.id } : liveOpportunityWhere()),
    AND: [
      ...(q ? [{ OR: [{ title: contains(q) }, { organisation: contains(q) }, { description: contains(q) }] }] : []),
      ...(location ? [{ OR: [{ location: contains(location) }, { country: contains(location) }] }] : []),
      ...(type ? [{ type }] : []),
      ...(workMode ? [{ workMode }] : []),
    ],
  }
  const total = await prisma.opportunity.count({ where })
  const pages = Math.max(1, Math.ceil(total / PROFESSIONAL_PAGE_SIZE))
  const page = Math.min(parsePage(params.page), pages)
  const items = await prisma.opportunity.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    skip: (page - 1) * PROFESSIONAL_PAGE_SIZE,
    take: PROFESSIONAL_PAGE_SIZE,
    select: {
      id: true, title: true, type: true, organisation: true, location: true, country: true, workMode: true,
      status: true, expiresAt: true, closingDate: true,
      postedBy: { select: { firstName: true, surname: true } },
    },
  })
  const hrefFor = (target: number) => {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries({ q, location, type, workMode, mine: mine ? '1' : undefined })) if (value) query.set(key, value)
    if (target > 1) query.set('page', String(target))
    const text = query.toString()
    return text ? `/opportunities?${text}` : '/opportunities'
  }
  return (
    <ProfessionalShell name={viewer.firstName} subtitle="Jobs, internships, partnerships and more, shared by Old Boys." title="Opportunities">
      <form action="/opportunities" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-5">
        <input className={inputClass} defaultValue={q} maxLength={80} name="q" placeholder="Keyword" />
        <input className={inputClass} defaultValue={location} maxLength={80} name="location" placeholder="Location" />
        <select className={inputClass} defaultValue={type ?? ''} name="type">
          <option value="">Any type</option>
          {opportunityTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select className={inputClass} defaultValue={workMode ?? ''} name="workMode">
          <option value="">Any work mode</option>
          {workModeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button className={primaryButton} type="submit">Search</button>
        {mine && <input name="mine" type="hidden" value="1" />}
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">{total} {mine ? 'of your listings' : 'open opportunities'}</p>
        <div className="flex gap-2">
          <Link className={secondaryButton} href={mine ? '/opportunities' : '/opportunities?mine=1'}>{mine ? 'All opportunities' : 'My listings'}</Link>
          <Link className={primaryButton} href="/opportunities/new">Post an opportunity</Link>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 && <Empty>No opportunities to show yet.</Empty>}
        {items.map((item) => (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={item.id}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold"><Link className="hover:text-[#9C0621]" href={`/opportunities/${item.id}`}>{item.title}</Link></h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{opportunityTypeLabel(item.type)}</span>
              {isOpportunityExpired(item) && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">Expired</span>}
              {item.status !== 'PUBLISHED' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{item.status.toLowerCase()}</span>}
            </div>
            <p className="mt-1 text-sm text-slate-600">{[item.organisation, item.location, item.country, workModeLabel(item.workMode)].filter(Boolean).join(' · ')}</p>
            <p className="mt-1 text-xs text-slate-400">Posted by {item.postedBy.firstName} {item.postedBy.surname}</p>
          </article>
        ))}
      </div>
      <Pager hrefFor={hrefFor} page={page} pages={pages} />
    </ProfessionalShell>
  )
}
