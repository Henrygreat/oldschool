import Link from 'next/link'
import { AboutShell, PageHero } from '@/components/about/about-shell'
import { principals } from '@/lib/about-content'
import { publicPageMetadata } from '@/lib/seo'

export const metadata = publicPageMetadata(
  '/about/principals',
  'Principals of Government College Umuahia | GCUOBA Network',
  'A record of the principals who have led Government College Umuahia through the years.'
)

export default function PrincipalsPage() {
  return (
    <AboutShell>
      <PageHero eyebrow="Leadership" title="Principals Through the Years">
        <p className="mt-6 max-w-2xl text-lg text-white/75">
          A record of the educators and administrators who have helped guide Government College Umuahia through generations.
        </p>
      </PageHero>

      <section className="mx-auto max-w-3xl px-5 py-16">
        <ol className="divide-y rounded-2xl border">
          {principals.map((p, i) => (
            <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-4" key={i}>
              <span className="font-semibold">
                {p.name}
                {p.acting && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Acting</span>}
              </span>
              <span className="text-sm tabular-nums text-slate-600">{p.years}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-slate-500">
          Names and dates are reproduced as published by GCUOBA UK. Some periods overlap or are approximate, and the final entry has no end year in the source. Corrections from the Association are welcome.
        </p>
        <ul className="mt-8 flex flex-wrap gap-5 font-semibold text-[#9C0621]">
          <li><Link className="hover:underline" href="/about">← Back to About GCUOBA Network</Link></li>
          <li><Link className="hover:underline" href="/about/history">Our History</Link></li>
          <li><Link className="hover:underline" href="/about/anthem">School Anthem</Link></li>
        </ul>
      </section>
    </AboutShell>
  )
}
