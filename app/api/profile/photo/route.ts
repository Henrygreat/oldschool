import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getR2Client,
  getR2Config,
  isProfilePhotoKeyForUser,
  profilePhotoKeyFor,
  StorageConfigurationError,
} from '@/lib/r2'
import {
  InvalidProfilePhotoError,
  MAX_PROFILE_PHOTO_BYTES,
  processProfilePhoto,
  PROFILE_PHOTO_MIME_TYPES,
} from '@/lib/profile-photo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const maximumRequestBytes = MAX_PROFILE_PHOTO_BYTES + 64 * 1024

function hasSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host') ?? request.headers.get('x-forwarded-host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase()
  } catch {
    return false
  }
}

async function currentUser() {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) return null
  return prisma.user.findFirst({
    where: { id: session.user.id, schoolId: session.user.schoolId, isActive: true },
    select: { id: true, profilePhotoKey: true, profilePhotoUrl: true },
  })
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'The upload request was not allowed.' }, { status: 403 })
  }
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to upload a profile photo.' }, { status: 401 })
  }

  const lengthHeader = request.headers.get('content-length')
  if (lengthHeader === null || !/^\d+$/.test(lengthHeader)) {
    return NextResponse.json({ error: 'The upload request size could not be verified.' }, { status: 411 })
  }
  const contentLength = Number(lengthHeader)
  if (contentLength > maximumRequestBytes) {
    return NextResponse.json({ error: 'Profile photos must be 5 MB or smaller.' }, { status: 413 })
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Upload a JPEG, PNG, or WebP image.' }, { status: 415 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'The image upload could not be read.' }, { status: 400 })
  }

  const photo = form.get('photo')
  if (!(photo instanceof File) || !PROFILE_PHOTO_MIME_TYPES.includes(photo.type as (typeof PROFILE_PHOTO_MIME_TYPES)[number])) {
    return NextResponse.json({ error: 'Choose a JPEG, PNG, or WebP image.' }, { status: 415 })
  }
  if (photo.size === 0 || photo.size > MAX_PROFILE_PHOTO_BYTES) {
    return NextResponse.json({ error: 'Profile photos must be between 1 byte and 5 MB.' }, { status: 413 })
  }

  let processed: Buffer
  try {
    processed = await processProfilePhoto(Buffer.from(await photo.arrayBuffer()), photo.type)
  } catch (error) {
    if (error instanceof InvalidProfilePhotoError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    throw error
  }

  try {
    const config = getR2Config()
    const client = getR2Client()
    const newKey = profilePhotoKeyFor(user.id, `${randomUUID()}.webp`)
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: newKey,
      Body: processed,
      ContentLength: processed.length,
      ContentType: 'image/webp',
      CacheControl: 'private, max-age=300, must-revalidate',
    }))

    const updated = await prisma.user.updateMany({
      where: {
        id: user.id,
        isActive: true,
        profilePhotoKey: user.profilePhotoKey,
        profilePhotoUrl: user.profilePhotoUrl,
      },
      data: { profilePhotoKey: newKey, profilePhotoUrl: null },
    })
    if (updated.count !== 1) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: newKey }))
      } catch {
        console.error('Could not clean up a failed profile photo upload.')
      }
      return NextResponse.json({ error: 'Your profile changed during upload. Please try again.' }, { status: 409 })
    }

    if (user.profilePhotoKey && isProfilePhotoKeyForUser(user.profilePhotoKey, user.id)) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: user.profilePhotoKey }))
      } catch {
        console.error('A previous profile photo could not be removed after replacement.')
      }
    }

    return NextResponse.json({
      photoUrl: `/api/media/profile/${encodeURIComponent(user.id)}?v=${Date.now()}`,
    })
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return NextResponse.json({ error: 'Profile photo storage is temporarily unavailable.' }, { status: 503 })
    }
    console.error('Profile photo upload failed.')
    return NextResponse.json({ error: 'The photo could not be saved. Please try again.' }, { status: 503 })
  }
}

export async function DELETE(request: Request) {
  if (!hasSameOrigin(request) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'The photo removal request was not allowed.' }, { status: 403 })
  }
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to remove a profile photo.' }, { status: 401 })
  }

  try {
    const updated = await prisma.user.updateMany({
      where: {
        id: user.id,
        isActive: true,
        profilePhotoKey: user.profilePhotoKey,
        profilePhotoUrl: user.profilePhotoUrl,
      },
      data: { profilePhotoKey: null, profilePhotoUrl: null },
    })
    if (updated.count !== 1) {
      return NextResponse.json({ error: 'Your profile changed. Please try again.' }, { status: 409 })
    }

    if (user.profilePhotoKey && isProfilePhotoKeyForUser(user.profilePhotoKey, user.id)) {
      try {
        const config = getR2Config()
        await getR2Client().send(
          new DeleteObjectCommand({ Bucket: config.bucket, Key: user.profilePhotoKey })
        )
      } catch {
        console.error('A removed profile photo could not be deleted from object storage.')
        return NextResponse.json({
          removed: true,
          warning: 'Your photo was removed from your profile, but storage cleanup is pending.',
        })
      }
    }
    return NextResponse.json({ removed: true })
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return NextResponse.json({ error: 'Profile photo storage is temporarily unavailable.' }, { status: 503 })
    }
    console.error('Profile photo removal failed.')
    return NextResponse.json({ error: 'The photo could not be removed. Please try again.' }, { status: 503 })
  }
}
