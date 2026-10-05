import 'server-only'
import { S3Client } from '@aws-sdk/client-s3'

export class StorageConfigurationError extends Error {
  constructor() {
    super('Profile photo storage is not configured.')
    this.name = 'StorageConfigurationError'
  }
}

let client: S3Client | undefined

export function getR2Config() {
  const endpoint = process.env.S3_ENDPOINT
  const region = process.env.S3_REGION
  const bucket = process.env.S3_BUCKET
  const accessKeyId = process.env.S3_ACCESS_KEY
  const secretAccessKey = process.env.S3_SECRET_KEY

  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
    throw new StorageConfigurationError()
  }

  let endpointUrl: URL
  try {
    endpointUrl = new URL(endpoint)
  } catch {
    throw new StorageConfigurationError()
  }
  if (endpointUrl.protocol !== 'https:' && endpointUrl.hostname !== 'localhost') {
    throw new StorageConfigurationError()
  }

  return { endpoint: endpointUrl.toString(), region, bucket, accessKeyId, secretAccessKey }
}

export function getR2Client() {
  if (client) return client
  const config = getR2Config()
  client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
  return client
}

export function profilePhotoKeyFor(userId: string, fileName: string) {
  return `profile-photos/${userId}/${fileName}`
}

export function isProfilePhotoKeyForUser(key: string, userId: string) {
  const prefix = `profile-photos/${userId}/`
  return key.startsWith(prefix) && /^[0-9a-f-]{36}\.webp$/i.test(key.slice(prefix.length))
}
