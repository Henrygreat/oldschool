import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ConnectionStatus } from '@prisma/client'
import { ArrowLeft, BriefcaseBusiness, ExternalLink, GraduationCap, MapPin, Pencil, ShieldCheck } from 'lucide-react'
import { Avatar } from '@/components/members/avatar'
import { MemberPageLayout } from '@/components/members/member-nav'
import { NetworkControls } from '@/components/members/network-controls'
import { auth } from '@/lib/auth'
import { canViewField, memberPhotoUrl, privacyFor } from '@/lib/profile'
import { prisma } from '@/lib/prisma'
import type { ConnectionState } from '@/lib/network-types'

function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (id === 'me') {
    if (!session?.user?.id) redirect('/auth/login')
    redirect(`/members/${session.user.id}`)
  }

  const member = await prisma.user.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      schoolId: true,
      firstName: true,
      middleName: true,
      surname: true,
      nickname: true,
      email: true,
      profilePhotoUrl: true,
      profilePhotoKey: true,
      updatedAt: true,
      privacySettings: { select: { field: true, visibility: true } },
      alumniProfile: {
        select: {
          biography: true,
          currentCity: true,
          currentCountry: true,
          profession: true,
          industry: true,
          company: true,
          jobTitle: true,
          phone: true,
          linkedInUrl: true,
          websiteUrl: true,
          verificationStatus: true,
          schoolAttendance: {
            take: 1,
            orderBy: { updatedAt: 'desc' },
            select: {
              entryYear: true,
              leavingYear: true,
              studentNumber: true,
              cohort: { select: { year: true, name: true } },
              house: { select: { name: true } },
            },
          },
        },
      },
    },
  })
  if (!member) notFound()

  const isOwner = session?.user?.id === member.id
  const isMember = Boolean(session?.user?.id && session.user.schoolId === member.schoolId)
  let connectionState: ConnectionState = 'none'
  let isFollowing = false
  if (isMember && !isOwner && session?.user?.id) {
    const [connections, follow] = await Promise.all([
      prisma.connection.findMany({
        where: {
          OR: [
            { fromUserId: session.user.id, toUserId: member.id },
            { fromUserId: member.id, toUserId: session.user.id },
          ],
        },
        select: { fromUserId: true, status: true },
      }),
      prisma.follow.findFirst({
        where: { followerId: session.user.id, followingId: member.id },
        select: { id: true },
      }),
    ])
    if (connections.some((connection) => connection.status === ConnectionStatus.ACCEPTED)) {
      connectionState = 'connected'
    } else if (connections.some((connection) => connection.status === ConnectionStatus.BLOCKED)) {
      connectionState = 'unavailable'
    } else if (connections.some((connection) => connection.status === ConnectionStatus.PENDING)) {
      connectionState = connections.some(
        (connection) =>
          connection.fromUserId === session.user.id &&
          connection.status === ConnectionStatus.PENDING
      )
        ? 'sent'
        : 'received'
    }
    isFollowing = Boolean(follow)
  }
  let isAdmin = false
  if (session?.user?.id && isMember && !isOwner) {
    const [viewer, schoolAdmin] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
      prisma.schoolAdministrator.findFirst({
        where: {
          userId: session.user.id,
          schoolId: member.schoolId,
          role: { in: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'SCHOOL_ADMIN'] },
        },
        select: { id: true },
      }),
    ])
    isAdmin = Boolean(
      schoolAdmin ||
      viewer?.role === 'SCHOOL_ADMIN' ||
      viewer?.role === 'SUPER_ADMIN' ||
      viewer?.role === 'NATIONAL_ADMIN'
    )
  }

  const privacy = privacyFor(member.privacySettings)
  const profile = member.alumniProfile
  const attendance = profile?.schoolAttendance[0]
  const canSeeEmail = canViewField(privacy.email, isMember, isOwner, isAdmin)
  const canSeePhone = canViewField(privacy.phone, isMember, isOwner, isAdmin)
  const canSeeLocation = canViewField(privacy.location, isMember, isOwner, isAdmin)
  const canSeeCompany = canViewField(privacy.company, isMember, isOwner, isAdmin)
  const canSeeLinkedIn = canViewField(privacy.linkedin, isMember, isOwner, isAdmin)
  const canSeePhoto = canViewField(privacy.photo, isMember, isOwner, isAdmin)
  const name = [member.firstName, member.middleName, member.surname].filter(Boolean).join(' ')
  const photoUrl = canSeePhoto
    ? memberPhotoUrl(member.id, member.profilePhotoKey, member.profilePhotoUrl, member.updatedAt)
    : null
  const linkedInUrl = canSeeLinkedIn ? safeExternalUrl(profile?.linkedInUrl) : null
  const websiteUrl = canSeeLinkedIn ? safeExternalUrl(profile?.websiteUrl) : null

  return (
    <MemberPageLayout name={session?.user?.id ? (session.user.name?.split(' ')[0] ?? 'Member') : ''}>
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#9C0621]" href="/directory"><ArrowLeft className="h-4 w-4" /> Back to directory</Link>
      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-36 bg-gradient-to-r from-[#16070a] via-[#4b101d] to-[#9C0621]" />
        <div className="-mt-14 flex flex-col gap-5 px-6 pb-7 sm:flex-row sm:items-end sm:justify-between sm:px-9">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
            <div className="rounded-full border-4 border-white"><Avatar name={name} photoUrl={photoUrl} size="lg" /></div>
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold">{name}</h1>
                {profile?.verificationStatus === 'VERIFIED' && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Verified</span>}
              </div>
              {member.nickname && <p className="mt-1 text-slate-600">Known at GCU as “{member.nickname}”</p>}
              <p className="mt-2 font-semibold text-[#9C0621]">{attendance?.cohort?.name ?? 'Government College Umuahia Old Boy'}</p>
              {canSeeLocation && (profile?.currentCity || profile?.currentCountry) && <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><MapPin className="h-4 w-4" />{[profile.currentCity, profile.currentCountry].filter(Boolean).join(', ')}</p>}
            </div>
          </div>
          {isOwner && <Link className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9C0621] px-4 py-3 text-sm font-bold text-white hover:bg-[#80051b]" href="/profile/edit"><Pencil className="h-4 w-4" /> Edit profile</Link>}
          {isMember && !isOwner && <NetworkControls
            initialConnectionState={connectionState}
            initialFollowing={isFollowing}
            targetUserId={member.id}
          />}
        </div>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">About</h2>
            {profile?.biography ? <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">{profile.biography}</p> : <p className="mt-3 text-sm text-slate-500">{isOwner ? 'Add a short introduction to help schoolmates get to know you.' : 'No biography has been added yet.'}</p>}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold"><GraduationCap className="h-5 w-5 text-[#9C0621]" /> GCU history</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><dt className="text-sm text-slate-500">Set</dt><dd className="mt-1 font-semibold">{attendance?.cohort?.name ?? 'Not provided'}</dd></div>
              <div><dt className="text-sm text-slate-500">Entry and leaving years</dt><dd className="mt-1 font-semibold">{attendance?.entryYear ?? '—'} – {attendance?.leavingYear ?? '—'}</dd></div>
              <div><dt className="text-sm text-slate-500">House</dt><dd className="mt-1 font-semibold">{attendance?.house?.name ?? 'Not provided'}</dd></div>
              {isOwner && attendance?.studentNumber && <div><dt className="text-sm text-slate-500">Student number</dt><dd className="mt-1 font-semibold">{attendance.studentNumber}</dd></div>}
            </dl>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold"><BriefcaseBusiness className="h-5 w-5 text-[#9C0621]" /> Professional</h2>
            {profile?.profession || profile?.industry || (canSeeCompany && (profile?.jobTitle || profile?.company)) ? (
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {profile?.profession && <div><dt className="text-sm text-slate-500">Profession</dt><dd className="mt-1 font-semibold">{profile.profession}</dd></div>}
                {profile?.industry && <div><dt className="text-sm text-slate-500">Industry</dt><dd className="mt-1 font-semibold">{profile.industry}</dd></div>}
                {canSeeCompany && profile?.jobTitle && <div><dt className="text-sm text-slate-500">Job title</dt><dd className="mt-1 font-semibold">{profile.jobTitle}</dd></div>}
                {canSeeCompany && profile?.company && <div><dt className="text-sm text-slate-500">Company</dt><dd className="mt-1 font-semibold">{profile.company}</dd></div>}
              </dl>
            ) : <p className="mt-3 text-sm text-slate-500">Professional information has not been added.</p>}
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Contact</h2>
          <div className="mt-4 space-y-4 text-sm">
            {canSeeEmail && <p><span className="block text-slate-500">Email</span><a className="mt-1 inline-block break-all font-semibold text-[#9C0621] hover:underline" href={`mailto:${member.email}`}>{member.email}</a></p>}
            {canSeePhone && profile?.phone && <p><span className="block text-slate-500">Phone</span><a className="mt-1 inline-block font-semibold text-[#9C0621] hover:underline" href={`tel:${profile.phone}`}>{profile.phone}</a></p>}
            {linkedInUrl && <p><span className="block text-slate-500">LinkedIn</span><a className="mt-1 inline-flex items-center gap-1 break-all font-semibold text-[#9C0621] hover:underline" href={linkedInUrl} rel="noreferrer" target="_blank">View profile <ExternalLink className="h-3.5 w-3.5" /></a></p>}
            {websiteUrl && <p><span className="block text-slate-500">Website</span><a className="mt-1 inline-flex items-center gap-1 break-all font-semibold text-[#9C0621] hover:underline" href={websiteUrl} rel="noreferrer" target="_blank">Visit website <ExternalLink className="h-3.5 w-3.5" /></a></p>}
            {!canSeeEmail && !canSeePhone && !linkedInUrl && !websiteUrl && <p className="leading-6 text-slate-500">{isOwner ? 'Add contact details and choose who can see them.' : 'No contact information is available to you.'}</p>}
          </div>
        </aside>
      </div>
    </MemberPageLayout>
  )
}
