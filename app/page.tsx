import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Globe2,
  GraduationCap,
  MapPin,
  Search,
  Users,
  BriefcaseBusiness,
  Images,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: GraduationCap,
    title: "Find Your Set",
    description:
      "Reconnect with Old Boys from your year and rediscover the friendships that started at GCU.",
    href: "/sets",
  },
  {
    icon: Users,
    title: "Find Your Schoolmates",
    description:
      "Search the GCUOBA network and reconnect with the boys you shared your school years with.",
    href: "/directory",
  },
  {
    icon: Globe2,
    title: "Global Community",
    description:
      "Connect with Government College Umuahia Old Boys living and working around the world.",
    href: "/directory",
  },
  {
    icon: BriefcaseBusiness,
    title: "Professional Network",
    description:
      "Discover Old Boys across industries, professions and businesses and build valuable connections.",
    href: "/directory",
  },
  {
    icon: Images,
    title: "Memories",
    description:
      "Celebrate our shared heritage, stories, photographs and unforgettable moments from GCU.",
    href: "/memories",
  },
  {
    icon: MapPin,
    title: "Chapters",
    description:
      "Find your nearest GCUOBA chapter and connect with Old Boys in your city or country.",
    href: "/chapters",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      {/* HERO */}
      <section className="relative min-h-[760px] overflow-hidden bg-[#100307] text-white">
        {/* Background image / collage */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/gcu-hero.jpg')",
          }}
        />

        {/* Dark overlays */}
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-[#100307]/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#9C0621]/25 via-transparent to-transparent" />

        {/* HEADER */}
        <header className="relative z-20 border-b border-white/10">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#9C0621] font-bold">
                G
              </div>

              <div className="leading-tight">
                <div className="text-xl font-bold tracking-wide">GCUOBA</div>
                <div className="hidden text-[10px] uppercase tracking-[0.16em] text-white/60 sm:block">
                  Government College Umuahia
                </div>
              </div>
            </Link>

            <nav className="hidden items-center gap-7 lg:flex">
              <Link
                href="/directory"
                className="text-sm font-medium text-white/80 transition hover:text-white"
              >
                Old Boys
              </Link>

              <Link
                href="/sets"
                className="text-sm font-medium text-white/80 transition hover:text-white"
              >
                Find Your Set
              </Link>

              <Link
                href="/chapters"
                className="text-sm font-medium text-white/80 transition hover:text-white"
              >
                Chapters
              </Link>

              <Link
                href="/events"
                className="text-sm font-medium text-white/80 transition hover:text-white"
              >
                Events
              </Link>

              <Link
                href="/news"
                className="text-sm font-medium text-white/80 transition hover:text-white"
              >
                News
              </Link>

              <Link
                href="/about"
                className="text-sm font-medium text-white/80 transition hover:text-white"
              >
                About
              </Link>
            </nav>

            <div className="hidden items-center gap-3 sm:flex">
              <Link href="/auth/login">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-white/10 hover:text-white"
                >
                  Log In
                </Button>
              </Link>

              <Link href="/auth/register">
                <Button className="bg-[#9C0621] text-white shadow-lg shadow-black/20 hover:bg-[#80051b]">
                  Join GCUOBA
                </Button>
              </Link>
            </div>

            <button className="rounded-lg border border-white/20 p-2 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* HERO CONTENT */}
        <div className="relative z-10 mx-auto flex min-h-[650px] max-w-7xl items-center px-5 pb-16 pt-20 lg:px-8">
          <div className="mx-auto w-full max-w-5xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#d31336]" />
              The Global Network of Government College Umuahia Old Boys
            </div>

            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Reconnect. Remember.
              <span className="mt-2 block text-white">Belong.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/75 sm:text-xl">
              Reconnect with schoolmates, rediscover old friendships and stay
              connected to the Government College Umuahia community wherever you
              are in the world.
            </p>

            {/* SEARCH */}
            <div className="mx-auto mt-10 max-w-4xl rounded-2xl bg-white p-2 shadow-2xl shadow-black/30">
              <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_auto]">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-5 py-4">
                  <Search className="h-5 w-5 text-[#9C0621]" />

                  <div className="w-full text-left">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Old Boy's Name
                    </div>
                    <input
                      type="text"
                      placeholder="Search by name..."
                      className="mt-1 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-5 py-4">
                  <GraduationCap className="h-5 w-5 text-[#9C0621]" />

                  <div className="w-full text-left">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Set / Year
                    </div>

                    <input
                      type="text"
                      placeholder="e.g. 1985"
                      className="mt-1 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <Link href="/directory" className="flex">
                  <Button className="h-full min-h-[64px] w-full rounded-xl bg-[#9C0621] px-8 text-base text-white hover:bg-[#80051b]">
                    <Search className="mr-2 h-5 w-5" />
                    Find Old Boys
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm text-white/65">
              <Link href="/sets" className="transition hover:text-white">
                Find My Set
              </Link>

              <span className="hidden h-1 w-1 rounded-full bg-white/30 sm:block" />

              <Link href="/directory" className="transition hover:text-white">
                Alumni Directory
              </Link>

              <span className="hidden h-1 w-1 rounded-full bg-white/30 sm:block" />

              <Link href="/events" className="transition hover:text-white">
                Upcoming Events
              </Link>

              <span className="hidden h-1 w-1 rounded-full bg-white/30 sm:block" />

              <Link href="/chapters" className="transition hover:text-white">
                Global Chapters
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[#9C0621]">
              Our Community
            </p>

            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
              The GCU connection lasts a lifetime.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              One community connecting generations of Government College Umuahia
              Old Boys across Nigeria and around the world.
            </p>
          </div>

          {/* STATS */}
          <div className="mb-20 grid grid-cols-2 overflow-hidden rounded-3xl border bg-slate-50 md:grid-cols-4">
            {[
              ["Old Boys", "Growing"],
              ["Sets", "Generations"],
              ["Chapters", "Worldwide"],
              ["Community", "One GCU"],
            ].map(([title, value], index) => (
              <div
                key={title}
                className={`p-7 text-center ${
                  index !== 3 ? "md:border-r" : ""
                }`}
              >
                <div className="text-2xl font-bold text-[#9C0621]">{value}</div>
                <div className="mt-1 text-sm text-slate-500">{title}</div>
              </div>
            ))}
          </div>

          {/* FEATURES */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className="group rounded-3xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-[#9C0621]/30 hover:shadow-xl"
                >
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#9C0621]/10 text-[#9C0621] transition group-hover:bg-[#9C0621] group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-xl font-bold">{feature.title}</h3>

                  <p className="mt-3 leading-7 text-slate-600">
                    {feature.description}
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#9C0621]">
                    Explore
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* EVENTS / COMMUNITY BANNER */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] bg-[#19050a] text-white">
            <div className="grid lg:grid-cols-2">
              <div className="p-8 sm:p-12 lg:p-16">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#9C0621]">
                  <CalendarDays className="h-6 w-6" />
                </div>

                <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/50">
                  Stay Connected
                </p>

                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                  More than an alumni directory.
                </h2>

                <p className="mt-5 max-w-xl leading-7 text-white/65">
                  Follow GCUOBA events, reconnect with your Set, discover
                  chapters and participate in a community built on friendship,
                  heritage and service.
                </p>

                <Link href="/events">
                  <Button className="mt-8 bg-[#9C0621] text-white hover:bg-[#80051b]">
                    Explore GCUOBA
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="min-h-[340px] bg-gradient-to-br from-[#9C0621] to-[#3b0711] p-10 lg:min-h-full">
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-sm text-center">
                    <Globe2 className="mx-auto h-16 w-16 text-white/80" />
                    <h3 className="mt-6 text-2xl font-bold">
                      GCUOBA Around the World
                    </h3>
                    <p className="mt-3 text-white/65">
                      Wherever life takes us, the bonds formed at Government
                      College Umuahia remain.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#9C0621]/10 text-[#9C0621]">
            <Users className="h-7 w-7" />
          </div>

          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Where are the boys you went to GCU with?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Join the GCUOBA network and start reconnecting with your
            schoolmates, Set and the wider Old Boys community.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="w-full bg-[#9C0621] px-8 text-white hover:bg-[#80051b] sm:w-auto"
              >
                Join the GCUOBA Network
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="w-full px-8 sm:w-auto"
              >
                Member Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#100307] py-12 text-white">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div>
              <div className="text-2xl font-bold">GCUOBA</div>
              <p className="mt-2 text-sm text-white/50">
                Government College Umuahia Old Boys Association
              </p>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-white/60">
              <Link href="/about" className="hover:text-white">
                About
              </Link>
              <Link href="/directory" className="hover:text-white">
                Old Boys
              </Link>
              <Link href="/chapters" className="hover:text-white">
                Chapters
              </Link>
              <Link href="/events" className="hover:text-white">
                Events
              </Link>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-sm text-white/40">
            © {new Date().getFullYear()} GCUOBA — Government College Umuahia Old
            Boys Association.
          </div>
        </div>
      </footer>
    </main>
  );
}
