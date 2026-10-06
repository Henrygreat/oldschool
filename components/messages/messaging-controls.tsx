'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { blockMember, startConversation, unblockMember } from '@/app/messages/actions'

export function MessagingControls({
  targetUserId,
  canMessage,
  messagingBlockedReason,
  isBlockedByViewer,
  isBlockedByOther,
}: {
  targetUserId: string
  canMessage: boolean
  messagingBlockedReason?: string
  isBlockedByViewer: boolean
  isBlockedByOther: boolean
}) {
  const router = useRouter()
  const [isPending, startTransitionAction] = useTransition()
  const [error, setError] = useState('')

  function handleMessage() {
    setError('')
    startTransitionAction(async () => {
      const result = await startConversation(targetUserId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push(`/messages/${result.conversationId}`)
    })
  }

  function handleBlock() {
    if (!window.confirm('Block this member? They will no longer be able to message, follow or connect with you.')) return
    setError('')
    startTransitionAction(async () => {
      const result = await blockMember(targetUserId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleUnblock() {
    setError('')
    startTransitionAction(async () => {
      const result = await unblockMember(targetUserId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {!isBlockedByOther && (
          <Button
            className="bg-[#9C0621] text-white hover:bg-[#80051b]"
            disabled={isPending || !canMessage}
            onClick={handleMessage}
            title={!canMessage ? messagingBlockedReason : undefined}
            type="button"
          >
            Message
          </Button>
        )}
        {isBlockedByViewer ? (
          <Button disabled={isPending} onClick={handleUnblock} type="button" variant="outline">
            Unblock member
          </Button>
        ) : (
          !isBlockedByOther && (
            <Button disabled={isPending} onClick={handleBlock} type="button" variant="outline">
              Block member
            </Button>
          )
        )}
      </div>
      {!canMessage && !isBlockedByOther && !isBlockedByViewer && messagingBlockedReason && (
        <p className="text-xs text-slate-500">{messagingBlockedReason}</p>
      )}
      {error && <p className="text-xs text-red-700" role="alert">{error}</p>}
    </div>
  )
}
