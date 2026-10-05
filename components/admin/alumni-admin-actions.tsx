'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { reviewAlumniClaim, setArchiveRecordArchived } from '@/app/admin/alumni/actions'

export function AlumniClaimReviewActions({ claimId }: { claimId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function review(decision: 'approve' | 'reject') {
    setBusy(true)
    setError('')
    try {
      const result = await reviewAlumniClaim(claimId, decision, message)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMessage(decision === 'approve' ? 'Claim approved and linked.' : 'Claim rejected.')
      router.refresh()
    } catch {
      setError('The claim could not be reviewed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <label className="block text-xs font-semibold text-slate-600">
        Review note (optional)
        <textarea className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" maxLength={1000} onChange={(event) => setMessage(event.target.value)} value={message} />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button className="bg-[#9C0621] text-white hover:bg-[#80051b]" disabled={busy} onClick={() => void review('approve')} type="button">
          {busy ? 'Saving…' : 'Approve and link'}
        </Button>
        <Button disabled={busy} onClick={() => void review('reject')} type="button" variant="outline">Reject</Button>
      </div>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
    </div>
  )
}

export function ArchiveAvailabilityButton({
  recordId,
  archived,
}: {
  recordId: string
  archived: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function update() {
    setBusy(true)
    setError('')
    try {
      const result = await setArchiveRecordArchived(recordId, !archived)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    } catch {
      setError('The archive status could not be changed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Button disabled={busy} onClick={() => void update()} type="button" variant="outline">
        {busy ? 'Saving…' : archived ? 'Restore record' : 'Archive record'}
      </Button>
      {error && <p className="mt-1 text-xs text-red-700" role="alert">{error}</p>}
    </div>
  )
}
