import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react'
import { Avatar } from '@/components/members/avatar'
import { MemberPageLayout } from '@/components/members/member-nav'
import { MessagingPrivacyControl } from '@/components/messages/messaging-privacy-control'
import {
  activeMessagingUser,
  getConversationList,
  messagingPrivacyFor,
} from '@/lib/messaging'

function formatTimestamp(date: Date) {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMinutes = Math.round(diffMs / 60000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const member = await activeMessagingUser()
  if (!member) redirect('/auth/login?callbackUrl=%2Fmessages')

  const query = await searchParams
  const page = Number(query.page) > 0 ? Number(query.page) : 1
  const [result, privacy] = await Promise.all([
    getConversationList(member.id, page),
    messagingPrivacyFor(member.id),
  ])

  function pageHref(targetPage: number) {
    return targetPage > 1 ? `/messages?page=${targetPage}` : '/messages'
  }

  return (
    <MemberPageLayout name={member.firstName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="space-y-3">
          {result.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <MessageCircle className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">No conversations yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Visit a member&apos;s profile and select Message to start a conversation.
              </p>
            </div>
          ) : (
            result.items.map((conversation) => {
              const name = conversation.otherUser?.name ?? 'Former member'
              const latest = conversation.latestMessage
              const isMine = latest?.senderId === member.id
              return (
                <Link
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#9C0621]/40"
                  href={`/messages/${conversation.id}`}
                  key={conversation.id}
                >
                  <Avatar name={name} photoUrl={conversation.otherUser?.photoUrl ?? null} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">{name}</p>
                      <span className="shrink-0 text-xs text-slate-400">{formatTimestamp(conversation.updatedAt)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {latest ? `${isMine ? 'You: ' : ''}${latest.content}` : 'No messages yet'}
                    </p>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <span className="inline-flex min-w-[1.5rem] shrink-0 items-center justify-center rounded-full bg-[#9C0621] px-2 py-1 text-xs font-bold text-white">
                      {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                    </span>
                  )}
                </Link>
              )
            })
          )}

          {result.pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Link aria-disabled={result.page <= 1} className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold ${result.page <= 1 ? 'pointer-events-none text-slate-300' : 'text-slate-700 hover:bg-slate-50'}`} href={pageHref(result.page - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Link>
              <span className="text-sm text-slate-500">Page {result.page} of {result.pages}</span>
              <Link aria-disabled={result.page >= result.pages} className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold ${result.page >= result.pages ? 'pointer-events-none text-slate-300' : 'text-slate-700 hover:bg-slate-50'}`} href={pageHref(result.page + 1)}>Next <ChevronRight className="h-4 w-4" /></Link>
            </div>
          )}
        </section>

        <aside>
          <MessagingPrivacyControl initialValue={privacy} />
        </aside>
      </div>
    </MemberPageLayout>
  )
}
