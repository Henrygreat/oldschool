import { OpportunityForm } from '@/components/professional/opportunity-form'
import { Notice, ProfessionalShell } from '@/components/professional/ui'
import { createOpportunity } from '@/app/professional/actions'
import { requireViewer } from '@/lib/professional'
import { prisma } from '@/lib/prisma'

export default async function NewOpportunityPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const viewer = await requireViewer('/opportunities/new')
  const { error } = await searchParams
  const businesses = await prisma.business.findMany({
    where: { schoolId: viewer.schoolId, members: { some: { userId: viewer.id } } },
    orderBy: { name: 'asc' },
    take: 50,
    select: { id: true, name: true },
  })
  return (
    <ProfessionalShell name={viewer.firstName} title="Post an opportunity">
      <Notice error={error} />
      <OpportunityForm action={createOpportunity} businesses={businesses} isNew />
    </ProfessionalShell>
  )
}
