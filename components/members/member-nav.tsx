import { signOut } from '@/lib/auth'
import { currentModerator, currentSchoolAdministrator } from '@/lib/admin'
import { MemberHeader } from '@/components/members/member-header'
import { activeMessagingUser, displayName, totalUnreadMessages } from '@/lib/messaging'
import { memberPhotoUrl } from '@/lib/profile'
import { prisma } from '@/lib/prisma'

async function signOutAction() {
  'use server'
  await signOut({ redirectTo: '/' })
}

export async function MemberNav({ name }: { name: string }) {
  const administrator = await currentSchoolAdministrator()
  const moderator = await currentModerator()
  const messagingUser = name ? await activeMessagingUser() : null

  if (!messagingUser) {
    return (
      <MemberHeader
        isModerator={false}
        isSchoolAdmin={false}
        notifications={[]}
        signOutAction={signOutAction}
        unreadMessages={0}
        unreadNotifications={0}
        user={null}
      />
    )
  }

  const [unreadMessages, unreadNotifications, notifications, photo] = await Promise.all([
    totalUnreadMessages(messagingUser.id),
    prisma.notification.count({ where: { userId: messagingUser.id, isRead: false } }),
    prisma.notification.findMany({
      where: { userId: messagingUser.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, content: true, link: true, isRead: true },
    }),
    prisma.user.findUnique({
      where: { id: messagingUser.id },
      select: { profilePhotoKey: true, profilePhotoUrl: true, updatedAt: true },
    }),
  ])

  return (
    <MemberHeader
      isModerator={Boolean(moderator)}
      isSchoolAdmin={Boolean(administrator)}
      notifications={notifications}
      signOutAction={signOutAction}
      unreadMessages={unreadMessages}
      unreadNotifications={unreadNotifications}
      user={{
        name,
        fullName: displayName(messagingUser),
        photoUrl: photo
          ? memberPhotoUrl(messagingUser.id, photo.profilePhotoKey, photo.profilePhotoUrl, photo.updatedAt)
          : null,
      }}
    />
  )
}
export function MemberPageLayout({
  children,
  name,
}: {
  children: React.ReactNode
  name: string
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <MemberNav name={name} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        Government College Umuahia Old Boys Association
      </footer>
    </div>
  )
}
