'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export type MobileMenuLink = { href: string; label: string }

export function PublicMobileMenu({
  links,
  className = '',
}: {
  links: MobileMenuLink[]
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className={className}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/20 text-white hover:bg-white/10"
        onClick={() => setOpen((value) => !value)}
        ref={buttonRef}
        type="button"
      >
        {open ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
      </button>
      {open && (
        <nav
          aria-label="Mobile navigation"
          className="absolute inset-x-0 top-full z-50 max-h-[calc(100vh-5rem)] overflow-y-auto border-b border-white/10 bg-[#100307] px-5 py-4 shadow-2xl"
          id={panelId}
        >
          <ul className="mx-auto max-w-7xl space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  className="block rounded-lg px-3 py-3 text-base font-medium text-white/85 hover:bg-white/10 hover:text-white"
                  href={link.href}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
