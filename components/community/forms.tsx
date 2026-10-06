import {
  cancelCommunityEvent,
  createAnnouncement,
  createCommunityChapter,
  createCommunityEvent,
  createCommunitySet,
  leaveChapter,
  requestChapterMembership,
  requestSetVerification,
  reviewChapterJoinRequest,
  reviewSetVerification,
  setAnnouncementStatus,
  setEventRSVP,
  updateCommunityAnnouncement,
  updateCommunityDetails,
  updateCommunityEvent,
  assignScopedAdministrator,
} from '@/app/community/actions'

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9C0621] focus:ring-2 focus:ring-[#9C0621]/15'
const buttonClass =
  'rounded-xl bg-[#9C0621] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#80051b]'

export function CreateSetForm() {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5">
      <summary className="cursor-pointer font-bold">Create or update a Set</summary>
      <form action={createCommunitySet} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input name="returnTo" type="hidden" value="/admin/community" />
        <label className="text-sm font-semibold">Set year<input className={`${fieldClass} mt-1`} max={new Date().getFullYear()} min={1900} name="year" required type="number" /></label>
        <label className="text-sm font-semibold">Set name<input className={`${fieldClass} mt-1`} maxLength={120} name="name" placeholder="Set of 1997" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Description<textarea className={`${fieldClass} mt-1`} maxLength={3000} name="description" rows={3} /></label>
        <button className={`${buttonClass} sm:col-span-2`} type="submit">Save Set</button>
      </form>
    </details>
  )
}

export function CreateChapterForm() {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5">
      <summary className="cursor-pointer font-bold">Create a Chapter</summary>
      <form action={createCommunityChapter} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input name="returnTo" type="hidden" value="/admin/community" />
        <label className="text-sm font-semibold sm:col-span-2">Chapter name<input className={`${fieldClass} mt-1`} maxLength={120} name="name" required /></label>
        <label className="text-sm font-semibold">Country<input className={`${fieldClass} mt-1`} maxLength={100} name="country" /></label>
        <label className="text-sm font-semibold">Region<input className={`${fieldClass} mt-1`} maxLength={100} name="region" /></label>
        <label className="text-sm font-semibold">City<input className={`${fieldClass} mt-1`} maxLength={100} name="city" /></label>
        <label className="text-sm font-semibold">Contact information<input className={`${fieldClass} mt-1`} maxLength={200} name="contactInfo" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Description<textarea className={`${fieldClass} mt-1`} maxLength={3000} name="description" rows={3} /></label>
        <button className={`${buttonClass} sm:col-span-2`} type="submit">Create Chapter</button>
      </form>
    </details>
  )
}

export function SetVerificationRequestForm({ year, returnTo }: { year: number; returnTo: string }) {
  return (
    <form action={requestSetVerification}>
      <input name="year" type="hidden" value={year} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <button className={buttonClass} type="submit">Request Set verification</button>
    </form>
  )
}

export function SetVerificationReviewForm({
  requestId,
  returnTo,
}: {
  requestId: string
  returnTo: string
}) {
  return (
    <div className="flex gap-2">
      {(['approve', 'reject'] as const).map((decision) => (
        <form action={reviewSetVerification} key={decision}>
          <input name="requestId" type="hidden" value={requestId} />
          <input name="decision" type="hidden" value={decision} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <button className={decision === 'approve' ? buttonClass : 'rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700'} type="submit">
            {decision === 'approve' ? 'Verify' : 'Decline'}
          </button>
        </form>
      ))}
    </div>
  )
}

export function AnnouncementForm({
  scope,
  scopeId,
  returnTo,
}: {
  scope: 'national' | 'chapter' | 'set'
  scopeId?: string
  returnTo: string
}) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5">
      <summary className="cursor-pointer font-bold">Post an announcement</summary>
      <form action={createAnnouncement} className="mt-4 space-y-3">
        <input name="scope" type="hidden" value={scope} />
        <input name="scopeId" type="hidden" value={scopeId ?? ''} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <label className="block text-sm font-semibold">Title<input className={`${fieldClass} mt-1`} maxLength={160} name="title" required /></label>
        <label className="block text-sm font-semibold">Announcement<textarea className={`${fieldClass} mt-1`} maxLength={10000} name="content" required rows={5} /></label>
        <label className="block text-sm font-semibold">Optional expiry (UTC)<input className={`${fieldClass} mt-1`} name="expiresAt" type="datetime-local" /></label>
        <button className={buttonClass} type="submit">Publish announcement</button>
      </form>
    </details>
  )
}

