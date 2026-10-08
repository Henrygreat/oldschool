'use client'

import { useActionState } from 'react'
import { changePasswordAction } from '@/app/account/actions'
import type { PasswordFormState } from '@/app/auth/password-actions'
import { PASSWORD_HINT, PasswordInput } from '@/components/auth/password-input'
import { Button } from '@/components/ui/button'

const initialState: PasswordFormState = {}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initialState)
  return (
    <form action={action} className="mt-6 max-w-md space-y-5">
      {state.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      <PasswordInput autoComplete="current-password" label="Current password" name="currentPassword" />
      <PasswordInput autoComplete="new-password" hint={PASSWORD_HINT} label="New password" name="newPassword" />
      <PasswordInput autoComplete="new-password" label="Confirm new password" name="confirmPassword" />
      <Button className="h-12 bg-[#9C0621] px-8 text-white hover:bg-[#80051b]" disabled={pending} type="submit">
        {pending ? 'Updating…' : 'Change password'}
      </Button>
    </form>
  )
}