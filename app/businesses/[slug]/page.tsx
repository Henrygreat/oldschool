import Link from 'next/link'
import { notFound } from 'next/navigation'
import { currentModerator } from '@/lib/admin'
import { ContactButton, ListingReport } from '@/components/professional/listing-controls'
import { ProfessionalShell, secondaryButton } from '@/components/professional/ui'
import { liveOpportunityWhere, requireViewer } from '@/lib/professional'
import { businessRoleLabel, opportunityTypeLabel } from '@/lib/professional-shared'
import { prisma } from '@/lib/prisma'

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const viewer = await requireViewer(`/businesses/${slug}`)
  const business = await prisma.business.findFirst({
    where: { slug, schoolId: viewer.schoolId },
    include: {
      members: {
        orderBy: { createdAt: 'asc' },
        select: { role: true, user: { select: { id: true, firstName: true, middleName: true, surname: true, isActive: true } } },
      },
    },
  })
  if (!business) notFound()
  const membership = business.members.find((member) => member.user.id === viewer.id)
  const moderator = await currentModerator()
  if (business.status !== 'PUBLISHED' && !membership && !moderator) notFound()
  const isOwner = membership?.role === 'OWNER'
  const owner = business.members.find((member) => member.role === 'OWNER' && member.user.isActive)
  const opportunities = business.status === 'PUBLISHED'
    ? await prisma.opportunity.findMany({
        where: { businessId: business.id, schoolId: viewer.schoolId, ...liveOpportunityWhere() },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, type: true },
      })
    : []
  const nameOf = (user: { firstName: string; middleName: string | null; surname: string }) => [user.firstName, user.middleName, user.surname].filter(Boolean).join(' ')

  return (
    <ProfessionalShell name={viewer.firstName} subtitle={business.shortDescription} title={business.name}>
      {business.status !== 'PUBLISHED' && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {business.status === 'SUSPENDED' ? 'This business is suspended and hidden from members.' : 'Draft – only visible to the business team and moderators.'}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">{[business.industry, business.location, business.country, business.yearEstablished ? `Est. ${business.yearEstablished}` : null].filter(Boolean).join(' · ')}</p>
          {business.description && <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{business.description}</p>}
          {business.services.length > 0 && (
            <div>
              <h2 className="font-bold">Services</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {business.services.map((service) => <li className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700" key={service}>{service}</li>)}
              </ul>
            </div>
          )}
          {opportunities.length > 0 && (
            <div>
              <h2 className="font-bold">Opportunities</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {opportunities.map((item) => <li key={item.id}><Link className="font-semibold text-[#9C0621] hover:underline" href={`/opportunities/${item.id}`}>{item.title}</Link> <span className="text-slate-500">· {opportunityTypeLabel(item.type)}</span></li>)}
              </ul>
            </div>
          )}
        </section>
        <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-1 text-sm">
            {business.website && <p><a className="font-semibold text-[#9C0621] hover:underline" href={business.website} rel="noopener noreferrer nofollow" target="_blank">Website</a></p>}
            {business.linkedInUrl && <p><a className="font-semibold text-[#9C0621] hover:underline" href={business.linkedInUrl} rel="noopener noreferrer nofollow" target="_blank">LinkedIn</a></p>}
            {business.publicEmail && <p>{business.publicEmail}</p>}
            {business.publicPhone && <p>{business.publicPhone}</p>}
          </div>
          <div>
            <h2 className="text-sm font-bold">Team</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {business.members.filter((member) => member.user.isActive).map((member) => (
                <li key={member.user.id}><Link className="hover:text-[#9C0621] hover:underline" href={`/members/${member.user.id}`}>{nameOf(member.user)}</Link> <span className="text-slate-500">· {businessRoleLabel(member.role)}</span></li>
              ))}
            </ul>
          </div>
          {business.status === 'PUBLISHED' && owner && owner.user.id !== viewer.id && <ContactButton label="Contact owner" targetUserId={owner.user.id} />}
          {isOwner && <Link className={secondaryButton} href={`/businesses/${business.slug}/edit`}>Manage business</Link>}
          {!membership && business.status === 'PUBLISHED' && <ListingReport id={business.id} kind="business" />}
        </aside>
      </div>
    </ProfessionalShell>
  )
}
