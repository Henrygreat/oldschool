import { notFound } from 'next/navigation'
import { AlumniImportWizard } from '@/components/admin/alumni-import-wizard'
import { MemberPageLayout } from '@/components/members/member-nav'
import { currentSchoolAdministrator } from '@/lib/admin'

export default async function AlumniArchiveImportPage() {
  const admin = await currentSchoolAdministrator()
  if (!admin) notFound()
  return (
    <MemberPageLayout name={`${admin.firstName} Admin`}>
      <AlumniImportWizard />
    </MemberPageLayout>
  )
}
