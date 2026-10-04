import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">GCUOBA</h1>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="#sets" className="text-sm font-medium hover:text-primary">
              Find Your Set
            </Link>
            <Link href="#directory" className="text-sm font-medium hover:text-primary">
              Old Boys Directory
            </Link>
            <Link href="#chapters" className="text-sm font-medium hover:text-primary">
              Chapters
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Log In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm">
                Join Now
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6">
              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                GCUOBA
              </h1>
              <p className="mt-4 text-2xl font-semibold text-muted-foreground sm:text-3xl">
                Government College Umuahia Old Boys Association
              </p>
            </div>

            <p className="mt-6 text-xl text-muted-foreground sm:text-2xl">
              Reconnect with your schoolmates. Strengthen old bonds. Build new ones.
            </p>

            <p className="mt-4 text-lg text-muted-foreground">
              Join Old Boys of Government College Umuahia from across generations and around the world.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Join the GCUOBA Network
                </Button>
              </Link>
              <Link href="/directory">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Find Old Boys
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="mb-2 text-xl font-semibold">Find Your Set</h3>
              <p className="text-muted-foreground">
                Connect with Old Boys from your graduating Set. Relive memories and rebuild connections.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="mb-2 text-xl font-semibold">Find Your Schoolmates</h3>
              <p className="text-muted-foreground">
                Discover Old Boys who attended GCU with you. Our matching system finds people you may know.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="mb-2 text-xl font-semibold">GCUOBA Around the World</h3>
              <p className="text-muted-foreground">
                Join your local chapter and connect with Old Boys in your city and country.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="mb-2 text-xl font-semibold">Professional Network</h3>
              <p className="text-muted-foreground">
                Build professional connections with Old Boys across industries and continents.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="mb-2 text-xl font-semibold">Memories</h3>
              <p className="text-muted-foreground">
                Share and relive memories from your time at Government College Umuahia.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="mb-2 text-xl font-semibold">Chapters</h3>
              <p className="text-muted-foreground">
                Connect with GCUOBA chapters across Nigeria and around the world.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to reconnect?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Where are the boys you went to GCU with? Find them within minutes of registration.
            </p>
            <div className="mt-8">
              <Link href="/auth/register">
                <Button size="lg">
                  Join the GCUOBA Network
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} GCUOBA - Government College Umuahia Old Boys Association</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
