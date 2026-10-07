import Link from 'next/link'
import { ArrowRight, HeartHandshake, Handshake, Network, Users } from 'lucide-react'
import { AboutShell, PageHero } from '@/components/about/about-shell'
import { publicPageMetadata } from '@/lib/seo'

export const metadata = publicPageMetadata(
  '/about',
  'About GCUOBA Network | Government College Umuahia Old Boys',
  'Learn about GCUOBA Network, a digital home for Government College Umuahia Old Boys to reconnect by set, chapter and profession, and to preserve the heritage of the College.'
)

const pillars = [
  { icon: Users, title: 'Reconnect', text: 'Find classmates and contemporaries through the Old Boys directory and your set.' },
  { icon: Network, title: 'Belong', text: 'Join your set and local chapter and stay close to the wider brotherhood.' },
  { icon: Handshake, title: 'Collaborate', text: 'Share professional experience, businesses and opportunities with fellow Old Boys.' },
  { icon: HeartHandshake, title: 'Give back', text: 'Support events, mentoring and initiatives that serve the College and its community.' },
]

const explore = [
  { href: '/directory', label: 'Old Boys directory' },
  { href: '/sets', label: 'Sets' },
  { href: '/chapters', label: 'Chapters' },
  { href: '/events', label: 'Events' },
  { href: '/professional', label: 'Professional network' },
]

export default function AboutPage() {
  return (
    <AboutShell>
      <PageHero eyebrow="About GCUOBA Network" title="Our Heritage. Our Brotherhood. Our Network.">
        <p className="mt-6 max-w-2xl text-lg text-white/75">
          Connecting generations of Government College Umuahia Old Boys — preserving our shared heritage while creating opportunities to reconnect, collaborate and give back.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-lg bg-[#9C0621] px-6 py-3 font-semibold hover:bg-[#80051b]" href="/about/history">Explore Our History</Link>
          <Link className="rounded-lg border border-white/30 px-6 py-3 font-semibold hover:bg-white/10" href="/directory">Find Old Boys</Link>
        </div>
      </PageHero>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Built on a Remarkable Heritage</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            Government College Umuahia was founded in 1929 by Reverend Robert Fisher, who opened its gates to 25 students drawn from Nigeria and West Africa. Nearly a century later, its Old Boys carry that heritage across the world.
          </p>
          <Link className="mt-5 inline-flex items-center gap-2 font-semibold text-[#9C0621] hover:underline" href="/about/history">
            Explore Our History <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        <div className="rounded-2xl border border-[#9C0621]/20 bg-[#9C0621]/5 px-10 py-8 text-center">
          <p className="text-6xl font-bold text-[#9C0621]">1929</p>
          <p className="mt-1 text-sm font-semibold uppercase tracking-widest text-slate-600">Founded</p>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight">Bringing Old Boys Together</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            GCUOBA Network is a digital platform that helps Government College Umuahia Old Boys find one another, organise by set and chapter, and stay informed about events and opportunities. It is a tool to support the Old Boys community and does not replace the Association or any of its official chapters.
          </p>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map(({ icon: Icon, title, text }) => (
              <li className="rounded-2xl border bg-white p-6 shadow-sm" key={title}>
                <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#9C0621]/10 text-[#9C0621]"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 text-sm font-bold uppercase tracking-widest">{title}</h3>
                <p className="mt-2 text-slate-600">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight">A Legacy That Continues</h2>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
          From its founding to the present day, the College has been shaped by the people who taught, led and studied there.
        </p>
        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            { href: '/about/history', title: 'Our History', text: 'The story of the College from 1929 onwards.' },
            { href: '/about/anthem', title: 'School Anthem', text: 'The Will to Shine as One.' },
            { href: '/about/principals', title: 'Principals', text: 'The educators who have guided the College.' },
          ].map((c) => (
            <li key={c.href}>
              <Link className="block h-full rounded-2xl border p-6 transition hover:border-[#9C0621] hover:shadow-md" href={c.href}>
                <h3 className="text-lg font-bold">{c.title}</h3>
                <p className="mt-2 text-slate-600">{c.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#9C0621]">Read more <ArrowRight aria-hidden="true" className="h-4 w-4" /></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-[#100307] py-16 text-center text-white">
        <div className="mx-auto max-w-3xl px-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff8d9f]">Our shared spirit</p>
          <h2 className="mt-3 text-4xl font-bold">Shine As One</h2>
          <p className="mt-4 text-lg text-white/75">
            The words of the school anthem — “the will to shine as one” — remain the spirit that binds Old Boys of every generation.
          </p>
          <p className="mt-6 font-semibold">One School. Many Generations. One Brotherhood.</p>
          <Link className="mt-8 inline-block rounded-lg bg-[#9C0621] px-8 py-3 font-semibold hover:bg-[#80051b]" href="/auth/register">Join the Network</Link>
          <nav aria-label="Explore the network" className="mt-10 border-t border-white/10 pt-6">
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/70">
              {explore.map((l) => <li key={l.href}><Link className="hover:text-white" href={l.href}>{l.label}</Link></li>)}
            </ul>
          </nav>
        </div>
      </section>
    </AboutShell>
  )
}
