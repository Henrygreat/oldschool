import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { PublicMobileMenu } from '@/components/public-mobile-menu'

const aboutLinks = [
  { href: '/about', label: 'About GCUOBA Network' },
  { href: '/about/history', label: 'Our History' },
  { href: '/about/anthem', label: 'School Anthem' },
  { href: '/about/principals', label: 'Principals' },
]

const mainLinks = [
  { href: '/directory', label: 'Old Boys' },
  { href: '/sets', label: 'Find Your Set' },
  { href: '/chapters', label: 'Chapters' },
  { href: '/events', label: 'Events' },
]

export function AboutShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="relative z-30 bg-[#100307] text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 lg:h-20 lg:px-8">
          <Link className="flex items-center gap-3" href="/">
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9C0621] font-bold">G</span>
            <span className="leading-tight">
              <span className="block text-lg font-bold tracking-wide">GCUOBA</span>
              <span className="hidden text-[10px] uppercase tracking-[0.16em] text-white/60 sm:block">Government College Umuahia</span>
            </span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
            {mainLinks.map((link) => (
              <Link className="text-sm font-medium text-white/80 transition hover:text-white" href={link.href} key={link.href}>{link.label}</Link>
            ))}
            <div className="group relative">
              <Link className="inline-flex items-center gap-1 text-sm font-medium text-white" href="/about">
                About <ChevronDown aria-hidden="true" className="h-4 w-4" />
              </Link>
              <ul className="invisible absolute right-0 top-full z-30 w-56 rounded-xl border border-white/10 bg-[#1a0a0e] p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                {aboutLinks.map((link) => (
                  <li key={link.href}><Link className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white" href={link.href}>{link.label}</Link></li>
                ))}
              </ul>
            </div>
          </nav>
          <div className="flex items-center gap-2">
            <Link className="hidden rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white sm:block" href="/auth/login">Log In</Link>
            <Link className="hidden rounded-lg bg-[#9C0621] px-4 py-2 text-sm font-semibold text-white hover:bg-[#80051b] sm:block" href="/auth/register">Join GCUOBA</Link>
            <PublicMobileMenu className="lg:hidden" links={[...mainLinks, ...aboutLinks, { href: '/auth/login', label: 'Log In' }, { href: '/auth/register', label: 'Join GCUOBA' }]} />
          </div>
        </div>
        <nav aria-label="About section" className="border-t border-white/10">
          <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 py-2 text-sm lg:px-8">
            {aboutLinks.map((link) => (
              <li className="shrink-0" key={link.href}><Link className="block rounded-full px-3 py-1.5 text-white/75 hover:bg-white/10 hover:text-white" href={link.href}>{link.label}</Link></li>
            ))}
          </ul>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="bg-[#100307] py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-xl font-bold">GCUOBA Network</p>
            <p className="mt-1 text-sm text-white/60">Government College Umuahia Old Boys Association</p>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
            <li><Link className="hover:text-white" href="/about">About</Link></li>
            <li><Link className="hover:text-white" href="/directory">Old Boys</Link></li>
            <li><Link className="hover:text-white" href="/chapters">Chapters</Link></li>
            <li><Link className="hover:text-white" href="/events">Events</Link></li>
            <li><Link className="hover:text-white" href="/auth/register">Join</Link></li>
          </ul>
        </div>
      </footer>
    </div>
  )
}

export function PageHero({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-[#100307] text-white">
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[#9C0621]/45 via-[#100307] to-[#100307]" />
      <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
      <div aria-hidden="true" className="absolute -right-10 -top-10 h-72 w-72 rounded-full border border-[#9C0621]/40" />
      <div className="relative mx-auto max-w-7xl px-5 py-14 sm:py-20 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff8d9f] sm:text-sm">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
        {children}
      </div>
    </section>
  )
}
