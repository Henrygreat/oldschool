'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendMessage } from '@/app/messages/actions'
import { MAX_MESSAGE_LENGTH } from '@/lib/messaging-shared'

export function MessageComposer({ conversationId, disabled, disabledReason }: {
  conversationId: string
  disabled: boolean
  disabledReason?: string
}) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransitionAction] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return
    setError('')
    startTransitionAction(async () => {
      const result = await sendMessage(conversationId, trimmed)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setContent('')
      router.refresh()
    })
  }

  if (disabled) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        {disabledReason ?? 'You cannot send messages in this conversation.'}
      </p>
    )
  }

  return (
    <form className="flex items-end gap-3" onSubmit={handleSubmit} ref={formRef}>
      <textarea
        className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15"
        maxLength={MAX_MESSAGE_LENGTH}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            formRef.current?.requestSubmit()
          }
        }}
        placeholder="Write a message…"
        rows={1}
        value={content}
      />
      <button
        className="rounded-xl bg-[#9C0621] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#80051b] disabled:opacity-60"
        disabled={isPending || !content.trim()}
        type="submit"
      >
        {isPending ? 'Sending…' : 'Send'}
      </button>
      {error && <p className="text-xs text-red-700" role="alert">{error}</p>}
    </form>
  )
}
