'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function PasswordInput({
  label,
  name,
  autoComplete,
  hint,
}: {
  label: string
  name: string
  autoComplete: 'current-password' | 'new-password'
  hint?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <span className="relative mt-2 block">
        <input
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 font-normal outline-none focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15"
          maxLength={128}
          name={name}
          required
          type={visible ? 'text' : 'password'}
        />
        <button
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-500 hover:text-[#9C0621]"
          onClick={() => setVisible((value) => !value)}
          type="button"
        >
          {visible ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
        </button>
      </span>
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  )
}

export const PASSWORD_HINT = 'At least 10 characters with uppercase, lowercase and a number.'