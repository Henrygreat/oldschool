import { BusinessForm } from '@/components/professional/business-form'
import { Notice, ProfessionalShell } from '@/components/professional/ui'
import { createBusiness } from '@/app/professional/actions'
import { requireViewer } from '@/lib/professional'

export default async function NewBusinessPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const viewer = await requireViewer('/businesses/new')
  const { error } = await searchParams
  return (
    <ProfessionalShell name={viewer.firstName} subtitle="Your business is saved as a draft. Publish it when you are ready." title="Add a business">
      <Notice error={error} />
      <BusinessForm action={createBusiness} submitLabel="Create business" />
    </ProfessionalShell>
  )
}
