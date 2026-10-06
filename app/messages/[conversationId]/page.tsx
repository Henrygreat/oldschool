import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Avatar } from '@/components/members/avatar'
import { MemberPageLayout } from '@/components/members/member-nav'
import { MessageComposer } from '@/components/messages/message-composer'
import { ReportDisclosure } from '@/components/messages/report-form'
import {
  activeMessagingUser,
  canMessage,
  getConversationDetail,
  getConversationMessages,
  markConversationRead,
} from '@/lib/messaging'

function formatTimestamp(date: Date) {
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>
  searchParams: Promise<{ before?: string }>
}) {
  const { conversationId } = await params
  const { before } = await searchParams
  const member = await activeMessagingUser()
  if (!member) redirect(`/auth/login?callbackUrl=%2Fmessages%2F${conversationId}`)

  const detail = await getConversationDetail(conversationId, member.id)
  if (!detail) notFound()

  await markConversationRead(conversationId, member.id)
  const { messages, hasMore, oldestId } = await getConversationMessages(conversationId, before)

  const otherUser = detail.otherUser
  const name = otherUser?.name ?? 'Former member'
  let composerDisabled = detail.blockedByViewer || detail.blockedByOther || !otherUser?.isActive
  let composerDisabledReason = detail.blockedByViewer
    ? 'You have blocked this member. Unblock them from their profile to resume messaging.'
    : detail.blockedByOther
      ? 'You cannot send messages in this conversation.'
      : !otherUser?.isActive
        ? 'This member is no longer active.'
        : undefined

  if (!composerDisabled && otherUser) {
    const permission = await canMessage(member.id, otherUser.id, member.schoolId)
    if (!permission.allowed) {
      composerDisabled = true
      composerDisabledReason = permission.reason
    }
  }

  return (
    <MemberPageLayout name={member.firstName}>
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#9C0621]" href="/messages"><ArrowLeft className="h-4 w-4" /> Back to messages</Link>

      <section className="mt-5 flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={name} photoUrl={otherUser?.photoUrl ?? null} />
            <div>
              <p className="font-bold">{name}</p>
              {!otherUser?.isActive && <p className="text-xs text-slate-400">No longer an active member</p>}
            </div>
          </div>
          {otherUser && <ReportDisclosure label="Report member" targetUserId={otherUser.id} />}
        </header>

        <div className="flex max-h-[60vh] min-h-[16rem] flex-col gap-3 overflow-y-auto p-4">
          {hasMore && oldestId && (
            <Link className="mx-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#9C0621] hover:text-[#9C0621]" href={`/messages/${conversationId}?before=${oldestId}`}>
              Load earlier messages
            </Link>
          )}
          {before && (
            <Link className="mx-auto text-xs font-semibold text-slate-500 underline" href={`/messages/${conversationId}`}>
              Jump to latest messages
            </Link>
          )}
          {messages.length === 0 ? (
            <p className="m-auto text-sm text-slate-400">No messages yet. Say hello!</p>
          ) : (
            messages.map((message) => {
              const isMine = message.senderId === member.id
              return (
                <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`} key={message.id}>
                  <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${isMine ? 'bg-[#9C0621] text-white' : 'bg-slate-100 text-slate-900'}`}>
                    {message.content}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                    <span>{formatTimestamp(message.createdAt)}</span>
                    {!isMine && <ReportDisclosure label="Report" messageId={message.id} />}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="border-t border-slate-200 p-4">
          <MessageComposer conversationId={conversationId} disabled={composerDisabled} disabledReason={composerDisabledReason} />
        </div>
      </section>
    </MemberPageLayout>
  )
}
