import { redirect } from 'next/navigation'
import { ChangePasswordForm } from '@/components/auth/change-password-form'
import { MemberPageLayout } from '@/components/members/member-nav'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function SecurityPage() {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) redirect('/auth/login?callbackUrl=%2Faccount%2Fsecurity')
  const user = await prisma.user.findFirst({
    where: { id: session.user.id, schoolId: session.user.schoolId, isActive: true },
    select: { firstName: true, surname: true },
  })
  if (!user) redirect('/auth/login')

  return (
    <MemberPageLayout name={`${user.firstName} ${user.surname}`}>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9C0621]">Account</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Security</h1>
        <h2 className="mt-8 text-lg font-bold">Change password</h2>
        <p className="mt-1 text-sm text-slate-600">After changing your password you will be signed out everywhere and asked to log in again.</p>
        <ChangePasswordForm />
      </section>
    </MemberPageLayout>
  )
}