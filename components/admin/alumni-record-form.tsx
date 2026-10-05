'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ArchiveRecordStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { updateArchiveRecord } from '@/app/admin/alumni/actions'

type EditableRecord = {
  id: string
  fullName: string
  firstName: string | null
  middleName: string | null
  surname: string | null
  title: string | null
  setYear: number
  house: string | null
  profession: string | null
  status: ArchiveRecordStatus
  email: string | null
  phone: string | null
  remarks: string | null
  biography: string | null
}

const fieldClass = 'mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm'

export function AlumniArchiveRecordForm({ record }: { record: EditableRecord }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function save(formData: FormData) {
    setBusy(true)
    setError('')
    setSaved(false)
    const input = Object.fromEntries(formData.entries())
    try {
      const result = await updateArchiveRecord(record.id, input)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSaved(true)
      router.refresh()
    } catch {
      setError('The archive record could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form action={save} className="mt-6 grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
      <label className="text-sm font-semibold">Full name<input className={fieldClass} defaultValue={record.fullName} maxLength={200} name="fullName" required /></label>
      <label className="text-sm font-semibold">Set / year<input className={fieldClass} defaultValue={record.setYear} max={new Date().getFullYear()} min={1900} name="setYear" required type="number" /></label>
      <label className="text-sm font-semibold">First name<input className={fieldClass} defaultValue={record.firstName ?? ''} maxLength={80} name="firstName" /></label>
      <label className="text-sm font-semibold">Middle name<input className={fieldClass} defaultValue={record.middleName ?? ''} maxLength={80} name="middleName" /></label>
      <label className="text-sm font-semibold">Surname<input className={fieldClass} defaultValue={record.surname ?? ''} maxLength={80} name="surname" /></label>
      <label className="text-sm font-semibold">Title<input className={fieldClass} defaultValue={record.title ?? ''} maxLength={80} name="title" /></label>
      <label className="text-sm font-semibold">House<input className={fieldClass} defaultValue={record.house ?? ''} maxLength={120} name="house" /></label>
      <label className="text-sm font-semibold">Profession<input className={fieldClass} defaultValue={record.profession ?? ''} maxLength={120} name="profession" /></label>
      <label className="text-sm font-semibold">Life status<select className={fieldClass} defaultValue={record.status} name="status"><option value="LIVING">Living</option><option value="DECEASED">In memoriam</option><option value="UNKNOWN">Unknown</option></select></label>
      <label className="text-sm font-semibold">Email (admin-only)<input className={fieldClass} defaultValue={record.email ?? ''} maxLength={254} name="email" type="email" /></label>
      <label className="text-sm font-semibold">Phone (admin-only)<input className={fieldClass} defaultValue={record.phone ?? ''} maxLength={80} name="phone" /></label>
      <label className="text-sm font-semibold sm:col-span-2">Remarks (admin-only)<textarea className={fieldClass} defaultValue={record.remarks ?? ''} maxLength={500} name="remarks" rows={3} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Biography (admin-only unless separately approved)<textarea className={fieldClass} defaultValue={record.biography ?? ''} maxLength={500} name="biography" rows={3} /></label>
      <div className="sm:col-span-2">
        <Button className="bg-[#9C0621] text-white hover:bg-[#80051b]" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save record'}</Button>
        {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
        {saved && <p className="mt-2 text-sm text-emerald-700" role="status">Archive record saved.</p>}
      </div>
    </form>
  )
}