export function AnnouncementEditForm({
  announcement,
  returnTo,
}: {
  announcement: { id: string; title: string; content: string; expiresAt: Date | null }
  returnTo: string
}) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-[#9C0621]">Edit announcement</summary>
      <form action={updateCommunityAnnouncement} className="mt-3 space-y-3">
        <input name="announcementId" type="hidden" value={announcement.id} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <label className="block text-sm font-semibold">Title<input className={`${fieldClass} mt-1`} defaultValue={announcement.title} maxLength={160} name="title" required /></label>
        <label className="block text-sm font-semibold">Announcement<textarea className={`${fieldClass} mt-1`} defaultValue={announcement.content} maxLength={10000} name="content" required rows={5} /></label>
        <label className="block text-sm font-semibold">Optional expiry (UTC)<input className={`${fieldClass} mt-1`} defaultValue={announcement.expiresAt?.toISOString().slice(0, 16) ?? ''} name="expiresAt" type="datetime-local" /></label>
        <button className={buttonClass} type="submit">Save announcement</button>
      </form>
    </details>
  )
}

export function EventForm({
  scope,
  scopeId,
  returnTo,
}: {
  scope: 'national' | 'chapter' | 'set'
  scopeId?: string
  returnTo: string
}) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5">
      <summary className="cursor-pointer font-bold">Create an event</summary>
      <form action={createCommunityEvent} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input name="scope" type="hidden" value={scope} />
        <input name="scopeId" type="hidden" value={scopeId ?? ''} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <label className="text-sm font-semibold sm:col-span-2">Title<input className={`${fieldClass} mt-1`} maxLength={160} name="title" required /></label>
        <label className="text-sm font-semibold">Type
          <select className={`${fieldClass} mt-1`} defaultValue="OTHER" name="eventType">
            <option value="ANNUAL_GENERAL_MEETING">Annual General Meeting</option>
            <option value="FOUNDERS_DAY">Founder&apos;s Day</option>
            <option value="REUNION">Set reunion</option>
            <option value="CHAPTER_MEETING">Chapter meeting</option>
            <option value="NETWORKING">Networking</option>
            <option value="DINNER">Dinner</option>
            <option value="HOMECOMING">Homecoming</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label className="text-sm font-semibold">Start date and time (UTC)<input className={`${fieldClass} mt-1`} name="startAt" required type="datetime-local" /></label>
        <label className="text-sm font-semibold">End date and time (UTC, optional)<input className={`${fieldClass} mt-1`} name="endAt" type="datetime-local" /></label>
        <label className="text-sm font-semibold">RSVP deadline (UTC, optional)<input className={`${fieldClass} mt-1`} name="rsvpDeadline" type="datetime-local" /></label>
        <label className="text-sm font-semibold">Location<input className={`${fieldClass} mt-1`} maxLength={200} name="location" /></label>
        <label className="text-sm font-semibold">Capacity (optional)<input className={`${fieldClass} mt-1`} max={100000} min={1} name="capacity" type="number" /></label>
        <label className="text-sm font-semibold">Online meeting URL (HTTPS)<input className={`${fieldClass} mt-1`} maxLength={500} name="meetingUrl" type="url" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Description<textarea className={`${fieldClass} mt-1`} maxLength={10000} name="description" rows={4} /></label>
        <button className={`${buttonClass} sm:col-span-2`} type="submit">Publish event</button>
      </form>
    </details>
  )
}

