import Link from 'next/link'
import { ProfessionalShell, secondaryButton } from '@/components/professional/ui'
import { liveOpportunityWhere, requireViewer, visibleBusinessWhere } from '@/lib/professional'
import { opportunityTypeLabel } from '@/lib/professional-shared'
import { prisma } from '@/lib/prisma'

const cards = [
  { href: '/professional/people', title: 'Find Professionals', text: 'Search Old Boys by profession, skills and location.' },
  { href: '/businesses', title: 'Business Directory', text: 'Discover and support businesses run by Old Boys.' },
  { href: '/opportunities', title: 'Opportunities', text: 'Jobs, internships, partnerships and more.' },
  { href: '/professional/mentors', title: 'Find a Mentor', text: 'Connect with Old Boys who offered to mentor.' },
]

export default async function ProfessionalPage() {
  const viewer = await requireViewer('/professional')
  const [opportunities, businesses] = await Promise.all([
    prisma.opportunity.findMany({
      where: { schoolId: viewer.schoolId, ...liveOpportunityWhere() },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, title: true, type: true, organisation: true },
    }),
    prisma.business.findMany({
      where: visibleBusinessWhere(viewer.schoolId),
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { slug: true, name: true, shortDescription: true },
    }),
  ])
  return (
    <ProfessionalShell name={viewer.firstName} subtitle="Careers, businesses, opportunities and mentoring across the GCU Old Boys network." title="Professional Network">
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" href={card.href} key={card.href}>
            <h2 className="font-bold text-[#9C0621]">{card.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{card.text}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link className={secondaryButton} href="/professional/settings">My professional settings</Link>
        <Link className={secondaryButton} href="/businesses/new">Add a business</Link>
        <Link className={secondaryButton} href="/opportunities/new">Post an opportunity</Link>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="font-bold">Latest opportunities</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {opportunities.length === 0 && <li className="text-slate-500">Nothing posted yet.</li>}
            {opportunities.map((item) => (
              <li className="rounded-xl border border-slate-200 bg-white p-3" key={item.id}>
                <Link className="font-semibold text-[#9C0621] hover:underline" href={`/opportunities/${item.id}`}>{item.title}</Link>
                <p className="text-slate-500">{opportunityTypeLabel(item.type)}{item.organisation ? ` · ${item.organisation}` : ''}</p>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-bold">New businesses</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {businesses.length === 0 && <li className="text-slate-500">No businesses listed yet.</li>}
            {businesses.map((item) => (
              <li className="rounded-xl border border-slate-200 bg-white p-3" key={item.slug}>
                <Link className="font-semibold text-[#9C0621] hover:underline" href={`/businesses/${item.slug}`}>{item.name}</Link>
                <p className="line-clamp-2 text-slate-500">{item.shortDescription}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ProfessionalShell>
  )
}
