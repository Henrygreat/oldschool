import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'

export const RESET_TOKEN_TTL_MINUTES = 30

export const newPasswordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(128, 'Use 128 characters or fewer.')
  .regex(/[a-z]/, 'Include a lowercase letter.')
  .regex(/[A-Z]/, 'Include an uppercase letter.')
  .regex(/\d/, 'Include a number.')

export function generateResetToken() {
  return randomBytes(32).toString('base64url')
}

export function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function isWellFormedToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
}