export function EventEditForm({
  event,
  returnTo,
}: {
  event: {
    id: string
    title: string
    description: string | null
    eventType: string
    startAt: Date
    endAt: Date | null
    location: string | null
    meetingUrl: string | null
    capacity: number | null
    rsvpDeadline: Date | null
  }
  returnTo: string
}) {
  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-[#9C0621]">Edit event details</summary>
      <form action={updateCommunityEvent} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input name="eventId" type="hidden" value={event.id} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <label className="text-sm font-semibold sm:col-span-2">Title<input className={`${fieldClass} mt-1`} defaultValue={event.title} maxLength={160} name="title" required /></label>
        <label className="text-sm font-semibold">Type
          <select className={`${fieldClass} mt-1`} defaultValue={event.eventType} name="eventType">
            <option value="ANNUAL_GENERAL_MEETING">Annual General Meeting</option><option value="FOUNDERS_DAY">Founder&apos;s Day</option><option value="REUNION">Set reunion</option><option value="CHAPTER_MEETING">Chapter meeting</option><option value="NETWORKING">Networking</option><option value="DINNER">Dinner</option><option value="HOMECOMING">Homecoming</option><option value="OTHER">Other</option>
          </select>
        </label>
        <label className="text-sm font-semibold">Start date and time (UTC)<input className={`${fieldClass} mt-1`} defaultValue={event.startAt.toISOString().slice(0, 16)} name="startAt" required type="datetime-local" /></label>
        <label className="text-sm font-semibold">End date and time (UTC)<input className={`${fieldClass} mt-1`} defaultValue={event.endAt?.toISOString().slice(0, 16) ?? ''} name="endAt" type="datetime-local" /></label>
        <label className="text-sm font-semibold">RSVP deadline (UTC)<input className={`${fieldClass} mt-1`} defaultValue={event.rsvpDeadline?.toISOString().slice(0, 16) ?? ''} name="rsvpDeadline" type="datetime-local" /></label>
        <label className="text-sm font-semibold">Location<input className={`${fieldClass} mt-1`} defaultValue={event.location ?? ''} maxLength={200} name="location" /></label>
        <label className="text-sm font-semibold">Capacity<input className={`${fieldClass} mt-1`} defaultValue={event.capacity ?? ''} max={100000} min={1} name="capacity" type="number" /></label>
        <label className="text-sm font-semibold">Online meeting URL<input className={`${fieldClass} mt-1`} defaultValue={event.meetingUrl ?? ''} maxLength={500} name="meetingUrl" type="url" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Description<textarea className={`${fieldClass} mt-1`} defaultValue={event.description ?? ''} maxLength={10000} name="description" rows={4} /></label>
        <button className={`${buttonClass} sm:col-span-2`} type="submit">Save event</button>
      </form>
    </details>
  )
}

export function CommunityDetailsForm({
  scope,
  scopeId,
  returnTo,
  description,
  chapter,
}: {
  scope: 'chapter' | 'set'
  scopeId: string
  returnTo: string
  description: string | null
  chapter?: { country: string | null; region: string | null; city: string | null; contactInfo: string | null }
}) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5">
      <summary className="cursor-pointer font-bold">Edit community details</summary>
      <form action={updateCommunityDetails} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input name="scope" type="hidden" value={scope} />
        <input name="scopeId" type="hidden" value={scopeId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        {chapter && <>
          <label className="text-sm font-semibold">Country<input className={`${fieldClass} mt-1`} defaultValue={chapter.country ?? ''} maxLength={100} name="country" /></label>
          <label className="text-sm font-semibold">Region<input className={`${fieldClass} mt-1`} defaultValue={chapter.region ?? ''} maxLength={100} name="region" /></label>
          <label className="text-sm font-semibold">City<input className={`${fieldClass} mt-1`} defaultValue={chapter.city ?? ''} maxLength={100} name="city" /></label>
          <label className="text-sm font-semibold">Contact information<input className={`${fieldClass} mt-1`} defaultValue={chapter.contactInfo ?? ''} maxLength={200} name="contactInfo" /></label>
        </>}
        <label className="text-sm font-semibold sm:col-span-2">Description<textarea className={`${fieldClass} mt-1`} defaultValue={description ?? ''} maxLength={3000} name="description" rows={4} /></label>
        <button className={`${buttonClass} sm:col-span-2`} type="submit">Save details</button>
      </form>
    </details>
  )
}

