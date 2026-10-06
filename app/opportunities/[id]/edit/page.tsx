import { notFound } from 'next/navigation'
import { OpportunityForm } from '@/components/professional/opportunity-form'
import { Notice, ProfessionalShell } from '@/components/professional/ui'
import { updateOpportunity } from '@/app/professional/actions'
import { requireViewer } from '@/lib/professional'
import { prisma } from '@/lib/prisma'

export default async function EditOpportunityPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams
  const viewer = await requireViewer(`/opportunities/${id}/edit`)
  const [opportunity, businesses] = await Promise.all([
    prisma.opportunity.findFirst({ where: { id, schoolId: viewer.schoolId, postedByUserId: viewer.id } }),
    prisma.business.findMany({
      where: { schoolId: viewer.schoolId, members: { some: { userId: viewer.id } } },
      orderBy: { name: 'asc' },
      take: 50,
      select: { id: true, name: true },
    }),
  ])
  if (!opportunity || opportunity.status === 'SUSPENDED') notFound()
  return (
    <ProfessionalShell name={viewer.firstName} title="Edit opportunity">
      <Notice error={error} />
      <OpportunityForm action={updateOpportunity} businesses={businesses} isNew={false} values={opportunity} />
    </ProfessionalShell>
  )
}
