import { Label, inputClass, primaryButton } from '@/components/professional/ui'

export type BusinessFormValues = {
  id?: string
  name?: string
  shortDescription?: string
  description?: string | null
  industry?: string | null
  services?: string[]
  location?: string | null
  country?: string | null
  website?: string | null
  linkedInUrl?: string | null
  publicEmail?: string | null
  publicPhone?: string | null
  yearEstablished?: number | null
}

export function BusinessForm({ action, values = {}, submitLabel }: { action: (formData: FormData) => Promise<void>; values?: BusinessFormValues; submitLabel: string }) {
  const field = (name: string, label: string, value: string | number | null | undefined, extra: { max?: number; required?: boolean; type?: string } = {}) => (
    <Label label={label}>
      <input className={inputClass} defaultValue={value ?? ''} maxLength={extra.max ?? 120} name={name} required={extra.required} type={extra.type ?? 'text'} />
    </Label>
  )
  return (
    <form action={action} className="max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {values.id && <input name="businessId" type="hidden" value={values.id} />}
      {field('name', 'Business name', values.name, { required: true })}
      {field('shortDescription', 'Short description', values.shortDescription, { max: 240, required: true })}
      <Label label="Full description"><textarea className={inputClass} defaultValue={values.description ?? ''} maxLength={5000} name="description" rows={6} /></Label>
      {field('industry', 'Industry', values.industry, { max: 80 })}
      {field('services', 'Services (comma separated)', values.services?.join(', '), { max: 800 })}
      <div className="grid gap-4 sm:grid-cols-2">
        {field('location', 'City / location', values.location)}
        {field('country', 'Country', values.country, { max: 80 })}
      </div>
      {field('website', 'Website', values.website, { max: 500, type: 'url' })}
      {field('linkedInUrl', 'LinkedIn page', values.linkedInUrl, { max: 500, type: 'url' })}
      <p className="text-xs text-slate-500">Business contact details below are shown publicly to members. Leave blank to keep them private; do not enter personal details.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('publicEmail', 'Public business email (optional)', values.publicEmail, { max: 200, type: 'email' })}
        {field('publicPhone', 'Public business phone (optional)', values.publicPhone, { max: 40, type: 'tel' })}
      </div>
      {field('yearEstablished', 'Year established', values.yearEstablished, { max: 4, type: 'number' })}
      <button className={primaryButton} type="submit">{submitLabel}</button>
    </form>
  )
}
