import Link from 'next/link'
import { notFound } from 'next/navigation'
import { currentModerator } from '@/lib/admin'
import { ContactButton, ListingReport } from '@/components/professional/listing-controls'
import { Notice, ProfessionalShell, primaryButton, secondaryButton } from '@/components/professional/ui'
import { setOpportunityStatus } from '@/app/professional/actions'
import { isOpportunityExpired, requireViewer } from '@/lib/professional'
import { opportunityTypeLabel, workModeLabel } from '@/lib/professional-shared'
import { prisma } from '@/lib/prisma'

export default async function OpportunityPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams
  const viewer = await requireViewer(`/opportunities/${id}`)
  const item = await prisma.opportunity.findFirst({
    where: { id, schoolId: viewer.schoolId },
    include: {
      postedBy: { select: { id: true, firstName: true, middleName: true, surname: true, isActive: true } },
      business: { select: { slug: true, name: true, status: true } },
    },
  })
  if (!item) notFound()
  const isPoster = item.postedByUserId === viewer.id
  const moderator = await currentModerator()
  if (!isPoster && !moderator && (item.status === 'DRAFT' || item.status === 'SUSPENDED')) notFound()
  const expired = isOpportunityExpired(item)
  const poster = [item.postedBy.firstName, item.postedBy.middleName, item.postedBy.surname].filter(Boolean).join(' ')
  const canAct = !isPoster && !expired && item.status === 'PUBLISHED' && item.postedBy.isActive

  return (
    <ProfessionalShell name={viewer.firstName} subtitle={[opportunityTypeLabel(item.type), item.organisation].filter(Boolean).join(' · ')} title={item.title}>
      <Notice error={error} />
      {(expired || item.status !== 'PUBLISHED') && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {expired ? 'This opportunity has expired.' : item.status === 'CLOSED' ? 'This opportunity is closed.' : item.status === 'SUSPENDED' ? 'Suspended by a moderator.' : 'Draft – not visible to others.'}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">{[item.location, item.country, workModeLabel(item.workMode), item.employmentType].filter(Boolean).join(' · ')}</p>
          <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{item.description}</p>
          {item.closingDate && <p className="mt-4 text-sm text-slate-500">Closing date: {item.closingDate.toLocaleDateString()}</p>}
        </section>
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm">Posted by <Link className="font-semibold text-[#9C0621] hover:underline" href={`/members/${item.postedBy.id}`}>{poster}</Link></p>
          {item.business && item.business.status === 'PUBLISHED' && <p className="text-sm">Business: <Link className="font-semibold text-[#9C0621] hover:underline" href={`/businesses/${item.business.slug}`}>{item.business.name}</Link></p>}
          {canAct && item.applicationUrl && <a className={primaryButton} href={item.applicationUrl} rel="noopener noreferrer nofollow" target="_blank">Apply</a>}
          {canAct && <ContactButton label="Message poster" targetUserId={item.postedBy.id} />}
          {canAct && <ListingReport id={item.id} kind="opportunity" />}
          {isPoster && (
            <div className="space-y-2">
              {item.status !== 'SUSPENDED' && <Link className={secondaryButton} href={`/opportunities/${item.id}/edit`}>Edit</Link>}
              {item.status !== 'SUSPENDED' && (
                <form action={setOpportunityStatus}>
                  <input name="opportunityId" type="hidden" value={item.id} />
                  <input name="status" type="hidden" value={item.status === 'PUBLISHED' && !expired ? 'CLOSED' : 'PUBLISHED'} />
                  <button className={secondaryButton} type="submit">{item.status === 'PUBLISHED' && !expired ? 'Close opportunity' : 'Publish again'}</button>
                </form>
              )}
            </div>
          )}
        </aside>
      </div>
    </ProfessionalShell>
  )
}
