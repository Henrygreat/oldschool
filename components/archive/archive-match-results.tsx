'use client'

import { useState } from 'react'
import Link from 'next/link'

type ArchiveMatch = {
  id: string
  fullName: string
  title: string | null
  setYear: number
  house: string | null
}

export function ArchiveMatchResults({ records }: { records: ArchiveMatch[] }) {
  const [dismissed, setDismissed] = useState<string[]>([])
  const visibleRecords = records.filter((record) => !dismissed.includes(record.id))

  if (!visibleRecords.length) {
    return (
      <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        {records.length ? 'You dismissed these suggestions. Search again if you want to review them.' : 'No possible records found. You can change the search or continue without claiming a record.'}
      </p>
    )
  }

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {visibleRecords.map((record) => (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={record.id}>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Possible historical record</p>
          <h3 className="mt-2 text-lg font-bold text-slate-950">{[record.title, record.fullName].filter(Boolean).join(' ')}</h3>
          <p className="mt-1 text-sm font-semibold text-[#9C0621]">Set: {record.setYear}</p>
          {record.house && <p className="mt-1 text-sm text-slate-600">House: {record.house}</p>}
          <p className="mt-3 text-xs leading-5 text-slate-500">A claim is reviewed by GCUOBA and does not change your login or password.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="rounded-xl bg-[#9C0621] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#80051b]" href={`/archive/${record.id}`}>Claim this profile</Link>
            <button className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100" onClick={() => setDismissed((current) => [...current, record.id])} type="button">This isn’t me</button>
          </div>
        </article>
      ))}
    </div>
  )
}
