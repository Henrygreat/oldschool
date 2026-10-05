import Link from 'next/link'
import { signOut } from '@/lib/auth'

export function MemberNav({ name }: { name: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9C0621] font-bold text-white">
            G
          </span>
          <span>
            <span className="block font-bold tracking-wide text-slate-950">GCUOBA</span>
            <span className="hidden text-[10px] uppercase tracking-wider text-slate-500 sm:block">
              Old Boys Network
            </span>
          </span>
        </Link>
        <nav aria-label="Member navigation" className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm">
          <Link className="font-medium text-slate-600 hover:text-[#9C0621]" href="/dashboard">Dashboard</Link>
          <Link className="font-medium text-slate-600 hover:text-[#9C0621]" href="/directory">Directory</Link>
          {name && <Link className="font-medium text-slate-600 hover:text-[#9C0621]" href="/network">My Network</Link>}
          {name ? (
            <>
              <Link className="hidden font-medium text-slate-600 hover:text-[#9C0621] sm:inline" href="/members/me">{name}</Link>
              <form action={async () => {
                'use server'
                await signOut({ redirectTo: '/' })
              }}>
                <button className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:border-[#9C0621] hover:text-[#9C0621]" type="submit">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link className="rounded-lg bg-[#9C0621] px-3 py-2 font-semibold text-white" href="/auth/login">Log in</Link>
          )}
        </nav>
      </div>
    </header>
  )
}

export function MemberPageLayout({
  children,
  name,
}: {
  children: React.ReactNode
  name: string
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <MemberNav name={name} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        Government College Umuahia Old Boys Association
      </footer>
    </div>
  )
}
