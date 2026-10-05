'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  cancelConnectionRequest,
  removeConnection,
  respondToConnectionRequest,
  sendConnectionRequest,
  toggleFollow,
} from '@/app/network/actions'
import type { ConnectionState } from '@/lib/network-types'

export function NetworkControls({
  targetUserId,
  initialConnectionState,
  initialFollowing = false,
  showFollow = true,
  compact = false,
}: {
  targetUserId: string
  initialConnectionState: ConnectionState
  initialFollowing?: boolean
  showFollow?: boolean
  compact?: boolean
}) {
  const router = useRouter()
  const [connectionState, setConnectionState] = useState(initialConnectionState)
  const [following, setFollowing] = useState(initialFollowing)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => setConnectionState(initialConnectionState), [initialConnectionState])
  useEffect(() => setFollowing(initialFollowing), [initialFollowing])

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await action()
      if (!result.ok) {
        setError(result.error ?? 'The request could not be completed.')
        router.refresh()
        return false
      }
      setNotice(success)
      router.refresh()
      return true
    } catch {
      setError('The request could not be completed. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const buttonClass = compact ? 'h-9 px-3 text-xs' : 'h-10 px-4'
  const connectionButton = (label: string, handler: () => void, variant: 'default' | 'outline' = 'default') => (
    <Button
      className={`${buttonClass} ${variant === 'default' ? 'bg-[#9C0621] text-white hover:bg-[#80051b]' : ''}`}
      disabled={busy}
      onClick={handler}
      type="button"
      variant={variant}
    >
      {busy ? 'Please wait…' : label}
    </Button>
  )

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <div className="flex flex-wrap gap-2">
        {connectionState === 'none' && connectionButton('Connect', () => {
          void run(() => sendConnectionRequest(targetUserId), 'Connection request sent.')
            .then((ok) => { if (ok) setConnectionState('sent') })
        })}
        {connectionState === 'sent' && (
          <>
            <span className="self-center text-xs font-semibold text-slate-500">Request pending</span>
            {connectionButton('Cancel request', () => {
              void run(() => cancelConnectionRequest(targetUserId), 'Connection request cancelled.')
                .then((ok) => { if (ok) setConnectionState('none') })
            }, 'outline')}
          </>
        )}
        {connectionState === 'received' && (
          <>
            {connectionButton('Accept', () => {
              void run(() => respondToConnectionRequest(targetUserId, 'accept'), 'Connection accepted.')
                .then((ok) => { if (ok) setConnectionState('connected') })
            })}
            {connectionButton('Decline', () => {
              void run(() => respondToConnectionRequest(targetUserId, 'decline'), 'Request declined.')
                .then((ok) => { if (ok) setConnectionState('none') })
            }, 'outline')}
          </>
        )}
        {connectionState === 'connected' && connectionButton('Connected · Remove', () => {
          void run(() => removeConnection(targetUserId), 'Connection removed.')
            .then((ok) => { if (ok) setConnectionState('none') })
        }, 'outline')}
        {connectionState === 'unavailable' && (
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500">Connection unavailable</span>
        )}
        {showFollow && connectionState !== 'unavailable' && (
          <Button
            className={buttonClass}
            disabled={busy}
            onClick={() => {
              void run(() => toggleFollow(targetUserId, !following), following ? 'Member unfollowed.' : 'Now following this member.')
                .then((ok) => { if (ok) setFollowing((current) => !current) })
            }}
            type="button"
            variant="outline"
          >
            {following ? 'Following · Unfollow' : 'Follow'}
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-red-700" role="alert">{error}</p>}
      {notice && <p className="text-xs text-emerald-700" role="status">{notice}</p>}
    </div>
  )
}
