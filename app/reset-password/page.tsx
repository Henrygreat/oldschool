import Link from 'next/link'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { hashResetToken, isWellFormedToken } from '@/lib/password'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  let valid = false
  if (isWellFormedToken(token)) {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(token) },
      select: { consumedAt: true, expiresAt: true },
    })
    valid = Boolean(record && !record.consumedAt && record.expiresAt > new Date())
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <Link className="text-sm font-semibold text-[#9C0621] hover:underline" href="/auth/login">← Back to log in</Link>
        <div className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9C0621]">Account recovery</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Choose a new password</h1>
        </div>
        {valid && isWellFormedToken(token) ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="mt-6 space-y-4">
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">This reset link is invalid, has expired or has already been used.</p>
            <Link className="inline-block font-bold text-[#9C0621] hover:underline" href="/forgot-password">Request a new link</Link>
          </div>
        )}
      </section>
    </main>
  )
}