import Link from 'next/link'
import { liveOpportunityWhere } from '@/lib/professional'
import { businessRoleLabel, opportunityTypeLabel } from '@/lib/professional-shared'
import { prisma } from '@/lib/prisma'

/** Public professional content for a member profile. Respects the member's professional opt-in. */
export async function ProfessionalSections({ memberId, schoolId, isOwner }: { memberId: string; schoolId: string; isOwner: boolean }) {
  const [profile, memberships, opportunities] = await Promise.all([
    prisma.professionalProfile.findUnique({ where: { userId: memberId } }),
    prisma.businessMember.findMany({
      where: { userId: memberId, business: { schoolId, status: 'PUBLISHED' } },
      take: 10,
      select: { role: true, business: { select: { slug: true, name: true, shortDescription: true } } },
    }),
    prisma.opportunity.findMany({
      where: { postedByUserId: memberId, schoolId, ...liveOpportunityWhere() },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, type: true },
    }),
  ])
  const listed = Boolean(profile?.isListed)
  const hasMentoring = listed && profile && (profile.availableToMentor || profile.lookingForMentor || profile.mentoringAreas.length > 0)
  const hasHelp = listed && profile && (profile.canHelpWith.length > 0 || profile.needsHelpWith.length > 0 || profile.openToOpportunities || profile.professionalSummary || profile.yearsOfExperience !== null)
  const card = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'
  const chips = (items: string[]) => (
    <ul className="mt-2 flex flex-wrap gap-2">{items.map((item) => <li className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700" key={item}>{item}</li>)}</ul>
  )
  return (
    <>
      {isOwner && !listed && (
        <section className={card}>
          <h2 className="text-lg font-bold">Professional network</h2>
          <p className="mt-2 text-sm text-slate-600">You are not listed in Professional search. <Link className="font-semibold text-[#9C0621] hover:underline" href="/professional/settings">Update your settings</Link>.</p>
        </section>
      )}
      {hasHelp && profile && (
        <section className={card}>
          <h2 className="text-lg font-bold">Professional network</h2>
          {profile.professionalSummary && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{profile.professionalSummary}</p>}
          {profile.yearsOfExperience !== null && <p className="mt-2 text-sm text-slate-500">{profile.yearsOfExperience} years of experience</p>}
          {profile.openToOpportunities && <p className="mt-2 text-sm font-semibold text-emerald-700">Open to opportunities</p>}
          {profile.canHelpWith.length > 0 && <div className="mt-3"><h3 className="text-sm font-semibold">I can help with</h3>{chips(profile.canHelpWith)}</div>}
          {profile.needsHelpWith.length > 0 && <div className="mt-3"><h3 className="text-sm font-semibold">Looking for help with</h3>{chips(profile.needsHelpWith)}</div>}
        </section>
      )}
      {hasMentoring && profile && (
        <section className={card}>
          <h2 className="text-lg font-bold">Mentoring</h2>
          {profile.availableToMentor && <p className="mt-2 text-sm font-semibold text-emerald-700">Available to mentor</p>}
          {profile.lookingForMentor && <p className="mt-2 text-sm font-semibold text-slate-700">Looking for a mentor</p>}
          {profile.mentoringAreas.length > 0 && chips(profile.mentoringAreas)}
        </section>
      )}
      {memberships.length > 0 && (
        <section className={card}>
          <h2 className="text-lg font-bold">Businesses</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {memberships.map((entry) => (
              <li key={entry.business.slug}><Link className="font-semibold text-[#9C0621] hover:underline" href={`/businesses/${entry.business.slug}`}>{entry.business.name}</Link> <span className="text-slate-500">· {businessRoleLabel(entry.role)}</span></li>
            ))}
          </ul>
        </section>
      )}
      {opportunities.length > 0 && (
        <section className={card}>
          <h2 className="text-lg font-bold">Opportunities posted</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {opportunities.map((item) => <li key={item.id}><Link className="font-semibold text-[#9C0621] hover:underline" href={`/opportunities/${item.id}`}>{item.title}</Link> <span className="text-slate-500">· {opportunityTypeLabel(item.type)}</span></li>)}
          </ul>
        </section>
      )}
    </>
  )
}
