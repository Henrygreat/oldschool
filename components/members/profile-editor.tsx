'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { VisibilityLevel } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { saveProfile } from '@/app/profile/actions'
import type { ProfileInput, PrivacyField } from '@/lib/profile'

type Draft = Omit<ProfileInput, 'entryYear' | 'leavingYear' | 'setYear'> & {
  entryYear: string
  leavingYear: string
  setYear: string
}

type HouseOption = { id: string; name: string }

const labels = ['About you', 'Your GCU years', 'Where you are now', 'About & contact', 'Privacy']
const visibilityOptions = [
  { value: VisibilityLevel.MEMBERS_ONLY, label: 'Members only' },
  { value: VisibilityLevel.PUBLIC, label: 'Public' },
  { value: VisibilityLevel.PRIVATE, label: 'Private' },
]

const inputClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15'

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  maxLength,
  min,
  max,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  maxLength?: number
  min?: number
  max?: number
  hint?: string
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input className={inputClass} max={max} maxLength={maxLength} min={min} onChange={(event) => onChange(event.target.value)} type={type} value={value} />
      {hint && <span className="mt-1 block font-normal text-slate-500">{hint}</span>}
    </label>
  )
}

export function ProfileEditor({
  initialValues,
  houses,
  userId,
}: {
  initialValues: Draft
  houses: HouseOption[]
  userId: string
}) {
  const router = useRouter()
  const [values, setValues] = useState(initialValues)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  async function save(nextStep: number) {
    setBusy(true)
    setError('')
    const result = await saveProfile(values)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSaved(true)
    if (nextStep >= labels.length) {
      router.push(`/members/${userId}`)
      router.refresh()
      return
    }
    setStep(nextStep)
  }

  const visibilityField = (field: PrivacyField, label: string) => (
    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 sm:flex-row sm:items-center sm:justify-between">
      <span>{label}</span>
      <select className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal" onChange={(event) => update('privacy', { ...values.privacy, [field]: event.target.value as VisibilityLevel })} value={values.privacy[field]}>
        {visibilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-[#9C0621]">STEP {step + 1} OF {labels.length}</p>
          <span className="text-sm text-slate-500">{Math.round(((step + 1) / labels.length) * 100)}% through</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#9C0621] transition-all" style={{ width: `${((step + 1) / labels.length) * 100}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-5 gap-1 text-center text-[10px] font-medium text-slate-500 sm:text-xs">
          {labels.map((label, index) => <span className={index === step ? 'font-bold text-[#9C0621]' : ''} key={label}>{label}</span>)}
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <div><p className="text-sm font-bold uppercase tracking-wider text-slate-500">Step 1</p><h2 className="mt-1 text-2xl font-bold">About you</h2><p className="mt-2 text-sm text-slate-600">Your name helps old schoolmates recognise you.</p></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="First name" maxLength={80} onChange={(value) => update('firstName', value)} value={values.firstName} />
            <TextField label="Middle name (optional)" maxLength={80} onChange={(value) => update('middleName', value)} value={values.middleName} />
            <TextField label="Last name" maxLength={80} onChange={(value) => update('surname', value)} value={values.surname} />
            <TextField hint="A name your schoolmates know you by." label="Nickname (optional)" maxLength={80} onChange={(value) => update('nickname', value)} value={values.nickname} />
          </div>
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Profile photo uploads will be available when secure object storage is configured. Your profile will use an initials avatar in the meantime.</p>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div><p className="text-sm font-bold uppercase tracking-wider text-slate-500">Step 2</p><h2 className="mt-1 text-2xl font-bold">Your GCU years</h2><p className="mt-2 text-sm text-slate-600">Share what you remember. You can leave unknown details blank.</p></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField hint="Between 1900 and this year." label="Entry year" max={new Date().getFullYear()} min={1900} onChange={(value) => update('entryYear', value)} type="number" value={values.entryYear} />
            <TextField hint="Between 1900 and this year." label="Leaving year" max={new Date().getFullYear()} min={1900} onChange={(value) => update('leavingYear', value)} type="number" value={values.leavingYear} />
            <TextField hint="Your Set year, if you know it." label="Set year" max={new Date().getFullYear()} min={1900} onChange={(value) => update('setYear', value)} type="number" value={values.setYear} />
            <label className="block text-sm font-semibold text-slate-700">
              House (optional)
              <select className={inputClass} onChange={(event) => update('houseId', event.target.value)} value={values.houseId}>
                <option value="">Choose a house</option>
                {houses.map((house) => <option key={house.id} value={house.id}>{house.name}</option>)}
              </select>
            </label>
            <TextField hint="Leave blank if you do not remember it." label="Student number (optional)" maxLength={50} onChange={(value) => update('studentNumber', value)} value={values.studentNumber} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div><p className="text-sm font-bold uppercase tracking-wider text-slate-500">Step 3</p><h2 className="mt-1 text-2xl font-bold">Where are you now?</h2><p className="mt-2 text-sm text-slate-600">Help schoolmates find you by your current location and work.</p></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Country" maxLength={100} onChange={(value) => update('currentCountry', value)} value={values.currentCountry} />
            <TextField label="City" maxLength={100} onChange={(value) => update('currentCity', value)} value={values.currentCity} />
            <TextField label="Profession" maxLength={120} onChange={(value) => update('profession', value)} value={values.profession} />
            <TextField label="Industry" maxLength={120} onChange={(value) => update('industry', value)} value={values.industry} />
            <TextField label="Company / organisation" maxLength={120} onChange={(value) => update('company', value)} value={values.company} />
            <TextField label="Job title" maxLength={120} onChange={(value) => update('jobTitle', value)} value={values.jobTitle} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div><p className="text-sm font-bold uppercase tracking-wider text-slate-500">Step 4</p><h2 className="mt-1 text-2xl font-bold">About & contact</h2><p className="mt-2 text-sm text-slate-600">Add a short introduction and ways for schoolmates to connect.</p></div>
          <label className="block text-sm font-semibold text-slate-700">
            Biography
            <textarea className={`${inputClass} min-h-32 resize-y`} maxLength={1000} onChange={(event) => update('biography', event.target.value)} value={values.biography} />
            <span className="mt-1 block font-normal text-slate-500">{values.biography.length}/1000 characters</span>
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Phone (optional)" maxLength={40} onChange={(value) => update('phone', value)} type="tel" value={values.phone} />
            <TextField label="LinkedIn URL (optional)" maxLength={300} onChange={(value) => update('linkedInUrl', value)} type="url" value={values.linkedInUrl} />
            <TextField label="Website URL (optional)" maxLength={300} onChange={(value) => update('websiteUrl', value)} type="url" value={values.websiteUrl} />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <div><p className="text-sm font-bold uppercase tracking-wider text-slate-500">Step 5</p><h2 className="mt-1 text-2xl font-bold">Your privacy</h2><p className="mt-2 text-sm text-slate-600">Choose who can see sensitive details. Members-only is the safe default.</p></div>
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4">
            {visibilityField('email', 'Email address')}
            {visibilityField('phone', 'Phone number')}
            {visibilityField('location', 'City and country')}
            {visibilityField('company', 'Company / employer')}
            {visibilityField('linkedin', 'LinkedIn profile')}
          </div>
          <p className="text-sm text-slate-500">Private details are excluded on the server for people who are not allowed to view them. Your password and account credentials are never included in a member profile.</p>
        </div>
      )}

      {error && <p className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
      {saved && <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-emerald-700" role="status"><Check className="h-4 w-4" /> Progress saved.</p>}
      <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-6 sm:flex-row">
        <Button className="gap-2" disabled={step === 0 || busy} onClick={() => setStep((current) => Math.max(0, current - 1))} type="button" variant="outline">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button className="gap-2 bg-[#9C0621] text-white hover:bg-[#80051b]" disabled={busy} onClick={() => void save(step + 1)} type="button">
          {busy ? 'Saving…' : step === labels.length - 1 ? 'Save profile' : 'Save and continue'}
          {step === labels.length - 1 ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </section>
  )
}
