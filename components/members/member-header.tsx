'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, ChevronDown, Menu, MessageCircle, X } from 'lucide-react'
import { Avatar } from '@/components/members/avatar'

type NavItem = { href: string; label: string }
type NavGroup = { id: string; label: string; href?: string; items?: NavItem[] }

export type HeaderNotification = { id: string; content: string; link: string | null; isRead: boolean }

export type MemberHeaderProps = {
  user: { name: string; fullName: string; photoUrl: string | null } | null
  unreadMessages: number
  unreadNotifications: number
  notifications: HeaderNotification[]
  isSchoolAdmin: boolean
  isModerator: boolean
  signOutAction: () => Promise<void>
}

const memberGroups: NavGroup[] = [
  { id: 'home', label: 'Home', href: '/dashboard' },
  {
    id: 'network',
    label: 'Network',
    items: [
      { href: '/directory', label: 'Directory' },
      { href: '/network', label: 'My Network' },
      { href: '/network?tab=received', label: 'Received requests' },
      { href: '/network?tab=sent', label: 'Sent requests' },
      { href: '/network?tab=following', label: 'Following' },
      { href: '/network?tab=followers', label: 'Followers' },
    ],
  },
  {
    id: 'alumni',
    label: 'Alumni',
    items: [
      { href: '/sets', label: 'Sets' },
      { href: '/chapters', label: 'Chapters' },
      { href: '/archive/find', label: 'Alumni Archive' },
    ],
  },
  { id: 'events', label: 'Events', href: '/events' },
  {
    id: 'professional',
    label: 'Professional',
    items: [
      { href: '/professional', label: 'Overview' },
      { href: '/professional/people', label: 'Find Professionals' },
      { href: '/businesses', label: 'Business Directory' },
      { href: '/opportunities', label: 'Opportunities' },
      { href: '/professional/mentors', label: 'Find a Mentor' },
      { href: '/professional/settings', label: 'My professional settings' },
    ],
  },
]

const profileItems: NavItem[] = [
  { href: '/members/me', label: 'My Profile' },
  { href: '/profile/edit', label: 'Account Settings' },
  { href: '/account/security', label: 'Security / Change Password' },
]

const linkBase = 'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors'
const idle = 'text-slate-600 hover:bg-slate-100 hover:text-[#9C0621]'
const active = 'bg-[#9C0621]/10 font-semibold text-[#9C0621]'

function pathOf(href: string) {
  return href.split('?')[0]
}

function matches(pathname: string, href: string) {
  const path = pathOf(href)
  return pathname === path || pathname.startsWith(`${path}/`)
}

// Only the longest matching item is active, so /admin/alumni does not light up on /admin/alumni/import.
function activeItem(items: NavItem[], pathname: string) {
  let best: NavItem | null = null
  for (const item of items) {
    if (item.href.includes('?')) continue
    if (matches(pathname, item.href) && (!best || pathOf(item.href).length > pathOf(best.href).length)) best = item
  }
  return best
}

function groupActive(group: NavGroup, pathname: string) {
  if (group.href) return matches(pathname, group.href)
  return Boolean(group.items && activeItem(group.items, pathname))
}

