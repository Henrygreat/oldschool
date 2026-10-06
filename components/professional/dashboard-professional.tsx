import Link from 'next/link'
import { liveOpportunityWhere, visibleBusinessWhere } from '@/lib/professional'
import { opportunityTypeLabel } from '@/lib/professional-shared'
import { prisma } from '@/lib/prisma'

export async function DashboardProfessional({ schoolId, userId }: { schoolId: string; userId: string }) {
  const [opportunities, businesses, mentors] = await Promise.all([
    prisma.opportunity.findMany({
      where: { schoolId, ...liveOpportunityWhere() },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, title: true, type: true },
    }),
    prisma.business.findMany({ where: visibleBusinessWhere(schoolId), orderBy: { createdAt: 'desc' }, take: 3, select: { slug: true, name: true } }),
    prisma.professionalProfile.count({ where: { schoolId, isListed: true, availableToMentor: true, userId: { not: userId }, user: { isActive: true } } }),
  ])
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-bold uppercase tracking-wider text-[#9C0621]">Careers &amp; business</p><h2 className="mt-1 text-xl font-bold">Professional network</h2></div>
        <Link className="text-sm font-bold text-[#9C0621] hover:underline" href="/professional">Explore →</Link>
      </div>
      <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
        <div>
          <h3 className="font-semibold">Latest opportunities</h3>
          <ul className="mt-2 space-y-1">
            {opportunities.length === 0 && <li className="text-slate-500">None yet.</li>}
            {opportunities.map((item) => <li key={item.id}><Link className="text-[#9C0621] hover:underline" href={`/opportunities/${item.id}`}>{item.title}</Link> <span className="text-slate-500">· {opportunityTypeLabel(item.type)}</span></li>)}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">New businesses</h3>
          <ul className="mt-2 space-y-1">
            {businesses.length === 0 && <li className="text-slate-500">None yet.</li>}
            {businesses.map((item) => <li key={item.slug}><Link className="text-[#9C0621] hover:underline" href={`/businesses/${item.slug}`}>{item.name}</Link></li>)}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">Mentoring</h3>
          <p className="mt-2 text-slate-600">{mentors} {mentors === 1 ? 'mentor is' : 'mentors are'} available. <Link className="font-semibold text-[#9C0621] hover:underline" href="/professional/mentors">Find a mentor</Link></p>
        </div>
      </div>
    </section>
  )
}
