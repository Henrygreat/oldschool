'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { registerAction, type FormState } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'

const initialState: FormState = {}

export function RegisterForm({ callbackUrl = '/dashboard' }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState(registerAction, initialState)

  return (
    <form action={action} className="mt-8 space-y-5">
      <input name="callbackUrl" type="hidden" value={callbackUrl} />
      {state.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          First name
          <input autoComplete="given-name" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15" maxLength={80} name="firstName" required />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Last name
          <input autoComplete="family-name" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15" maxLength={80} name="surname" required />
        </label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Email address
        <input autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15" maxLength={254} name="email" required type="email" />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Password
        <input autoComplete="new-password" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15" minLength={8} maxLength={128} name="password" required type="password" />
        <span className="mt-1 block font-normal text-slate-500">Use at least 8 characters.</span>
      </label>
      <Button className="h-12 w-full bg-[#9C0621] text-white hover:bg-[#80051b]" disabled={pending} type="submit">
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
      <p className="text-center text-sm text-slate-600">
        Already a member? <Link className="font-bold text-[#9C0621] hover:underline" href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Log in</Link>
      </p>
    </form>
  )
}
