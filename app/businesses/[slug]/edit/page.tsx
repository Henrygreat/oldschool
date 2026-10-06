import { notFound } from 'next/navigation'
import { BusinessForm } from '@/components/professional/business-form'
import { Notice, ProfessionalShell, primaryButton, secondaryButton } from '@/components/professional/ui'
import { setBusinessStatus, updateBusiness } from '@/app/professional/actions'
import { isBusinessOwner, requireViewer } from '@/lib/professional'
import { prisma } from '@/lib/prisma'

export default async function EditBusinessPage({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ error?: string; saved?: string; created?: string }>
}) {
  const { slug } = await params
  const { error, saved, created } = await searchParams
  const viewer = await requireViewer(`/businesses/${slug}/edit`)
  const business = await prisma.business.findFirst({ where: { slug, schoolId: viewer.schoolId } })
  if (!business || !(await isBusinessOwner(business.id, viewer.id))) notFound()
  return (
    <ProfessionalShell name={viewer.firstName} title={`Manage ${business.name}`}>
      <Notice error={error} saved={Boolean(saved || created)} />
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <span className="text-sm font-semibold">Status: {business.status.toLowerCase()}</span>
        {business.status !== 'SUSPENDED' && (
          <form action={setBusinessStatus}>
            <input name="businessId" type="hidden" value={business.id} />
            <input name="status" type="hidden" value={business.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'} />
            <button className={business.status === 'PUBLISHED' ? secondaryButton : primaryButton} type="submit">
              {business.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
            </button>
          </form>
        )}
        <a className={secondaryButton} href={`/businesses/${business.slug}`}>View listing</a>
      </div>
      <BusinessForm action={updateBusiness} submitLabel="Save changes" values={business} />
    </ProfessionalShell>
  )
}
