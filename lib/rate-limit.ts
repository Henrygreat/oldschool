import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function clientFingerprint() {
  const requestHeaders = await headers()
  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
  const address = forwarded || requestHeaders.get('x-real-ip') || 'unknown'
  return createHash('sha256').update(address).digest('hex').slice(0, 24)
}

/**
 * Fixed-window counter shared across instances through PostgreSQL.
 * Returns true when the action is allowed. Fails open if the limiter itself errors,
 * so a database problem cannot lock every user out of password recovery.
 */
export async function allowAction(key: string, limit: number, windowSeconds: number) {
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
      VALUES (${key}, 1, (NOW() AT TIME ZONE 'UTC') + (${windowSeconds}::int * INTERVAL '1 second'))
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitBucket"."resetAt" <= (NOW() AT TIME ZONE 'UTC') THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= (NOW() AT TIME ZONE 'UTC')
          THEN (NOW() AT TIME ZONE 'UTC') + (${windowSeconds}::int * INTERVAL '1 second')
          ELSE "RateLimitBucket"."resetAt" END
      RETURNING "count"::int AS "count"`
    return (rows[0]?.count ?? 1) <= limit
  } catch (error) {
    console.error('Rate limit check failed', { name: error instanceof Error ? error.name : typeof error })
    return true
  }
}