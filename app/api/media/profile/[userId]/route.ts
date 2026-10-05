import { GetObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getR2Client, getR2Config, isProfilePhotoKeyForUser, StorageConfigurationError } from '@/lib/r2'
import { canViewField, privacyFor } from '@/lib/profile'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const target = await prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: {
      id: true,
      schoolId: true,
      profilePhotoKey: true,
      privacySettings: { select: { field: true, visibility: true } },
    },
  })
  if (!target) return new NextResponse(null, { status: 404 })

  const session = await auth()
  const isOwner = session?.user?.id === target.id
  let isMember = false
  let isAdmin = false
  if (session?.user?.id) {
    const viewer = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        schoolId: target.schoolId,
        isActive: true,
      },
      select: { id: true, role: true },
    })
    isMember = Boolean(viewer)
    if (viewer && !isOwner) {
      const schoolAdmin = await prisma.schoolAdministrator.findFirst({
        where: {
          userId: viewer.id,
          schoolId: target.schoolId,
          role: { in: ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'SCHOOL_ADMIN'] },
        },
        select: { id: true },
      })
      isAdmin = Boolean(
        schoolAdmin ||
          viewer.role === 'SCHOOL_ADMIN' ||
          viewer.role === 'SUPER_ADMIN' ||
          viewer.role === 'NATIONAL_ADMIN'
      )
    }
  }

  const privacy = privacyFor(target.privacySettings)
  if (!canViewField(privacy.photo, isMember, isOwner, isAdmin)) {
    return new NextResponse(null, { status: 404 })
  }

  if (!target.profilePhotoKey || !isProfilePhotoKeyForUser(target.profilePhotoKey, target.id)) {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const config = getR2Config()
    const object = await getR2Client().send(
      new GetObjectCommand({ Bucket: config.bucket, Key: target.profilePhotoKey })
    )
    if (!object.Body) return new NextResponse(null, { status: 404 })

    const headers = new Headers({
      'Content-Type': 'image/webp',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Cookie',
    })
    if (object.ContentLength !== undefined) {
      headers.set('Content-Length', String(object.ContentLength))
    }
    return new Response(object.Body.transformToWebStream(), { status: 200, headers })
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return NextResponse.json({ error: 'Profile photo storage is temporarily unavailable.' }, { status: 503 })
    }
    console.error('Private profile photo could not be retrieved.')
    return new NextResponse(null, { status: 503 })
  }
}
