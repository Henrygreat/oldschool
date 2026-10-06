import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Archive, HeartHandshake } from 'lucide-react'
import { ClaimArchiveRecord } from '@/components/archive/claim-archive-record'
import { MemberPageLayout } from '@/components/members/member-nav'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function ArchiveRecordPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [session, record] = await Promise.all([
    auth(),
    prisma.alumniArchiveRecord.findFirst({
      where: { id, archivedAt: null },
      select: {
        id: true,
        schoolId: true,
        fullName: true,
        title: true,
        setYear: true,
        house: true,
        profession: true,
        status: true,
        claimedByUserId: true,
      },
    }),
  ])
  if (!record) notFound()
  if (session?.user?.id && session.user.schoolId !== record.schoolId) notFound()

  const loggedInMember = session?.user?.id && session.user.schoolId === record.schoolId
    ? await prisma.user.findFirst({
        where: { id: session.user.id, schoolId: record.schoolId, isActive: true },
        select: { id: true, firstName: true },
      })
    : null
  const latestClaim = loggedInMember
    ? await prisma.alumniProfileClaim.findFirst({
        where: {
          archiveRecordId: record.id,
          claimantUserId: loggedInMember.id,
        },
        orderBy: { updatedAt: 'desc' },
        select: { status: true },
      })
    : null
  const hasOtherPendingClaim = loggedInMember && !record.claimedByUserId
    ? Boolean(await prisma.alumniProfileClaim.findFirst({
        where: {
          archiveRecordId: record.id,
          schoolId: record.schoolId,
          claimantUserId: { not: loggedInMember.id },
          status: 'PENDING',
        },
        select: { id: true },
      }))
    : false

  return (
    <MemberPageLayout name={loggedInMember?.firstName ?? ''}>
      <Link className="text-sm font-semibold text-[#9C0621] hover:underline" href={`/sets/${record.setYear}`}>← Back to Set of {record.setYear}</Link>
      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#9C0621]/10 text-[#9C0621]">
            {record.status === 'DECEASED' ? <HeartHandshake className="h-6 w-6" /> : <Archive className="h-6 w-6" />}
          </span>
          <div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${record.status === 'DECEASED' ? 'bg-slate-100 text-slate-600' : record.claimedByUserId ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
              {record.status === 'DECEASED' ? 'In Memoriam' : record.claimedByUserId ? 'Registered Member' : 'Historical Record'}
            </span>
            <h1 className="mt-3 text-3xl font-bold">{[record.title, record.fullName].filter(Boolean).join(' ')}</h1>
            <p className="mt-2 font-semibold text-[#9C0621]">Set of {record.setYear}</p>
          </div>
        </div>
        <dl className="mt-7 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
          {record.house && <div><dt className="text-sm text-slate-500">House</dt><dd className="mt-1 font-semibold">{record.house}</dd></div>}
          {record.profession && <div><dt className="text-sm text-slate-500">Profession</dt><dd className="mt-1 font-semibold">{record.profession}</dd></div>}
        </dl>
        {record.claimedByUserId && (
          <div className="mt-6">
            {record.claimedByUserId === loggedInMember?.id && <p className="mb-3 text-sm font-semibold text-emerald-700">Claim approved. This historical record is linked to your member account.</p>}
            <Link className="inline-flex rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-[#9C0621] hover:text-[#9C0621]" href={`/members/${record.claimedByUserId}`}>View registered member profile</Link>
          </div>
        )}
      </section>

      {record.status === 'LIVING' && !record.claimedByUserId && (
        <div className="mt-6">
          <ClaimArchiveRecord
            archiveRecordId={record.id}
            claimStatus={latestClaim?.status ?? null}
            hasOtherPendingClaim={hasOtherPendingClaim}
            loggedIn={Boolean(loggedInMember)}
          />
        </div>
      )}
      <p className="mt-6 text-xs leading-5 text-slate-500">This historical entry does not display imported contact details, biographies, or remarks.</p>
    </MemberPageLayout>
  )
}
