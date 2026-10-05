import Link from 'next/link'
import { ArrowRight, MapPin } from 'lucide-react'
import { Avatar } from '@/components/members/avatar'
import { NetworkControls } from '@/components/members/network-controls'
import type { ConnectionState } from '@/lib/network-types'

export type DirectoryCardMember = {
  id: string
  name: string
  nickname: string | null
  photoUrl: string | null
  setName: string | null
  profession: string | null
  company: string | null
  jobTitle?: string | null
  location: string | null
  verified: boolean
  houseName?: string | null
  matchReason?: string | null
  connectionState?: ConnectionState
  isFollowing?: boolean
  showFollow?: boolean
  viewerId?: string
  profileHref?: string
  recordType?: 'registered' | 'historical' | 'memorial'
  claimHref?: string | null
}

export function MemberCard({ member }: { member: DirectoryCardMember }) {
  const profileHref = member.profileHref ?? `/members/${member.id}`
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-4">
        <Avatar name={member.name} photoUrl={member.photoUrl} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-bold text-slate-950">{member.name}</h2>
            {member.verified && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Verified</span>}
            {member.recordType && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${member.recordType === 'memorial' ? 'bg-slate-100 text-slate-600' : member.recordType === 'historical' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{member.recordType === 'memorial' ? 'In Memoriam' : member.recordType === 'historical' ? 'Historical Record' : 'Registered Member'}</span>}
          </div>
          {member.nickname && <p className="mt-0.5 text-sm text-slate-500">“{member.nickname}”</p>}
          <p className="mt-2 text-sm font-semibold text-[#9C0621]">{member.setName ?? 'GCU Old Boy'}</p>
        </div>
      </div>
      <div className="mt-5 flex-1 space-y-2 text-sm text-slate-600">
        {member.profession && <p>{member.profession}</p>}
        {member.jobTitle && <p>{member.jobTitle}</p>}
        {member.company && <p>{member.company}</p>}
        {member.location && <p className="flex items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0" />{member.location}</p>}
        {member.houseName && <p>{member.houseName} House</p>}
        {member.matchReason && <p className="font-medium text-[#9C0621]">{member.matchReason}</p>}
      </div>
      {member.connectionState && member.viewerId !== member.id && (
        <div className="mt-4">
          <NetworkControls
            compact
            initialConnectionState={member.connectionState}
            initialFollowing={member.isFollowing}
            showFollow={member.showFollow}
            targetUserId={member.id}
          />
        </div>
      )}
      <Link className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#9C0621] hover:underline" href={profileHref}>
        View profile <ArrowRight className="h-4 w-4" />
      </Link>
      {member.claimHref && <Link className="mt-2 text-sm font-semibold text-slate-600 hover:text-[#9C0621] hover:underline" href={member.claimHref}>Claim this profile</Link>}
    </article>
  )
}
