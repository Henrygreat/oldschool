import { MemberCard } from '@/components/members/member-card'
import { Empty, Pager, ProfessionalShell, inputClass, primaryButton, secondaryButton } from '@/components/professional/ui'
import { one, parsePage, requireViewer } from '@/lib/professional'
import { searchProfessionals, type ProfessionalFilters } from '@/lib/professional-search'
import { prisma } from '@/lib/prisma'
import { PROFESSIONAL_PAGE_SIZE } from '@/lib/professional-shared'

type Params = Record<string, string | string[] | undefined>

export async function PeopleView({ basePath, mentorsOnly, params, title, subtitle }: {
  basePath: string
  mentorsOnly: boolean
  params: Params
  title: string
  subtitle: string
}) {
  const viewer = await requireViewer(basePath)
  const setYearText = one(params.setYear, 4)
  const setYear = setYearText && /^\d{4}$/.test(setYearText) ? Number(setYearText) : undefined
  const filters: ProfessionalFilters = {
    q: one(params.q),
    profession: one(params.profession),
    industry: one(params.industry),
    skill: one(params.skill),
    company: one(params.company),
    jobTitle: one(params.jobTitle),
    location: one(params.location),
    setYear,
    chapterId: one(params.chapterId, 64),
    mentor: params.mentor === '1',
    openToWork: params.openToWork === '1',
    page: parsePage(params.page),
  }
  const [result, chapters] = await Promise.all([
    searchProfessionals(viewer.schoolId, viewer.id, filters, mentorsOnly),
    prisma.chapter.findMany({
      where: { schoolId: viewer.schoolId, isActive: true },
      orderBy: { name: 'asc' },
      take: 100,
      select: { id: true, name: true },
    }),
  ])

  function hrefFor(page: number) {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value && key !== 'page') query.set(key, value)
    }
    if (page > 1) query.set('page', String(page))
    const text = query.toString()
    return text ? `${basePath}?${text}` : basePath
  }

  const text = (name: string, label: string, value?: string) => (
    <label className="block text-sm font-semibold text-slate-700">{label}
      <input className={inputClass} defaultValue={value ?? ''} maxLength={80} name={name} />
    </label>
  )

  return (
    <ProfessionalShell name={viewer.firstName} subtitle={subtitle} title={title}>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form action={basePath} className="space-y-3">
            {text('q', 'Name or keyword', filters.q)}
            {text('profession', 'Profession', filters.profession)}
            {text('industry', 'Industry', filters.industry)}
            {text('skill', 'Skill / expertise', filters.skill)}
            {text('company', 'Company', filters.company)}
            {text('jobTitle', 'Job title', filters.jobTitle)}
            {text('location', 'City or country', filters.location)}
            <label className="block text-sm font-semibold text-slate-700">Set / year
              <input className={inputClass} defaultValue={setYearText ?? ''} inputMode="numeric" maxLength={4} name="setYear" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">Chapter
              <select className={inputClass} defaultValue={filters.chapterId ?? ''} name="chapterId">
                <option value="">Any chapter</option>
                {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
              </select>
            </label>
            {!mentorsOnly && (
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input defaultChecked={filters.mentor} name="mentor" type="checkbox" value="1" /> Available to mentor
              </label>
            )}
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input defaultChecked={filters.openToWork} name="openToWork" type="checkbox" value="1" /> Open to opportunities
            </label>
            <div className="flex gap-2">
              <button className={primaryButton} type="submit">Search</button>
              <a className={secondaryButton} href={basePath}>Reset</a>
            </div>
          </form>
        </aside>
        <section>
          <p className="mb-4 text-sm text-slate-600">{result.total} {result.total === 1 ? 'member' : 'members'} found</p>
          {result.members.length === 0 ? (
            <Empty>No members match yet. Members appear here when they opt in from their professional settings.</Empty>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {result.members.map((member) => <MemberCard key={member.id} member={member} />)}
            </div>
          )}
          <Pager hrefFor={hrefFor} page={result.page} pages={Math.max(1, Math.ceil(result.total / PROFESSIONAL_PAGE_SIZE))} />
        </section>
      </div>
    </ProfessionalShell>
  )
}
