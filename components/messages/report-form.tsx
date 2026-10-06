'use client'

import { useState, useTransition } from 'react'
import { reportMember, reportMessage } from '@/app/messages/actions'

const reasons = [
  { value: 'SPAM', label: 'Spam or scam' },
  { value: 'HARASSMENT', label: 'Harassment or abuse' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content' },
  { value: 'IMPERSONATION', label: 'Impersonation' },
  { value: 'OTHER', label: 'Other' },
]

export function ReportForm({
  targetUserId,
  messageId,
  onDone,
}: {
  targetUserId?: string
  messageId?: string
  onDone?: () => void
}) {
  const [reason, setReason] = useState('SPAM')
  const [explanation, setExplanation] = useState('')
  const [isPending, startTransitionAction] = useTransition()
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    startTransitionAction(async () => {
      const result = messageId
        ? await reportMessage(messageId, reason, explanation)
        : targetUserId
          ? await reportMember(targetUserId, reason, explanation)
          : { ok: false as const, error: 'Nothing to report.' }
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSubmitted(true)
      onDone?.()
    })
  }

  if (submitted) {
    return <p className="text-sm font-semibold text-emerald-700">Thank you. Our moderators will review this report.</p>
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <label className="block text-sm font-semibold">
        Reason
        <select
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15"
          onChange={(event) => setReason(event.target.value)}
          value={reason}
        >
          {reasons.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Additional details (optional)
        <textarea
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15"
          maxLength={1000}
          onChange={(event) => setExplanation(event.target.value)}
          rows={3}
          value={explanation}
        />
      </label>
      <button
        className="rounded-xl bg-[#9C0621] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#80051b] disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'Submitting…' : 'Submit report'}
      </button>
      {error && <p className="text-xs text-red-700" role="alert">{error}</p>}
    </form>
  )
}

export function ReportDisclosure({ targetUserId, messageId, label = 'Report' }: { targetUserId?: string; messageId?: string; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        className="text-xs font-semibold text-slate-500 underline hover:text-[#9C0621]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? 'Cancel report' : label}
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <ReportForm messageId={messageId} onDone={() => setOpen(false)} targetUserId={targetUserId} />
        </div>
      )}
    </div>
  )
}
