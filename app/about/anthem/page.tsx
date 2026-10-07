import Link from 'next/link'
import { AboutShell, PageHero } from '@/components/about/about-shell'
import { anthem } from '@/lib/about-content'
import { publicPageMetadata } from '@/lib/seo'

export const metadata = publicPageMetadata(
  '/about/anthem',
  'Government College Umuahia School Anthem | GCUOBA Network',
  'Read the Government College Umuahia school anthem, “The Will to Shine as One”, the shared spirit of the College and its Old Boys.'
)

export default function AnthemPage() {
  return (
    <AboutShell>
      <PageHero eyebrow="School Anthem" title="The Will to Shine as One">
        <p className="mt-6 max-w-2xl text-lg text-white/75">
          “Shine As One” expresses the unity the College hopes for in every generation of its students and Old Boys.
        </p>
      </PageHero>

      <section className="mx-auto max-w-2xl px-5 py-16">
        <div className="space-y-10">
          {anthem.map((verse, i) => (
            <figure className="border-l-4 border-[#9C0621] pl-6" key={i}>
              <figcaption className="text-xs font-bold uppercase tracking-[0.2em] text-[#9C0621]">Verse {i + 1}</figcaption>
              <p className="mt-3 space-y-1 text-lg italic leading-8 text-slate-800">
                {verse.map((line, j) => (
                  <span className={j === verse.length - 1 ? 'block font-semibold not-italic' : 'block'} key={j}>{line}</span>
                ))}
              </p>
            </figure>
          ))}
        </div>
        <p className="mt-12 text-sm text-slate-500">Text as published by GCUOBA UK.</p>
        <ul className="mt-8 flex flex-wrap gap-5 font-semibold text-[#9C0621]">
          <li><Link className="hover:underline" href="/about">← Back to About GCUOBA Network</Link></li>
          <li><Link className="hover:underline" href="/about/history">Our History</Link></li>
          <li><Link className="hover:underline" href="/about/principals">Principals</Link></li>
        </ul>
      </section>
    </AboutShell>
  )
}
