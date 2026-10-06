import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MemberPageLayout } from '@/components/members/member-nav'
import { ReportStatusControl } from '@/components/admin/report-status-control'
import { currentModerator } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

const statusLabels: Record<string, string> = {
  PENDING: 'Open',
  OPEN: 'Open',
  UNDER_REVIEW: 'Under review',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
}

export default async function ModerationReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const moderator = await currentModerator()
  if (!moderator) redirect('/dashboard')

  const { status } = await searchParams
  const filter = status && status !== 'ALL' ? status : null

  const reports = await prisma.report.findMany({
    where: {
      OR: [
        { reportedUser: { schoolId: moderator.schoolId } },
        { reporter: { schoolId: moderator.schoolId } },
      ],
      ...(filter === 'OPEN' ? { status: { in: ['OPEN', 'PENDING'] } } : filter ? { status: filter } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      reason: true,
      explanation: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
      reporter: { select: { id: true, firstName: true, surname: true } },
      reportedUser: { select: { id: true, firstName: true, surname: true } },
      message: { select: { id: true, createdAt: true } },
      post: { select: { id: true } },
    },
  })

  return (
    <MemberPageLayout name={`${moderator.firstName} Moderator`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Reports queue</h1>
        <nav className="flex gap-2 text-sm font-semibold">
          {['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'].map((option) => (
            <Link
              className={`rounded-lg px-3 py-1.5 ${(filter ?? 'ALL') === option ? 'bg-[#9C0621] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              href={option === 'ALL' ? '/admin/reports' : `/admin/reports?status=${option}`}
              key={option}
            >
              {statusLabels[option] ?? option}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6 space-y-3">
        {reports.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No reports to show.</p>}
        {reports.map((report) => (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={report.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                {statusLabels[report.status] ?? report.status}
              </span>
              <span className="text-xs text-slate-400">{report.createdAt.toLocaleString()}</span>
            </div>
            <p className="mt-2 text-sm">
              <span className="font-semibold">Reason:</span> {report.reason}
              {report.message && <span className="ml-2 text-slate-500">(reported message)</span>}
              {report.post && <span className="ml-2 text-slate-500">(reported post)</span>}
            </p>
            {report.explanation && <p className="mt-1 text-sm text-slate-600">{report.explanation}</p>}
            <p className="mt-2 text-xs text-slate-500">
              Reported by {report.reporter.firstName} {report.reporter.surname}
              {report.reportedUser && <> about {report.reportedUser.firstName} {report.reportedUser.surname}</>}
            </p>
            <div className="mt-3">
              <ReportStatusControl reportId={report.id} />
            </div>
          </article>
        ))}
      </div>
    </MemberPageLayout>
  )
}