export function ChapterMembershipControls({
  chapterId,
  returnTo,
  isMember,
  requestStatus,
  hasProfile,
}: {
  chapterId: string
  returnTo: string
  isMember: boolean
  requestStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  hasProfile: boolean
}) {
  if (isMember) {
    return (
      <form action={leaveChapter}>
        <input name="chapterId" type="hidden" value={chapterId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <button className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#9C0621] hover:text-[#9C0621]" type="submit">Leave Chapter</button>
      </form>
    )
  }
  if (requestStatus === 'PENDING') {
    return <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Your membership request is awaiting review.</p>
  }
  if (!hasProfile) {
    return <p className="text-sm text-slate-600">Complete your member profile before requesting Chapter membership.</p>
  }
  return (
    <form action={requestChapterMembership} className="flex flex-wrap items-end gap-3">
      <input name="chapterId" type="hidden" value={chapterId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <label className="min-w-48 flex-1 text-sm font-semibold">Optional note<textarea className={`${fieldClass} mt-1`} maxLength={500} name="message" rows={2} /></label>
      <button className={buttonClass} type="submit">Request to join</button>
    </form>
  )
}

export function JoinRequestReview({
  requestId,
  returnTo,
}: {
  requestId: string
  returnTo: string
}) {
  return (
    <div className="flex gap-2">
      {(['approve', 'reject'] as const).map((decision) => (
        <form action={reviewChapterJoinRequest} key={decision}>
          <input name="requestId" type="hidden" value={requestId} />
          <input name="decision" type="hidden" value={decision} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <button className={decision === 'approve' ? buttonClass : 'rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700'} type="submit">
            {decision === 'approve' ? 'Approve' : 'Decline'}
          </button>
        </form>
      ))}
    </div>
  )
}

export function EventRSVPForm({
  eventId,
  returnTo,
  currentResponse,
  closed,
}: {
  eventId: string
  returnTo: string
  currentResponse: 'GOING' | 'MAYBE' | 'NOT_GOING' | null
  closed: boolean
}) {
  if (closed) return <p className="text-sm text-slate-500">RSVPs are closed for this event.</p>
  return (
    <form action={setEventRSVP} className="flex flex-wrap items-center gap-2">
      <input name="eventId" type="hidden" value={eventId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      {(['GOING', 'MAYBE', 'NOT_GOING'] as const).map((response) => (
        <button
          aria-pressed={currentResponse === response}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${currentResponse === response ? 'bg-[#9C0621] text-white' : 'border border-slate-300 bg-white text-slate-700 hover:border-[#9C0621]'}`}
          key={response}
          name="response"
          type="submit"
          value={response}
        >
          {response === 'NOT_GOING' ? 'Not going' : response[0] + response.slice(1).toLowerCase()}
        </button>
      ))}
    </form>
  )
}

export function EventCancellationForm({ eventId, returnTo }: { eventId: string; returnTo: string }) {
  return (
    <form action={cancelCommunityEvent}>
      <input name="eventId" type="hidden" value={eventId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <button className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50" type="submit">Cancel event</button>
    </form>
  )
}

export function AnnouncementStatusForm({
  announcementId,
  returnTo,
  status,
}: {
  announcementId: string
  returnTo: string
  status: 'PUBLISHED' | 'CANCELLED'
}) {
  return (
    <form action={setAnnouncementStatus}>
      <input name="announcementId" type="hidden" value={announcementId} />
      <input name="status" type="hidden" value={status === 'PUBLISHED' ? 'CANCELLED' : 'PUBLISHED'} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <button className="text-xs font-semibold text-slate-600 hover:text-[#9C0621]" type="submit">
        {status === 'PUBLISHED' ? 'Unpublish' : 'Republish'}
      </button>
    </form>
  )
}

export function AdminAssignmentForm({
  scope,
  scopeId,
  returnTo,
  operation,
}: {
  scope: 'set' | 'chapter'
  scopeId: string
  returnTo: string
  operation: 'add' | 'remove'
}) {
  return (
    <form action={assignScopedAdministrator} className="flex flex-wrap gap-2">
      <input name="scope" type="hidden" value={scope} />
      <input name="scopeId" type="hidden" value={scopeId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <label className="sr-only" htmlFor={`${scope}-${scopeId}-${operation}-email`}>Member email</label>
      <input className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" id={`${scope}-${scopeId}-${operation}-email`} maxLength={254} name="email" placeholder="Member account email" required type="email" />
      <button className={operation === 'add' ? buttonClass : 'rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700'} name="operation" type="submit" value={operation}>
        {operation === 'add' ? `Assign ${scope === 'set' ? 'Set' : 'Chapter'} admin` : 'Remove admin'}
      </button>
    </form>
  )
}
