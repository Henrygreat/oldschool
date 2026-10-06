import { redirect } from 'next/navigation'
import { MemberPageLayout } from '@/components/members/member-nav'
import { ProfileEditor } from '@/components/members/profile-editor'
import { auth } from '@/lib/auth'
import { defaultPrivacy, memberPhotoUrl, privacyFor } from '@/lib/profile'
import { prisma } from '@/lib/prisma'

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ findOldSchoolRecord?: string }>
}) {
  const params = await searchParams
  const onboardingDiscovery = params.findOldSchoolRecord === '1'
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) redirect('/auth/login')

  const [user, houses] = await Promise.all([
    prisma.user.findFirst({
      where: { id: session.user.id, schoolId: session.user.schoolId, isActive: true },
      select: {
        id: true,
        profilePhotoUrl: true,
        profilePhotoKey: true,
        updatedAt: true,
        firstName: true,
        middleName: true,
        surname: true,
        nickname: true,
        email: true,
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
            schoolAttendance: {
              take: 1,
              orderBy: { updatedAt: 'desc' },
              select: {
                entryYear: true,
                leavingYear: true,
                studentNumber: true,
                houseId: true,
                cohort: { select: { year: true } },
              },
            },
          },
        },
      },
    }),
    prisma.house.findMany({
      where: { schoolId: session.user.schoolId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])
  if (!user) redirect('/auth/login')

  const profile = user.alumniProfile
  const attendance = profile?.schoolAttendance[0]
  const privacy = profile ? privacyFor(user.privacySettings) : defaultPrivacy
  const name = [user.firstName, user.surname].filter(Boolean).join(' ')
  const initialValues = {
    firstName: user.firstName,
    middleName: user.middleName ?? '',
    surname: user.surname,
    nickname: user.nickname ?? '',
    entryYear: attendance?.entryYear?.toString() ?? '',
    leavingYear: attendance?.leavingYear?.toString() ?? '',
    setYear: attendance?.cohort?.year.toString() ?? '',
    houseId: attendance?.houseId ?? '',
    studentNumber: attendance?.studentNumber ?? '',
    currentCountry: profile?.currentCountry ?? '',
    currentCity: profile?.currentCity ?? '',
    profession: profile?.profession ?? '',
    industry: profile?.industry ?? '',
    company: profile?.company ?? '',
    jobTitle: profile?.jobTitle ?? '',
    biography: profile?.biography ?? '',
    phone: profile?.phone ?? '',
    linkedInUrl: profile?.linkedInUrl ?? '',
    websiteUrl: profile?.websiteUrl ?? '',
    privacy,
  }

  return (
    <MemberPageLayout name={name}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#9C0621]">Your member profile</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Complete or edit your profile</h1>
          <p className="mt-2 text-slate-600">Your changes are saved as you continue. Fields can be left blank and added later.</p>
        </div>
        <ProfileEditor
          houses={houses}
          initialPhotoUrl={memberPhotoUrl(user.id, user.profilePhotoKey, user.profilePhotoUrl, user.updatedAt)}
          initialValues={initialValues}
          onboardingDiscovery={onboardingDiscovery}
          userId={user.id}
        />
      </div>
    </MemberPageLayout>
  )
}
