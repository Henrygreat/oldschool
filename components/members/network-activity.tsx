'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { markNetworkingActivityRead } from '@/app/network/actions'

type ActivityItem = {
  id: string
  content: string
  link: string | null
  createdAt: string
  isRead: boolean
}

export function NetworkActivity({ initialItems }: { initialItems: ActivityItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const unread = items.some((item) => !item.isRead)

  async function markRead() {
    setBusy(true)
    setError('')
    try {
      const result = await markNetworkingActivityRead()
      if (!result.ok) {
        setError(result.error)
        return
      }
      setItems((current) => current.map((item) => ({ ...item, isRead: true })))
    } catch {
      setError('Notifications could not be updated. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Recent networking activity</h2>
          <p className="mt-1 text-sm text-slate-500">Connection requests and accepted connections.</p>
        </div>
        {unread && <Button className="gap-2" disabled={busy} onClick={() => void markRead()} type="button" variant="outline">
          <CheckCheck className="h-4 w-4" /> {busy ? 'Updating…' : 'Mark all read'}
        </Button>}
      </div>
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      <ul className="mt-3 divide-y divide-slate-100">
        {items.map((item) => (
          <li className="py-3" key={item.id}>
            <Link className={`text-sm hover:text-[#9C0621] ${item.isRead ? 'font-medium text-slate-700' : 'font-bold text-slate-950'}`} href={item.link ?? '/network'}>
              {item.content}
              {!item.isRead && <span className="ml-2 rounded-full bg-[#9C0621]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#9C0621]">New</span>}
            </Link>
            <time className="mt-1 block text-xs text-slate-500" dateTime={item.createdAt}>
              {item.createdAt.slice(0, 10)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  )
}
