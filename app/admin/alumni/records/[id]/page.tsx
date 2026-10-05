import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlumniArchiveRecordForm } from '@/components/admin/alumni-record-form'
import { ArchiveAvailabilityButton } from '@/components/admin/alumni-admin-actions'
import { MemberPageLayout } from '@/components/members/member-nav'
import { currentSchoolAdministrator } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export default async function AlumniArchiveRecordAdminPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const admin = await currentSchoolAdministrator()
  if (!admin) notFound()
  const { id } = await params
  const record = await prisma.alumniArchiveRecord.findFirst({
    where: { id, schoolId: admin.schoolId },
    select: {
      id: true,
      fullName: true,
      firstName: true,
      middleName: true,
      surname: true,
      title: true,
      setYear: true,
      house: true,
      profession: true,
      status: true,
      email: true,
      phone: true,
      remarks: true,
      biography: true,
      archivedAt: true,
      claimedByUser: { select: { firstName: true, surname: true, email: true } },
      importBatch: { select: { sourceFilename: true, createdAt: true } },
    },
  })
  if (!record) notFound()

  return (
    <MemberPageLayout name={`${admin.firstName} Admin`}>
      <Link className="text-sm font-semibold text-[#9C0621] hover:underline" href="/admin/alumni?view=records">← Back to archive records</Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-[#9C0621]">Administrator-only record</p>
          <h1 className="mt-1 text-3xl font-bold">{record.fullName}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {record.importBatch ? `Imported from ${record.importBatch.sourceFilename} on ${record.importBatch.createdAt.toISOString().slice(0, 10)}` : 'Manually maintained archive record'}
            {record.claimedByUser ? ` · Claimed by ${record.claimedByUser.firstName} ${record.claimedByUser.surname} (${record.claimedByUser.email})` : ''}
          </p>
        </div>
        <ArchiveAvailabilityButton archived={Boolean(record.archivedAt)} recordId={record.id} />
      </div>
      <AlumniArchiveRecordForm record={record} />
    </MemberPageLayout>
  )
}
