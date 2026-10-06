'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateReportStatus } from '@/app/admin/reports/actions'

const statuses = [
  { value: 'UNDER_REVIEW', label: 'Mark under review' },
  { value: 'RESOLVED', label: 'Resolve' },
  { value: 'DISMISSED', label: 'Dismiss' },
]

export function ReportStatusControl({ reportId }: { reportId: string }) {
  const router = useRouter()
  const [isPending, startTransitionAction] = useTransition()
  const [error, setError] = useState('')

  function handleClick(status: string) {
    setError('')
    startTransitionAction(async () => {
      const result = await updateReportStatus(reportId, status)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {statuses.map((status) => (
        <button
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#9C0621] hover:text-[#9C0621] disabled:opacity-50"
          disabled={isPending}
          key={status.value}
          onClick={() => handleClick(status.value)}
          type="button"
        >
          {status.label}
        </button>
      ))}
      {error && <p className="text-xs text-red-700" role="alert">{error}</p>}
    </div>
  )
}
