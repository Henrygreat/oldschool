'use client'

import { useState, useTransition } from 'react'
import { updateMessagingPrivacy } from '@/app/messages/actions'
import type { MessagingPrivacy } from '@/lib/messaging-shared'

const options: { value: MessagingPrivacy; label: string }[] = [
  { value: 'CONNECTIONS_ONLY', label: 'My connections only' },
  { value: 'MEMBERS_ONLY', label: 'Any school member' },
  { value: 'PRIVATE', label: 'Nobody' },
]

export function MessagingPrivacyControl({ initialValue }: { initialValue: MessagingPrivacy }) {
  const [value, setValue] = useState(initialValue)
  const [isPending, startTransitionAction] = useTransition()
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  function handleChange(next: string) {
    setValue(next as MessagingPrivacy)
    setNotice('')
    setError('')
    startTransitionAction(async () => {
      const result = await updateMessagingPrivacy(next)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setNotice('Saved.')
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <label className="block text-sm font-semibold">
        Who can message me
        <select
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15"
          disabled={isPending}
          onChange={(event) => handleChange(event.target.value)}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      {notice && <p className="mt-1 text-xs text-emerald-700" role="status">{notice}</p>}
      {error && <p className="mt-1 text-xs text-red-700" role="alert">{error}</p>}
    </div>
  )
}