function safeLink(link: string | null) {
  return link && link.startsWith('/') && !link.startsWith('//') ? link : '/network'
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -right-1 -top-1 flex min-w-[1.1rem] items-center justify-center rounded-full bg-[#9C0621] px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function MemberHeader({
  user,
  unreadMessages,
  unreadNotifications,
  notifications,
  isSchoolAdmin,
  isModerator,
  signOutAction,
}: MemberHeaderProps) {
  const pathname = usePathname() ?? ''
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const headerRef = useRef<HTMLElement>(null)
  const mobileButtonRef = useRef<HTMLButtonElement>(null)
  const mobileId = useId()

  const adminItems: NavItem[] = [
    ...(isSchoolAdmin
      ? [
          { href: '/admin/community', label: 'Community Administration' },
          { href: '/admin/alumni', label: 'Alumni Archive Records' },
          { href: '/admin/alumni/import', label: 'Import Alumni' },
        ]
      : []),
    ...(isModerator
      ? [
          { href: '/admin/reports', label: 'Reports' },
          { href: '/admin/professional', label: 'Professional Moderation' },
        ]
      : []),
  ]
  const groups: NavGroup[] = user
    ? memberGroups
    : [{ id: 'network', label: 'Directory', href: '/directory' }]

  useEffect(() => {
    setOpenMenu(null)
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!openMenu && !mobileOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (mobileOpen) mobileButtonRef.current?.focus()
      setOpenMenu(null)
      setMobileOpen(false)
    }
    const onPointer = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setOpenMenu(null)
        setMobileOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [openMenu, mobileOpen])

  const toggleMenu = (id: string) => setOpenMenu((current) => (current === id ? null : id))

  const menuPanel = 'absolute top-full z-50 mt-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg'

  function DesktopDropdown({ group }: { group: NavGroup }) {
    const items = group.items ?? []
    const current = activeItem(items, pathname)
    const isOpen = openMenu === group.id
    return (
      <div className="relative">
        <button
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className={`${linkBase} inline-flex items-center gap-1 ${groupActive(group, pathname) ? active : idle}`}
          onClick={() => toggleMenu(group.id)}
          type="button"
        >
          {group.label}
          <ChevronDown aria-hidden className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className={`${menuPanel} left-0 w-60`} role="menu">
            {items.map((item) => (
              <Link
                aria-current={current?.href === item.href ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2 text-sm ${current?.href === item.href ? active : idle}`}
                href={item.href}
                key={item.href}
                role="menuitem"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  const adminActive = adminItems.length > 0 && Boolean(activeItem(adminItems, pathname))
  const adminCurrent = activeItem(adminItems, pathname)

  return (
    <header className="relative z-40 border-b border-slate-200 bg-white" ref={headerRef}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Link className="mr-2 flex shrink-0 items-center gap-3" href={user ? '/dashboard' : '/'}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9C0621] font-bold text-white">G</span>
          <span>
            <span className="block font-bold tracking-wide text-slate-950">GCUOBA</span>
            <span className="hidden text-[10px] uppercase tracking-wider text-slate-500 sm:block">Old Boys Network</span>
          </span>
        </Link>

        <nav aria-label="Member navigation" className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
          {groups.map((group) =>
            group.href ? (
              <Link
                aria-current={matches(pathname, group.href) ? 'page' : undefined}
                className={`${linkBase} ${matches(pathname, group.href) ? active : idle}`}
                href={group.href}
                key={group.id}
              >
                {group.label}
              </Link>
            ) : (
              <DesktopDropdown group={group} key={group.id} />
            )
          )}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 lg:ml-0">
          {user ? (
            <>
              <Link
                aria-label={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : 'Messages'}
                className={`relative flex h-10 w-10 items-center justify-center rounded-full ${matches(pathname, '/messages') ? active : idle}`}
                href="/messages"
                title="Messages"
              >
                <MessageCircle aria-hidden className="h-5 w-5" />
                <CountBadge count={unreadMessages} />
              </Link>

              <div className="relative">
                <button
                  aria-expanded={openMenu === 'notifications'}
                  aria-haspopup="menu"
                  aria-label={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full ${openMenu === 'notifications' ? active : idle}`}
                  onClick={() => toggleMenu('notifications')}
                  title="Notifications"
                  type="button"
                >
                  <Bell aria-hidden className="h-5 w-5" />
                  <CountBadge count={unreadNotifications} />
                </button>
                {openMenu === 'notifications' && (
                  <div className={`${menuPanel} right-0 w-[min(20rem,calc(100vw-2rem))]`} role="menu">
                    <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">Notifications</p>
                    {notifications.length === 0 ? (
                      <p className="px-3 pb-3 text-sm text-slate-600">You&apos;re all caught up.</p>
                    ) : (
                      notifications.map((item) => (
                        <Link
                          className={`block rounded-lg px-3 py-2 text-sm hover:bg-slate-100 ${item.isRead ? 'text-slate-600' : 'font-semibold text-slate-950'}`}
                          href={safeLink(item.link)}
                          key={item.id}
                          role="menuitem"
                        >
                          <span className="line-clamp-2 break-words">{item.content}</span>
                        </Link>
                      ))
                    )}
                    <Link className="mt-1 block rounded-lg border-t border-slate-100 px-3 py-2 text-sm font-semibold text-[#9C0621] hover:bg-slate-100" href="/network?tab=received" role="menuitem">
                      View network activity
                    </Link>
                  </div>
                )}
              </div>

              {adminItems.length > 0 && (
                <div className="relative hidden lg:block">
                  <button
                    aria-expanded={openMenu === 'admin'}
                    aria-haspopup="menu"
                    className={`${linkBase} inline-flex items-center gap-1 ${adminActive ? active : idle}`}
                    onClick={() => toggleMenu('admin')}
                    type="button"
                  >
                    Admin
                    <ChevronDown aria-hidden className={`h-3.5 w-3.5 transition-transform ${openMenu === 'admin' ? 'rotate-180' : ''}`} />
                  </button>
                  {openMenu === 'admin' && (
                    <div className={`${menuPanel} right-0 w-64`} role="menu">
                      {adminItems.map((item) => (
                        <Link
                          aria-current={adminCurrent?.href === item.href ? 'page' : undefined}
                          className={`block rounded-lg px-3 py-2 text-sm ${adminCurrent?.href === item.href ? active : idle}`}
                          href={item.href}
                          key={item.href}
                          role="menuitem"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="relative hidden lg:block">
                <button
                  aria-expanded={openMenu === 'profile'}
                  aria-haspopup="menu"
                  aria-label={`Account menu for ${user.fullName}`}
                  className="flex items-center gap-1 rounded-full p-0.5 hover:bg-slate-100"
                  onClick={() => toggleMenu('profile')}
                  type="button"
                >
                  <Avatar name={user.fullName} photoUrl={user.photoUrl} size="sm" />
                  <ChevronDown aria-hidden className="h-3.5 w-3.5 text-slate-500" />
                </button>
                {openMenu === 'profile' && (
                  <div className={`${menuPanel} right-0 w-64`} role="menu">
                    <p className="truncate px-3 py-2 text-sm font-bold text-slate-950" title={user.fullName}>{user.fullName}</p>
                    {profileItems.map((item) => (
                      <Link
                        aria-current={matches(pathname, item.href) ? 'page' : undefined}
                        className={`block rounded-lg px-3 py-2 text-sm ${matches(pathname, item.href) ? active : idle}`}
                        href={item.href}
                        key={item.href}
                        role="menuitem"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <form action={signOutAction} className="mt-1 border-t border-slate-100 pt-1">
                      <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-[#9C0621]" role="menuitem" type="submit">
                        Log out
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link className="hidden rounded-lg bg-[#9C0621] px-3 py-2 text-sm font-semibold text-white lg:inline-block" href="/auth/login">
              Log in
            </Link>
          )}

          <button
            aria-controls={mobileId}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
            onClick={() => {
              setOpenMenu(null)
              setMobileOpen((value) => !value)
            }}
            ref={mobileButtonRef}
            type="button"
          >
            {mobileOpen ? <X aria-hidden className="h-6 w-6" /> : <Menu aria-hidden className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-slate-200 bg-white shadow-lg lg:hidden"
          id={mobileId}
        >
          <nav aria-label="Mobile navigation" className="mx-auto max-w-7xl space-y-1 px-4 py-3 sm:px-6">
            {user && (
              <div className="flex items-center gap-3 px-2 pb-3">
                <Avatar name={user.fullName} photoUrl={user.photoUrl} size="sm" />
                <span className="min-w-0 truncate font-bold text-slate-950" title={user.fullName}>{user.fullName}</span>
              </div>
            )}
            {groups.map((group) =>
              group.href ? (
                <Link
                  aria-current={matches(pathname, group.href) ? 'page' : undefined}
                  className={`block ${linkBase} py-3 text-base ${matches(pathname, group.href) ? active : idle}`}
                  href={group.href}
                  key={group.id}
                >
                  {group.label}
                </Link>
              ) : (
                <MobileGroup
                  expanded={expanded === group.id}
                  items={group.items ?? []}
                  key={group.id}
                  label={group.label}
                  onToggle={() => setExpanded((current) => (current === group.id ? null : group.id))}
                  pathname={pathname}
                />
              )
            )}
            {user && adminItems.length > 0 && (
              <MobileGroup
                expanded={expanded === 'admin'}
                items={adminItems}
                label="Admin"
                onToggle={() => setExpanded((current) => (current === 'admin' ? null : 'admin'))}
                pathname={pathname}
              />
            )}
            {user ? (
              <>
                <MobileGroup
                  expanded={expanded === 'account'}
                  items={profileItems}
                  label="My account"
                  onToggle={() => setExpanded((current) => (current === 'account' ? null : 'account'))}
                  pathname={pathname}
                />
                <form action={signOutAction} className="border-t border-slate-100 pt-2">
                  <button className="w-full rounded-lg px-3 py-3 text-left text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-[#9C0621]" type="submit">
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <Link className="mt-2 block rounded-lg bg-[#9C0621] px-3 py-3 text-center font-semibold text-white" href="/auth/login">
                Log in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

function MobileGroup({
  label,
  items,
  expanded,
  onToggle,
  pathname,
}: {
  label: string
  items: NavItem[]
  expanded: boolean
  onToggle: () => void
  pathname: string
}) {
  const panelId = useId()
  const current = activeItem(items, pathname)
  return (
    <div>
      <button
        aria-controls={panelId}
        aria-expanded={expanded}
        className={`flex w-full items-center justify-between ${linkBase} py-3 text-base ${current ? active : idle}`}
        onClick={onToggle}
        type="button"
      >
        {label}
        <ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="ml-3 space-y-0.5 border-l border-slate-200 pl-2" id={panelId}>
          {items.map((item) => (
            <Link
              aria-current={current?.href === item.href ? 'page' : undefined}
              className={`block rounded-lg px-3 py-2.5 text-sm ${current?.href === item.href ? active : idle}`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
