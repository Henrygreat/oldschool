import { Label, Notice, ProfessionalShell, inputClass, primaryButton } from '@/components/professional/ui'
import { requireViewer } from '@/lib/professional'
import { saveProfessionalProfile } from '@/app/professional/actions'
import { prisma } from '@/lib/prisma'

export default async function ProfessionalSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const viewer = await requireViewer('/professional/settings')
  const { error, saved } = await searchParams
  const profile = await prisma.professionalProfile.findUnique({ where: { userId: viewer.id } })
  const check = (name: string, label: string, value?: boolean, hint?: string) => (
    <label className="flex items-start gap-3 text-sm">
      <input className="mt-1" defaultChecked={value} name={name} type="checkbox" />
      <span><span className="font-semibold">{label}</span>{hint && <span className="block text-slate-500">{hint}</span>}</span>
    </label>
  )
  return (
    <ProfessionalShell name={viewer.firstName} subtitle="You control whether you appear in professional and mentor search. Nothing here exposes your email or phone." title="Professional settings">
      <Notice error={error} saved={Boolean(saved)} />
      <form action={saveProfessionalProfile} className="max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {check('isListed', 'Show me in Professional search', profile?.isListed, 'Off by default. Required to appear in people and mentor search.')}
        {check('openToOpportunities', 'Open to opportunities', profile?.openToOpportunities)}
        {check('availableToMentor', 'Available to mentor', profile?.availableToMentor)}
        {check('lookingForMentor', 'Looking for a mentor', profile?.lookingForMentor)}
        <Label label="I can help with (comma separated)"><input className={inputClass} defaultValue={profile?.canHelpWith.join(', ') ?? ''} maxLength={600} name="canHelpWith" /></Label>
        <Label label="Looking for help with (comma separated)"><input className={inputClass} defaultValue={profile?.needsHelpWith.join(', ') ?? ''} maxLength={600} name="needsHelpWith" /></Label>
        <Label label="Mentoring areas (comma separated)"><input className={inputClass} defaultValue={profile?.mentoringAreas.join(', ') ?? ''} maxLength={600} name="mentoringAreas" /></Label>
        <Label label="Years of experience"><input className={inputClass} defaultValue={profile?.yearsOfExperience ?? ''} max={70} min={0} name="yearsOfExperience" type="number" /></Label>
        <Label label="Professional summary"><textarea className={inputClass} defaultValue={profile?.professionalSummary ?? ''} maxLength={1500} name="professionalSummary" rows={5} /></Label>
        <button className={primaryButton} type="submit">Save settings</button>
      </form>
    </ProfessionalShell>
  )
}
