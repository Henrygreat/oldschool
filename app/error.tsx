'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application page failed to load.', error.digest)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">We couldn’t load this page</h1>
        <p className="mt-3 text-slate-600">Please try again. If the problem continues, contact GCUOBA support.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button className="rounded-xl bg-[#9C0621] px-5 py-3 font-semibold text-white hover:bg-[#80051b]" onClick={() => reset()} type="button">Try again</button>
          <Link className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50" href="/">Return home</Link>
        </div>
      </section>
    </main>
  )
}
