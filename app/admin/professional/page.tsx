import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ReportStatusControl } from '@/components/admin/report-status-control'
import { MemberPageLayout } from '@/components/members/member-nav'
import { primaryButton, secondaryButton } from '@/components/professional/ui'
import { moderateListing } from '@/app/professional/actions'
import { currentModerator } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

function ModerateForm({ kind, id, suspended }: { kind: 'business' | 'opportunity'; id: string; suspended: boolean }) {
  return (
    <form action={moderateListing}>
      <input name="kind" type="hidden" value={kind} />
      <input name="id" type="hidden" value={id} />
      <input name="action" type="hidden" value={suspended ? 'restore' : 'suspend'} />
      <button className={suspended ? secondaryButton : primaryButton} type="submit">{suspended ? 'Restore as draft' : 'Suspend listing'}</button>
    </form>
  )
}

export default async function AdminProfessionalPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const moderator = await currentModerator()
  if (!moderator) redirect('/dashboard')
  const { done } = await searchParams
  const reports = await prisma.report.findMany({
    where: {
      status: { in: ['OPEN', 'PENDING', 'UNDER_REVIEW'] },
      OR: [
        { business: { schoolId: moderator.schoolId } },
        { opportunity: { schoolId: moderator.schoolId } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true, reason: true, explanation: true, createdAt: true,
      reporter: { select: { firstName: true, surname: true } },
      business: { select: { id: true, name: true, slug: true, status: true } },
      opportunity: { select: { id: true, title: true, status: true } },
    },
  })
  return (
    <MemberPageLayout name={`${moderator.firstName} Moderator`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Business &amp; opportunity reports</h1>
        <Link className={secondaryButton} href="/admin/reports">All reports</Link>
      </div>
      {done && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">Listing updated and owner notified.</p>}
      <div className="mt-6 space-y-3">
        {reports.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No open listing reports.</p>}
        {reports.map((report) => (
          <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={report.id}>
            <p className="text-sm font-semibold">
              {report.business ? (
                <Link className="text-[#9C0621] hover:underline" href={`/businesses/${report.business.slug}`}>Business: {report.business.name}</Link>
              ) : report.opportunity ? (
                <Link className="text-[#9C0621] hover:underline" href={`/opportunities/${report.opportunity.id}`}>Opportunity: {report.opportunity.title}</Link>
              ) : null}
            </p>
            <p className="text-sm"><span className="font-semibold">Reason:</span> {report.reason}</p>
            {report.explanation && <p className="text-sm text-slate-600">{report.explanation}</p>}
            <p className="text-xs text-slate-500">Reported by {report.reporter.firstName} {report.reporter.surname} · {report.createdAt.toLocaleString()}</p>
            <div className="flex flex-wrap items-center gap-3">
              {report.business && <ModerateForm id={report.business.id} kind="business" suspended={report.business.status === 'SUSPENDED'} />}
              {report.opportunity && <ModerateForm id={report.opportunity.id} kind="opportunity" suspended={report.opportunity.status === 'SUSPENDED'} />}
              <ReportStatusControl reportId={report.id} />
            </div>
          </article>
        ))}
      </div>
    </MemberPageLayout>
  )
}
