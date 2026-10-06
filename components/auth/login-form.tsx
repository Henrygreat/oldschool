'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { loginAction, type FormState } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'

const initialState: FormState = {}

export function LoginForm({ registered, callbackUrl = '/dashboard' }: { registered: boolean; callbackUrl?: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState)

  return (
    <form action={action} className="mt-8 space-y-5">
      <input name="callbackUrl" type="hidden" value={callbackUrl} />
      {registered && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Your account is ready. Sign in to continue.</p>}
      {state.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      <label className="block text-sm font-semibold text-slate-700">
        Email address
        <input autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15" name="email" required type="email" />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Password
        <input autoComplete="current-password" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15" minLength={8} name="password" required type="password" />
      </label>
      <Button className="h-12 w-full bg-[#9C0621] text-white hover:bg-[#80051b]" disabled={pending} type="submit">
        {pending ? 'Signing in…' : 'Log in'}
      </Button>
      <p className="text-center text-sm text-slate-600">
        New to GCUOBA? <Link className="font-bold text-[#9C0621] hover:underline" href={callbackUrl === '/dashboard' ? '/auth/register' : `/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Create an account</Link>
      </p>
    </form>
  )
}
