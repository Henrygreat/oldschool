import Image from 'next/image'

export function Avatar({
  name,
  photoUrl,
  size = 'md',
}: {
  name: string
  photoUrl?: string | null
  size?: 'md' | 'lg'
}) {
  const dimensions = size === 'lg' ? 'h-28 w-28 text-3xl' : 'h-16 w-16 text-xl'
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#9C0621]/10 font-bold text-[#9C0621] ${dimensions}`}>
      {photoUrl && (photoUrl.startsWith('https://') || photoUrl.startsWith('/api/media/profile/') || photoUrl.startsWith('blob:')) ? (
        <Image alt="" className="object-cover" fill sizes={size === 'lg' ? '112px' : '64px'} src={photoUrl} unoptimized />
      ) : (
        initials || '?'
      )}
    </div>
  )
}
