'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { requestPasswordResetAction, type PasswordFormState } from '@/app/auth/password-actions'
import { Button } from '@/components/ui/button'

const initialState: PasswordFormState = {}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialState)
  return (
    <form action={action} className="mt-8 space-y-5">
      {state.success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{state.success}</p>}
      {state.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      <label className="block text-sm font-semibold text-slate-700">
        Email address
        <input autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15" maxLength={254} name="email" required type="email" />
      </label>
      <Button className="h-12 w-full bg-[#9C0621] text-white hover:bg-[#80051b]" disabled={pending} type="submit">
        {pending ? 'Sending…' : 'Send reset link'}
      </Button>
      <p className="text-center text-sm text-slate-600">
        <Link className="font-bold text-[#9C0621] hover:underline" href="/auth/login">← Back to log in</Link>
      </p>
    </form>
  )
}