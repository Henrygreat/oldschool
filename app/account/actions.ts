'use server'

import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { auth, signOut } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { allowAction } from '@/lib/rate-limit'
import { newPasswordSchema } from '@/lib/password'
import type { PasswordFormState } from '@/app/auth/password-actions'

export async function changePasswordAction(
  _previous: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Please sign in to change your password.' }
  const userId = session.user.id

  const current = formData.get('currentPassword')
  const next = formData.get('newPassword')
  const confirm = formData.get('confirmPassword')
  if (typeof current !== 'string' || current.length === 0 || current.length > 128) {
    return { error: 'Enter your current password.' }
  }
  const checked = newPasswordSchema.safeParse(next)
  if (!checked.success) return { error: checked.error.issues[0]?.message ?? 'Choose a stronger password.' }
  if (next !== confirm) return { error: 'The new passwords do not match.' }
  if (next === current) return { error: 'Your new password must be different from your current password.' }

  if (!(await allowAction(`pwchange:user:${userId}`, 5, 15 * 60))) {
    return { error: 'Too many attempts. Please wait a while before trying again.' }
  }

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: { id: true, password: true },
    })
    if (!user) return { error: 'Your account is not available. Please sign in again.' }
    if (!(await bcrypt.compare(current, user.password))) {
      return { error: 'Your current password is incorrect.' }
    }

    const now = new Date()
    const passwordHash = await bcrypt.hash(checked.data, 12)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: passwordHash, passwordChangedAt: now },
      }),
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: now },
      }),
    ])
  } catch (error) {
    console.error('Password change failed', { name: error instanceof Error ? error.name : typeof error })
    return { error: 'Your password could not be changed. Please try again.' }
  }

  // Every existing session, including this one, is now invalid, so sign in again.
  await signOut({ redirectTo: '/auth/login?passwordChanged=1' })
  redirect('/auth/login?passwordChanged=1')
}