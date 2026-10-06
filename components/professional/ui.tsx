import type { ReactNode } from 'react'
import { MemberPageLayout } from '@/components/members/member-nav'

export const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15'
export const primaryButton =
  'inline-flex items-center justify-center rounded-xl bg-[#9C0621] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#80051b]'
export const secondaryButton =
  'inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#9C0621] hover:text-[#9C0621]'

export function ProfessionalShell({ name, title, subtitle, children }: { name: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <MemberPageLayout name={name}>
      <section className="rounded-3xl bg-[#16070a] px-6 py-8 text-white sm:px-10">
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-white/70">{subtitle}</p>}
      </section>
      <div className="mt-6">{children}</div>
    </MemberPageLayout>
  )
}

export function Notice({ error, saved }: { error?: string; saved?: boolean }) {
  if (error) return <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error.slice(0, 200)}</p>
  if (saved) return <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">Saved.</p>
  return null
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{children}</p>
}

export function Pager({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (page: number) => string }) {
  if (pages <= 1) return null
  return (
    <nav className="mt-6 flex items-center justify-between text-sm font-semibold">
      {page > 1 ? <a className={secondaryButton} href={hrefFor(page - 1)}>Previous</a> : <span />}
      <span className="text-slate-500">Page {page} of {pages}</span>
      {page < pages ? <a className={secondaryButton} href={hrefFor(page + 1)}>Next</a> : <span />}
    </nav>
  )
}

export function Label({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}{children}</label>
}
