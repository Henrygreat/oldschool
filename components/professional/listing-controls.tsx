'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startConversation } from '@/app/messages/actions'
import { reportListing } from '@/app/professional/actions'
import { listingReportReasons } from '@/lib/professional-shared'

const fieldClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15'

export function ContactButton({ targetUserId, label }: { targetUserId: string; label: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  return (
    <div>
      <button
        className="rounded-xl bg-[#9C0621] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#80051b] disabled:opacity-60"
        disabled={pending}
        onClick={() => {
          setError('')
          start(async () => {
            const result = await startConversation(targetUserId)
            if (!result.ok) return setError(result.error)
            router.push(`/messages/${result.conversationId}`)
          })
        }}
        type="button"
      >
        {label}
      </button>
      {error && <p className="mt-2 text-xs text-red-700" role="alert">{error}</p>}
    </div>
  )
}

export function ListingReport({ kind, id }: { kind: 'business' | 'opportunity'; id: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('SPAM')
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  if (done) return <p className="text-sm font-semibold text-emerald-700">Thank you. Moderators will review this report.</p>
  return (
    <div>
      <button className="text-xs font-semibold text-slate-500 underline hover:text-[#9C0621]" onClick={() => setOpen((value) => !value)} type="button">
        {open ? 'Cancel report' : 'Report this listing'}
      </button>
      {open && (
        <form
          className="mt-2 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
          onSubmit={(event) => {
            event.preventDefault()
            setError('')
            start(async () => {
              const result = await reportListing(kind, id, reason, details)
              if (!result.ok) return setError(result.error)
              setDone(true)
            })
          }}
        >
          <label className="block text-sm font-semibold">
            Reason
            <select className={fieldClass} onChange={(event) => setReason(event.target.value)} value={reason}>
              {listingReportReasons.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Details (optional)
            <textarea className={fieldClass} maxLength={1000} onChange={(event) => setDetails(event.target.value)} rows={3} value={details} />
          </label>
          <button className="rounded-xl bg-[#9C0621] px-4 py-2 text-sm font-semibold text-white hover:bg-[#80051b] disabled:opacity-60" disabled={pending} type="submit">
            {pending ? 'Submitting…' : 'Submit report'}
          </button>
          {error && <p className="text-xs text-red-700" role="alert">{error}</p>}
        </form>
      )}
    </div>
  )
}
