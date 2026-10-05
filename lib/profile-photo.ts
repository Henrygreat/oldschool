import 'server-only'
import sharp from 'sharp'

export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024
export const PROFILE_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const mimeToFormat = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const

export class InvalidProfilePhotoError extends Error {
  constructor(message = 'Choose a valid JPEG, PNG, or WebP image.') {
    super(message)
    this.name = 'InvalidProfilePhotoError'
  }
}

export async function processProfilePhoto(input: Buffer, declaredMimeType: string) {
  if (!PROFILE_PHOTO_MIME_TYPES.includes(declaredMimeType as (typeof PROFILE_PHOTO_MIME_TYPES)[number])) {
    throw new InvalidProfilePhotoError()
  }
  if (input.length === 0 || input.length > MAX_PROFILE_PHOTO_BYTES) {
    throw new InvalidProfilePhotoError('Profile photos must be 5 MB or smaller.')
  }

  try {
    const image = sharp(input, {
      failOn: 'error',
      limitInputPixels: 40_000_000,
      animated: false,
    })
    const metadata = await image.metadata()
    if (
      metadata.format !== mimeToFormat[declaredMimeType as keyof typeof mimeToFormat] ||
      !metadata.width ||
      !metadata.height ||
      (metadata.pages ?? 1) > 1
    ) {
      throw new InvalidProfilePhotoError()
    }

    const output = await image
      .rotate()
      .resize(600, 600, { fit: 'cover', position: 'attention' })
      .webp({ quality: 82, effort: 4 })
      .toBuffer()

    return output
  } catch (error) {
    if (error instanceof InvalidProfilePhotoError) throw error
    throw new InvalidProfilePhotoError()
  }
}
