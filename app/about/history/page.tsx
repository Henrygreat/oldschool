import Link from 'next/link'
import { AboutShell, PageHero } from '@/components/about/about-shell'
import { heritageSections, timeline } from '@/lib/about-content'
import { publicPageMetadata } from '@/lib/seo'

export const metadata = publicPageMetadata(
  '/about/history',
  'History of Government College Umuahia | GCUOBA Network',
  'Explore the history of Government College Umuahia from its founding in 1929 by Reverend Robert Fisher, through wartime closure and reopening, to its enduring heritage.'
)

export default function HistoryPage() {
  return (
    <AboutShell>
      <PageHero eyebrow="Our history" title="History of Government College Umuahia">
        <p className="mt-6 max-w-2xl text-lg text-white/75">From a teacher-training institute in 1929 to a school whose Old Boys span generations.</p>
      </PageHero>

      <section className="mx-auto max-w-4xl px-5 py-16 lg:px-8" aria-labelledby="timeline">
        <h2 className="text-3xl font-bold tracking-tight" id="timeline">Timeline</h2>
        <ol className="mt-10 space-y-8 border-l-2 border-[#9C0621]/30 pl-8">
          {timeline.map((e) => (
            <li className="relative" key={e.year}>
              <span aria-hidden="true" className="absolute -left-[41px] top-1.5 h-4 w-4 rounded-full border-4 border-white bg-[#9C0621]" />
              <p className="text-sm font-bold uppercase tracking-widest text-[#9C0621]">{e.year}</p>
              <h3 className="mt-1 text-xl font-bold">{e.title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{e.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 md:grid-cols-2 lg:px-8">
          {heritageSections.map((s) => (
            <article className="rounded-2xl border bg-white p-6 shadow-sm" id={s.id} key={s.id}>
              <h2 className="text-xl font-bold">{s.title}</h2>
              {s.paragraphs.map((p) => <p className="mt-3 leading-7 text-slate-600" key={p}>{p}</p>)}
            </article>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-7xl px-5 text-sm text-slate-500 lg:px-8">
          Historical details are compiled from the published GCUOBA UK history of the College.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <ul className="flex flex-wrap gap-5 font-semibold text-[#9C0621]">
          <li><Link className="hover:underline" href="/about">← Back to About GCUOBA Network</Link></li>
          <li><Link className="hover:underline" href="/about/anthem">School Anthem</Link></li>
          <li><Link className="hover:underline" href="/about/principals">Principals</Link></li>
        </ul>
      </section>
    </AboutShell>
  )
}
