import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MemberPageLayout } from '@/components/members/member-nav'
import { activeCommunityUser } from '@/lib/community'
import { prisma } from '@/lib/prisma'

export default async function ChaptersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const member = await activeCommunityUser()
  if (!member) redirect('/auth/login?callbackUrl=%2Fchapters')

  const params = await searchParams
  const query = params.q?.trim().slice(0, 80) ?? ''
  const [chapters, counts] = await Promise.all([
    prisma.chapter.findMany({
      where: {
        schoolId: member.schoolId,
        isActive: true,
        ...(query ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { country: { contains: query, mode: 'insensitive' } },
            { region: { contains: query, mode: 'insensitive' } },
            { city: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: [{ country: 'asc' }, { name: 'asc' }],
      take: 100,
      select: {
        id: true,
        name: true,
        country: true,
        region: true,
        city: true,
        description: true,
      },
    }),
    prisma.chapterMember.groupBy({
      by: ['chapterId'],
      where: {
        chapter: { is: { schoolId: member.schoolId, isActive: true } },
        alumniProfile: { is: { user: { is: { isActive: true } } } },
      },
      _count: { _all: true },
    }),
  ])
  const memberCounts = new Map(counts.map((entry) => [entry.chapterId, entry._count._all]))

  return (
    <MemberPageLayout name={member.firstName}>
      <section className="rounded-3xl bg-[#16070a] px-6 py-8 text-white sm:px-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/60">GCUOBA communities</p>
        <h1 className="mt-2 text-4xl font-bold">Browse Chapters</h1>
        <p className="mt-3 max-w-2xl text-white/75">Explore local Chapter communities and request membership directly. Living location does not automatically enrol you.</p>
      </section>
      <form action="/chapters" className="mt-6 flex gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <label className="sr-only" htmlFor="chapter-filter">Search Chapters</label>
        <input className="min-w-0 flex-1 rounded-xl bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#9C0621]/20" defaultValue={query} id="chapter-filter" maxLength={80} name="q" placeholder="Search by Chapter or location" />
        <button className="rounded-xl bg-[#9C0621] px-5 py-3 text-sm font-bold text-white hover:bg-[#80051b]" type="submit">Search</button>
      </form>
      {chapters.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter) => (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={chapter.id}>
              <p className="text-sm font-semibold uppercase tracking-wider text-[#9C0621]">Chapter</p>
              <h2 className="mt-2 text-xl font-bold">{chapter.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{[chapter.city, chapter.region, chapter.country].filter(Boolean).join(', ') || 'Location not listed'}</p>
              {chapter.description && <p className="mt-3 line-clamp-3 text-sm text-slate-600">{chapter.description}</p>}
              <p className="mt-4 text-sm font-semibold text-slate-700">{memberCounts.get(chapter.id) ?? 0} registered members</p>
              <Link className="mt-4 inline-flex rounded-xl bg-[#9C0621] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#80051b]" href={`/chapters/${encodeURIComponent(chapter.id)}`}>View Chapter</Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">No Chapters match that search yet.</p>
      )}
      {chapters.length === 100 && <p className="mt-4 text-center text-xs text-slate-500">Showing the first 100 matching Chapters. Refine your search to find a specific Chapter.</p>}
    </MemberPageLayout>
  )
}
