import { Label, inputClass, primaryButton, secondaryButton } from '@/components/professional/ui'
import { opportunityTypeOptions, workModeOptions } from '@/lib/professional-shared'

export type OpportunityFormValues = {
  id?: string
  title?: string
  description?: string
  type?: string
  organisation?: string | null
  businessId?: string | null
  location?: string | null
  country?: string | null
  workMode?: string | null
  employmentType?: string | null
  applicationUrl?: string | null
  closingDate?: Date | null
}

export function OpportunityForm({ action, values = {}, businesses, isNew }: {
  action: (formData: FormData) => Promise<void>
  values?: OpportunityFormValues
  businesses: { id: string; name: string }[]
  isNew: boolean
}) {
  const input = (name: string, label: string, value: string | null | undefined, max = 120, type = 'text', required = false) => (
    <Label label={label}><input className={inputClass} defaultValue={value ?? ''} maxLength={max} name={name} required={required} type={type} /></Label>
  )
  return (
    <form action={action} className="max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {values.id && <input name="opportunityId" type="hidden" value={values.id} />}
      {input('title', 'Title', values.title, 160, 'text', true)}
      <Label label="Type">
        <select className={inputClass} defaultValue={values.type ?? 'JOB'} name="type">
          {opportunityTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </Label>
      <Label label="Description"><textarea className={inputClass} defaultValue={values.description ?? ''} maxLength={6000} name="description" required rows={8} /></Label>
      {input('organisation', 'Organisation', values.organisation)}
      {businesses.length > 0 && (
        <Label label="Linked business (optional)">
          <select className={inputClass} defaultValue={values.businessId ?? ''} name="businessId">
            <option value="">None</option>
            {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
          </select>
        </Label>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {input('location', 'Location', values.location)}
        {input('country', 'Country', values.country, 80)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label label="Work mode">
          <select className={inputClass} defaultValue={values.workMode ?? ''} name="workMode">
            <option value="">Not specified</option>
            {workModeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Label>
        {input('employmentType', 'Employment type (e.g. Full-time)', values.employmentType, 60)}
      </div>
      {input('applicationUrl', 'Application link (optional)', values.applicationUrl, 500, 'url')}
      <Label label="Closing date (optional)"><input className={inputClass} defaultValue={values.closingDate ? values.closingDate.toISOString().slice(0, 10) : ''} name="closingDate" type="date" /></Label>
      <p className="text-xs text-slate-500">Without a closing date, the listing expires after 90 days. Applicants can also message you through the platform.</p>
      <div className="flex gap-2">
        <button className={primaryButton} name="intent" type="submit" value="publish">{isNew ? 'Publish' : 'Save changes'}</button>
        {isNew && <button className={secondaryButton} name="intent" type="submit" value="draft">Save as draft</button>}
      </div>
    </form>
  )
}
