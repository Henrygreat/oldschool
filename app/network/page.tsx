import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, UsersRound } from 'lucide-react'
import { MemberCard } from '@/components/members/member-card'
import { MemberPageLayout } from '@/components/members/member-nav'
import { NetworkActivity } from '@/components/members/network-activity'
import { auth } from '@/lib/auth'
import { getNetworkData, parseNetworkPage, parseNetworkTab } from '@/lib/network'
import { prisma } from '@/lib/prisma'
import type { NetworkTab } from '@/lib/network-types'

const tabs: { id: NetworkTab; label: string }[] = [
  { id: 'connections', label: 'Connections' },
  { id: 'received', label: 'Received requests' },
  { id: 'sent', label: 'Sent requests' },
  { id: 'following', label: 'Following' },
  { id: 'followers', label: 'Followers' },
]

const emptyMessages: Record<NetworkTab, { title: string; description: string }> = {
  connections: {
    title: 'Your GCUOBA network will appear here.',
    description: 'Connect with Old Boys to grow your professional alumni network.',
  },
  received: {
    title: 'No connection requests yet.',
    description: 'New requests from Old Boys will appear here.',
  },
  sent: {
    title: 'No sent requests.',
    description: 'When you reach out to an Old Boy, your pending requests will appear here.',
  },
  following: {
    title: 'You are not following anyone yet.',
    description: 'Follow members to keep track of the people and professions you care about.',
  },
  followers: {
    title: 'No followers yet.',
    description: 'As your GCUOBA community grows, members who follow you will appear here.',
  },
}

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) {
    redirect('/auth/login?callbackUrl=%2Fnetwork')
  }
  const member = await prisma.user.findFirst({
    where: { id: session.user.id, schoolId: session.user.schoolId, isActive: true },
    select: { id: true },
  })
  if (!member) redirect('/auth/login?callbackUrl=%2Fnetwork')

  const params = await searchParams
  const tab = parseNetworkTab(params.tab)
  const page = parseNetworkPage(params.page)
  const network = await getNetworkData(session.user.schoolId, session.user.id, tab, page)
  const activeEmptyMessage = emptyMessages[tab]

  return (
    <MemberPageLayout name={session.user.name?.split(' ')[0] ?? 'Member'}>
      <section className="rounded-3xl bg-[#16070a] px-6 py-8 text-white sm:px-10 sm:py-9">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/60">Your GCUOBA community</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">My Network</h1>
            <p className="mt-2 max-w-2xl text-white/70">Reconnect with Old Boys, manage your relationships, and discover shared GCU roots.</p>
          </div>
          <Link className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15" href="/directory">
            <ArrowLeft className="h-4 w-4" /> Browse directory
          </Link>
        </div>
      </section>

      <section aria-label="Network counts" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tabs.map(({ id, label }) => (
          <Link
            className={`rounded-2xl border p-4 transition hover:border-[#9C0621]/40 hover:bg-white ${tab === id ? 'border-[#9C0621] bg-white shadow-sm' : 'border-slate-200 bg-white/70'}`}
            href={`/network?tab=${id}`}
            key={id}
          >
            <span className="block text-2xl font-bold text-slate-950">{network.counts[id]}</span>
            <span className="mt-1 block text-xs font-semibold text-slate-600 sm:text-sm">{label}</span>
          </Link>
        ))}
      </section>

      <section className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-[#9C0621]">Your relationships</p>
            <h2 className="mt-1 text-2xl font-bold">{tabs.find((item) => item.id === tab)?.label}</h2>
            <p className="mt-1 text-sm text-slate-600">{network.total} {network.total === 1 ? 'member' : 'members'}</p>
          </div>
        </div>

        {network.members.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {network.members.map((member) => <MemberCard key={member.id} member={member} />)}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#9C0621]/10 text-[#9C0621]">
              <UsersRound className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-bold">{activeEmptyMessage.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{activeEmptyMessage.description}</p>
            <Link className="mt-4 inline-flex items-center gap-2 font-semibold text-[#9C0621] hover:underline" href="/directory">
              Find Old Boys <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {network.pages > 1 && (
          <nav aria-label="Network pagination" className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
            <Link
              aria-disabled={network.page <= 1}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${network.page <= 1 ? 'pointer-events-none text-slate-300' : 'text-slate-700 hover:bg-slate-50'}`}
              href={`/network?tab=${tab}&page=${network.page - 1}`}
            >
              Previous
            </Link>
            <span className="text-sm text-slate-600">Page {network.page} of {network.pages}</span>
            <Link
              aria-disabled={network.page >= network.pages}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${network.page >= network.pages ? 'pointer-events-none text-slate-300' : 'text-slate-700 hover:bg-slate-50'}`}
              href={`/network?tab=${tab}&page=${network.page + 1}`}
            >
              Next
            </Link>
          </nav>
        )}
      </section>

      {network.activity.length > 0 && (
        <NetworkActivity initialItems={network.activity.map((item) => ({
          id: item.id,
          content: item.content,
          link: item.link,
          createdAt: item.createdAt.toISOString(),
          isRead: item.isRead,
        }))} />
      )}

      {network.recommendations.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-[#9C0621]">Made for reconnecting</p>
              <h2 className="mt-1 text-2xl font-bold">Old Boys you may know</h2>
              <p className="mt-1 text-sm text-slate-600">Suggested using shared GCU sets, houses, chapters, and visible profile details.</p>
            </div>
            <Link className="text-sm font-bold text-[#9C0621] hover:underline" href="/directory">See the directory</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {network.recommendations.map((member) => <MemberCard key={member.id} member={member} />)}
          </div>
        </section>
      )}
    </MemberPageLayout>
  )
}
