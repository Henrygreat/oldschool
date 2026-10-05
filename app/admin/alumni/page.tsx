import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Archive, FileSpreadsheet, HeartHandshake, UsersRound } from 'lucide-react'
import { AlumniClaimReviewActions, ArchiveAvailabilityButton } from '@/components/admin/alumni-admin-actions'
import { MemberPageLayout } from '@/components/members/member-nav'
import { currentSchoolAdministrator } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'records', label: 'Historical records' },
  { id: 'claims', label: 'Pending claims' },
  { id: 'imports', label: 'Import history' },
] as const

type View = (typeof tabs)[number]['id']

export default async function AlumniArchiveAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string; q?: string }>
}) {
  const admin = await currentSchoolAdministrator()
  if (!admin) notFound()
  const params = await searchParams
  const view: View = tabs.some((tab) => tab.id === params.view) ? params.view as View : 'overview'
  const page = params.page && /^[1-9]\d{0,3}$/.test(params.page) ? Number(params.page) : 1
  const search = params.q?.trim().slice(0, 100) ?? ''
  const schoolId = admin.schoolId

  const [totalRecords, claimedRecords, unclaimedRecords, memorialRecords, pendingClaims] = await Promise.all([
    prisma.alumniArchiveRecord.count({ where: { schoolId, archivedAt: null } }),
    prisma.alumniArchiveRecord.count({ where: { schoolId, archivedAt: null, claimedByUserId: { not: null } } }),
    prisma.alumniArchiveRecord.count({ where: { schoolId, archivedAt: null, claimedByUserId: null } }),
    prisma.alumniArchiveRecord.count({ where: { schoolId, archivedAt: null, status: 'DECEASED' } }),
    prisma.alumniProfileClaim.count({ where: { schoolId, status: 'PENDING' } }),
  ])

  const recordWhere = {
    schoolId,
    ...(view === 'records' ? {} : { archivedAt: null }),
    ...(search ? {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
  }

  const [records, recordCount, claims, imports] = await Promise.all([
    view === 'records'
      ? prisma.alumniArchiveRecord.findMany({
          where: recordWhere,
          orderBy: [{ setYear: 'desc' }, { fullName: 'asc' }],
          skip: (page - 1) * 25,
          take: 25,
          select: {
            id: true,
            fullName: true,
            setYear: true,
            house: true,
            status: true,
            email: true,
            phone: true,
            claimedByUserId: true,
            archivedAt: true,
          },
        })
      : Promise.resolve([]),
    view === 'records' ? prisma.alumniArchiveRecord.count({ where: recordWhere }) : Promise.resolve(0),
    view === 'claims'
      ? prisma.alumniProfileClaim.findMany({
          where: { schoolId, status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
          skip: (page - 1) * 20,
          take: 20,
          select: {
            id: true,
            claimantMessage: true,
            createdAt: true,
            archiveRecord: { select: { id: true, fullName: true, setYear: true, house: true, email: true, phone: true } },
            claimant: { select: { id: true, firstName: true, middleName: true, surname: true, email: true, alumniProfile: { select: { schoolAttendance: { take: 1, orderBy: { updatedAt: 'desc' }, select: { cohort: { select: { year: true } }, house: { select: { name: true } } } } } } } },
          },
        })
      : Promise.resolve([]),
    view === 'imports'
      ? prisma.alumniImportBatch.findMany({
          where: { schoolId },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            sourceFilename: true,
            totalRows: true,
            importedCount: true,
            skippedCount: true,
            duplicateCount: true,
            failedCount: true,
            createdAt: true,
            uploadedBy: { select: { firstName: true, surname: true } },
          },
        })
      : Promise.resolve([]),
  ])

  const iconClass = 'flex h-10 w-10 items-center justify-center rounded-xl bg-[#9C0621]/10 text-[#9C0621]'
  return (
    <MemberPageLayout name={`${admin.firstName} Admin`}>
      <section className="rounded-3xl bg-[#16070a] px-6 py-8 text-white sm:px-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/60">Administration</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">Alumni Archive</h1>
            <p className="mt-2 text-white/70">Manage historical records, imports, and profile claims.</p>
          </div>
          <Link className="rounded-xl bg-[#9C0621] px-4 py-3 text-sm font-bold text-white hover:bg-[#80051b]" href="/admin/alumni/import">Import alumni</Link>
        </div>
      </section>

      <section aria-label="Archive summary" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { title: 'Historical records', count: totalRecords, icon: Archive },
          { title: 'Claimed profiles', count: claimedRecords, icon: UsersRound },
          { title: 'Unclaimed records', count: unclaimedRecords, icon: UsersRound },
          { title: 'In memoriam', count: memorialRecords, icon: HeartHandshake },
          { title: 'Pending claims', count: pendingClaims, icon: FileSpreadsheet },
        ].map(({ title, count, icon: Icon }) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" key={title}>
            <span className={iconClass}><Icon className="h-5 w-5" /></span>
            <p className="mt-3 text-2xl font-bold">{count}</p>
            <p className="mt-1 text-xs font-semibold text-slate-600">{title}</p>
          </div>
        ))}
      </section>

      <nav aria-label="Archive administration" className="mt-7 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {tabs.map((tab) => (
          <Link className={`rounded-xl px-4 py-2 text-sm font-semibold ${view === tab.id ? 'bg-[#9C0621] text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`} href={`/admin/alumni?view=${tab.id}`} key={tab.id}>
            {tab.label}
            {tab.id === 'claims' ? ` (${pendingClaims})` : ''}
          </Link>
        ))}
      </nav>

      {view === 'overview' && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">Next steps</h2>
            <div className="mt-4 space-y-3">
              <Link className="block rounded-xl bg-slate-50 p-4 font-semibold hover:bg-slate-100" href="/admin/alumni/import">Upload and preview an alumni spreadsheet</Link>
              <Link className="block rounded-xl bg-slate-50 p-4 font-semibold hover:bg-slate-100" href="/admin/alumni?view=claims">Review pending profile claims ({pendingClaims})</Link>
              <Link className="block rounded-xl bg-slate-50 p-4 font-semibold hover:bg-slate-100" href="/admin/alumni?view=records">Search and edit historical records</Link>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">Privacy note</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Archive contact details, biographies, and remarks are available only in this administrator area. Public set and archive pages never expose email, phone, or raw remarks.</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">Import preview makes no archive changes. Records are written only after an administrator confirms the review.</p>
          </section>
        </div>
      )}

      {view === 'records' && (
        <section className="mt-6">
          <form className="mb-4 flex flex-wrap gap-2" action="/admin/alumni">
            <input name="view" type="hidden" value="records" />
            <input className="min-w-56 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm" defaultValue={search} maxLength={100} name="q" placeholder="Search name or admin-only email" />
            <button className="rounded-xl bg-[#9C0621] px-4 py-2.5 text-sm font-bold text-white" type="submit">Search records</button>
          </form>
          <div className="space-y-3">
            {records.map((record) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" key={record.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link className="font-bold text-slate-950 hover:text-[#9C0621]" href={`/admin/alumni/records/${record.id}`}>{record.fullName}</Link>
                    <p className="mt-1 text-sm text-slate-600">Set {record.setYear}{record.house ? ` · ${record.house} House` : ''} · {record.status === 'DECEASED' ? 'In Memoriam' : record.claimedByUserId ? 'Claimed' : 'Unclaimed'}</p>
                    <p className="mt-1 text-xs text-slate-500">{record.email ?? 'No email'} · {record.phone ?? 'No phone'}{record.archivedAt ? ' · Archived' : ''}</p>
                  </div>
                  <ArchiveAvailabilityButton archived={Boolean(record.archivedAt)} recordId={record.id} />
                </div>
              </article>
            ))}
            {!records.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No archive records match this search.</p>}
          </div>
          {recordCount > 25 && <div className="mt-5 flex justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <Link aria-disabled={page <= 1} className={page <= 1 ? 'pointer-events-none text-slate-300' : 'font-semibold text-[#9C0621]'} href={`/admin/alumni?view=records&page=${page - 1}&q=${encodeURIComponent(search)}`}>Previous</Link>
            <span>Page {page} of {Math.ceil(recordCount / 25)}</span>
            <Link aria-disabled={page >= Math.ceil(recordCount / 25)} className={page >= Math.ceil(recordCount / 25) ? 'pointer-events-none text-slate-300' : 'font-semibold text-[#9C0621]'} href={`/admin/alumni?view=records&page=${page + 1}&q=${encodeURIComponent(search)}`}>Next</Link>
          </div>}
        </section>
      )}

      {view === 'claims' && (
        <section className="mt-6 space-y-4">
          {claims.map((claim) => {
            const userAttendance = claim.claimant.alumniProfile?.schoolAttendance[0]
            return (
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={claim.id}>
                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Historical record</p>
                    <h2 className="mt-1 text-lg font-bold">{claim.archiveRecord.fullName}</h2>
                    <p className="mt-1 text-sm text-slate-600">Set {claim.archiveRecord.setYear}{claim.archiveRecord.house ? ` · ${claim.archiveRecord.house} House` : ''}</p>
                    <p className="mt-1 text-sm text-slate-600">Archive email: {claim.archiveRecord.email ?? 'Not recorded'} · Phone: {claim.archiveRecord.phone ?? 'Not recorded'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Claiming user</p>
                    <p className="mt-1 font-bold">{[claim.claimant.firstName, claim.claimant.middleName, claim.claimant.surname].filter(Boolean).join(' ')}</p>
                    <p className="mt-1 text-sm text-slate-600">{claim.claimant.email}</p>
                    <p className="mt-1 text-sm text-slate-600">Account set: {userAttendance?.cohort?.year ?? 'Not provided'} · House: {userAttendance?.house?.name ?? 'Not provided'}</p>
                    <p className="mt-1 text-xs text-slate-500">Claim submitted {claim.createdAt.toISOString().slice(0, 10)}</p>
                    {claim.claimantMessage && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{claim.claimantMessage}</p>}
                  </div>
                </div>
                <AlumniClaimReviewActions claimId={claim.id} />
              </article>
            )
          })}
          {!claims.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No profile claims are waiting for review.</p>}
        </section>
      )}

      {view === 'imports' && (
        <section className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Source file</th><th className="px-4 py-3">Uploaded by</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Rows</th><th className="px-4 py-3">Imported</th><th className="px-4 py-3">Skipped</th><th className="px-4 py-3">Duplicates</th><th className="px-4 py-3">Failed</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {imports.map((batch) => <tr key={batch.id}><td className="px-4 py-3 font-medium">{batch.sourceFilename}</td><td className="px-4 py-3">{batch.uploadedBy.firstName} {batch.uploadedBy.surname}</td><td className="px-4 py-3">{batch.createdAt.toISOString().slice(0, 10)}</td><td className="px-4 py-3">{batch.totalRows}</td><td className="px-4 py-3">{batch.importedCount}</td><td className="px-4 py-3">{batch.skippedCount}</td><td className="px-4 py-3">{batch.duplicateCount}</td><td className="px-4 py-3">{batch.failedCount}</td></tr>)}
            </tbody>
          </table>
          {!imports.length && <p className="p-8 text-center text-sm text-slate-600">No imports have been made yet.</p>}
        </section>
      )}
    </MemberPageLayout>
  )
}
