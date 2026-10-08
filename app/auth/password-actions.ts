'use server'

import { after } from 'next/server'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { allowAction, clientFingerprint } from '@/lib/rate-limit'
import { sendPasswordResetEmail } from '@/lib/email'
import {
  generateResetToken,
  hashResetToken,
  isWellFormedToken,
  newPasswordSchema,
  RESET_TOKEN_TTL_MINUTES,
} from '@/lib/password'

export type PasswordFormState = { error?: string; success?: string }

const GENERIC_REQUEST_MESSAGE =
  'If an account exists for that email address, we have sent a link to reset your password. The link expires in 30 minutes.'

async function issueResetToken(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isActive: true },
  })
  if (!user?.isActive) return

  const token = generateResetToken()
  const now = new Date()
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: now },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60_000),
      },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date(now.getTime() - 24 * 60 * 60_000) } },
    }),
  ])
  await sendPasswordResetEmail(email, token)
}

export async function requestPasswordResetAction(
  _previous: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const parsed = z.string().trim().email().max(254).safeParse(formData.get('email'))
  if (!parsed.success) return { error: 'Enter a valid email address.' }
  const email = parsed.data.toLowerCase()

  const fingerprint = await clientFingerprint()
  const allowed =
    (await allowAction(`pwreset:ip:${fingerprint}`, 5, 15 * 60)) &&
    (await allowAction(`pwreset:email:${email}`, 3, 60 * 60))
  if (!allowed) return { error: 'Too many requests. Please wait a while before trying again.' }

  // Work happens after the response so timing does not reveal whether the account exists.
  after(async () => {
    try {
      await issueResetToken(email)
    } catch (error) {
      console.error('Password reset request failed', { name: error instanceof Error ? error.name : typeof error })
    }
  })
  return { success: GENERIC_REQUEST_MESSAGE }
}

export async function resetPasswordAction(
  _previous: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const token = formData.get('token')
  const password = formData.get('password')
  const confirm = formData.get('confirmPassword')
  const invalid = { error: 'This reset link is invalid or has expired. Request a new one.' }

  if (!isWellFormedToken(token)) return invalid
  const checked = newPasswordSchema.safeParse(password)
  if (!checked.success) return { error: checked.error.issues[0]?.message ?? 'Choose a stronger password.' }
  if (password !== confirm) return { error: 'The passwords do not match.' }

  if (!(await allowAction(`pwreset-use:ip:${await clientFingerprint()}`, 10, 15 * 60))) {
    return { error: 'Too many attempts. Please wait a while before trying again.' }
  }

  try {
    const passwordHash = await bcrypt.hash(checked.data, 12)
    const tokenHash = hashResetToken(token)
    const done = await prisma.$transaction(async (transaction) => {
      const now = new Date()
      const record = await transaction.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, user: { select: { isActive: true } } },
      })
      if (!record || !record.user.isActive) return false

      // The conditional update is what makes consumption atomic and single-use.
      const consumed = await transaction.passwordResetToken.updateMany({
        where: { id: record.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      })
      if (consumed.count !== 1) return false

      await transaction.user.update({
        where: { id: record.userId },
        data: { password: passwordHash, passwordChangedAt: now },
      })
      await transaction.passwordResetToken.updateMany({
        where: { userId: record.userId, consumedAt: null },
        data: { consumedAt: now },
      })
      return true
    })
    if (!done) return invalid
  } catch (error) {
    console.error('Password reset failed', { name: error instanceof Error ? error.name : typeof error })
    return { error: 'Your password could not be reset. Please try again.' }
  }
  redirect('/auth/login?reset=1')
}