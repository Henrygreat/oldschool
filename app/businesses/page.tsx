import Link from 'next/link'
import { Empty, Pager, ProfessionalShell, inputClass, primaryButton, secondaryButton } from '@/components/professional/ui'
import { one, parsePage, requireViewer, visibleBusinessWhere } from '@/lib/professional'
import { PROFESSIONAL_PAGE_SIZE } from '@/lib/professional-shared'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

type Params = Record<string, string | string[] | undefined>

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const viewer = await requireViewer('/businesses')
  const params = await searchParams
  const q = one(params.q)
  const industry = one(params.industry)
  const location = one(params.location)
  const country = one(params.country)
  const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const })
  const where: Prisma.BusinessWhereInput = {
    ...visibleBusinessWhere(viewer.schoolId),
    AND: [
      ...(q ? [{ OR: [{ name: contains(q) }, { shortDescription: contains(q) }, { services: { has: q } }, { services: { has: q.toLowerCase() } }] }] : []),
      ...(industry ? [{ industry: contains(industry) }] : []),
      ...(location ? [{ location: contains(location) }] : []),
      ...(country ? [{ country: contains(country) }] : []),
    ],
  }
  const total = await prisma.business.count({ where })
  const pages = Math.max(1, Math.ceil(total / PROFESSIONAL_PAGE_SIZE))
  const page = Math.min(parsePage(params.page), pages)
  const [businesses, mine] = await Promise.all([
    prisma.business.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * PROFESSIONAL_PAGE_SIZE,
      take: PROFESSIONAL_PAGE_SIZE,
      select: { slug: true, name: true, shortDescription: true, industry: true, location: true, country: true },
    }),
    prisma.business.findMany({
      where: { schoolId: viewer.schoolId, members: { some: { userId: viewer.id, role: 'OWNER' } } },
      orderBy: { name: 'asc' },
      take: 20,
      select: { slug: true, name: true, status: true },
    }),
  ])
  const hrefFor = (target: number) => {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries({ q, industry, location, country })) if (value) query.set(key, value)
    if (target > 1) query.set('page', String(target))
    const text = query.toString()
    return text ? `/businesses?${text}` : '/businesses'
  }
  return (
    <ProfessionalShell name={viewer.firstName} subtitle="Businesses founded, owned or run by Old Boys." title="Business directory">
      <form action="/businesses" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-5">
        <input className={inputClass} defaultValue={q} maxLength={80} name="q" placeholder="Name or service" />
        <input className={inputClass} defaultValue={industry} maxLength={80} name="industry" placeholder="Industry" />
        <input className={inputClass} defaultValue={location} maxLength={80} name="location" placeholder="City" />
        <input className={inputClass} defaultValue={country} maxLength={80} name="country" placeholder="Country" />
        <button className={primaryButton} type="submit">Search</button>
      </form>
      {mine.length > 0 && (
        <p className="mt-4 text-sm text-slate-600">
          Your businesses:{' '}
          {mine.map((item) => (
            <Link className="mr-2 font-semibold text-[#9C0621] hover:underline" href={`/businesses/${item.slug}/edit`} key={item.slug}>{item.name} ({item.status.toLowerCase()})</Link>
          ))}
        </p>
      )}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-slate-600">{total} {total === 1 ? 'business' : 'businesses'}</p>
        <Link className={secondaryButton} href="/businesses/new">Add a business</Link>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {businesses.length === 0 && <div className="sm:col-span-2 xl:col-span-3"><Empty>No businesses match. Be the first to add yours.</Empty></div>}
        {businesses.map((item) => (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={item.slug}>
            <h2 className="font-bold"><Link className="hover:text-[#9C0621]" href={`/businesses/${item.slug}`}>{item.name}</Link></h2>
            <p className="mt-1 line-clamp-3 text-sm text-slate-600">{item.shortDescription}</p>
            <p className="mt-3 text-xs text-slate-500">{[item.industry, item.location, item.country].filter(Boolean).join(' · ')}</p>
          </article>
        ))}
      </div>
      <Pager hrefFor={hrefFor} page={page} pages={pages} />
    </ProfessionalShell>
  )
}
