import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>
}) {
  const params = await searchParams
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <Link className="text-sm font-semibold text-[#9C0621] hover:underline" href="/">← GCUOBA home</Link>
        <div className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9C0621]">Welcome back</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Log in to GCUOBA</h1>
          <p className="mt-3 text-slate-600">Reconnect with the Old Boys community.</p>
        </div>
        <LoginForm registered={params.registered === '1'} />
      </section>
    </main>
  )
}
