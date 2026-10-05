'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { submitArchiveClaim } from '@/app/archive/actions'

export function ClaimArchiveRecord({
  archiveRecordId,
  loggedIn,
  pending,
}: {
  archiveRecordId: string
  loggedIn: boolean
  pending: boolean
}) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(pending)
  const [busy, setBusy] = useState(false)

  if (submitted) {
    return <p className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">Your claim is pending administrator review.</p>
  }
  if (!loggedIn) {
    const callbackUrl = encodeURIComponent(`/archive/${archiveRecordId}`)
    return <Link className="inline-flex rounded-xl bg-[#9C0621] px-5 py-3 text-sm font-bold text-white hover:bg-[#80051b]" href={`/auth/login?callbackUrl=${callbackUrl}`}>Log in to claim this profile</Link>
  }

  async function claim(formData: FormData) {
    setBusy(true)
    setError('')
    try {
      const result = await submitArchiveClaim(archiveRecordId, String(formData.get('message') ?? ''))
      if (!result.ok) {
        setError(result.error)
        router.refresh()
        return
      }
      setSubmitted(true)
      router.refresh()
    } catch {
      setError('Your claim could not be submitted. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form action={claim} className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold">Claim this profile</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">An administrator will review your request. A name match alone does not automatically verify or merge this record into your account.</p>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Note for the administrator (optional)
        <textarea className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" maxLength={1000} name="message" rows={3} />
      </label>
      <Button className="mt-4 bg-[#9C0621] text-white hover:bg-[#80051b]" disabled={busy} type="submit">{busy ? 'Submitting…' : 'Submit claim for review'}</Button>
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
    </form>
  )
}
