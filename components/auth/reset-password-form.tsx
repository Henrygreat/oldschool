'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { resetPasswordAction, type PasswordFormState } from '@/app/auth/password-actions'
import { PASSWORD_HINT, PasswordInput } from '@/components/auth/password-input'
import { Button } from '@/components/ui/button'

const initialState: PasswordFormState = {}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initialState)
  return (
    <form action={action} className="mt-8 space-y-5">
      <input name="token" type="hidden" value={token} />
      {state.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      <PasswordInput autoComplete="new-password" hint={PASSWORD_HINT} label="New password" name="password" />
      <PasswordInput autoComplete="new-password" label="Confirm new password" name="confirmPassword" />
      <Button className="h-12 w-full bg-[#9C0621] text-white hover:bg-[#80051b]" disabled={pending} type="submit">
        {pending ? 'Saving…' : 'Reset password'}
      </Button>
      <p className="text-center text-sm text-slate-600">
        <Link className="font-bold text-[#9C0621] hover:underline" href="/auth/login">← Back to log in</Link>
      </p>
    </form>
  )
}