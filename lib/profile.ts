import { VisibilityLevel, type PrivacySetting } from '@prisma/client'
import { z } from 'zod'

export const privacyFields = ['email', 'phone', 'location', 'company', 'linkedin', 'photo'] as const
export type PrivacyField = (typeof privacyFields)[number]

export const defaultPrivacy = Object.fromEntries(
  privacyFields.map((field) => [field, VisibilityLevel.MEMBERS_ONLY])
) as Record<PrivacyField, VisibilityLevel>

export function privacyFor(settings: Pick<PrivacySetting, 'field' | 'visibility'>[]) {
  return settings.reduce((values, setting) => {
    if (privacyFields.includes(setting.field as PrivacyField)) {
      values[setting.field as PrivacyField] = setting.visibility
    }
    return values
  }, { ...defaultPrivacy })
}

export function canViewField(
  visibility: VisibilityLevel,
  isMember: boolean,
  isOwner: boolean,
  isAdmin: boolean
) {
  if (isOwner || isAdmin || visibility === VisibilityLevel.PUBLIC) return true
  return (
    isMember &&
    (visibility === VisibilityLevel.MEMBERS_ONLY ||
      visibility === VisibilityLevel.OLD_BOYS_ONLY)
  )
}

export function memberPhotoUrl(
  userId: string,
  photoKey: string | null,
  legacyPhotoUrl: string | null,
  updatedAt: Date
) {
  if (photoKey) {
    return `/api/media/profile/${encodeURIComponent(userId)}?v=${updatedAt.getTime()}`
  }
  return legacyPhotoUrl?.startsWith('https://') ? legacyPhotoUrl : null
}

const yearSchema = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) return null
    if (typeof value === 'string' && /^\d{4}$/.test(value)) return Number(value)
    return value
  },
  z.number().int().min(1900).max(new Date().getFullYear()).nullable()
)

const optionalText = (max: number) => z.string().trim().max(max)
const optionalUrl = z
  .union([z.literal(''), z.string().trim().url().max(300)])
  .refine((value) => {
    if (!value) return true
    const protocol = new URL(value).protocol
    return protocol === 'http:' || protocol === 'https:'
  }, 'Enter an HTTP or HTTPS URL')
const phoneSchema = z.string().trim().max(40).refine(
  (value) => value === '' || /^[+()\d .-]{7,40}$/.test(value),
  'Enter a valid phone number'
)

export const profileInputSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(80),
    middleName: optionalText(80),
    surname: z.string().trim().min(1, 'Last name is required').max(80),
    nickname: optionalText(80),
    entryYear: yearSchema,
    leavingYear: yearSchema,
    setYear: yearSchema,
    houseId: z.string().max(30),
    studentNumber: optionalText(50),
    currentCountry: optionalText(100),
    currentCity: optionalText(100),
    profession: optionalText(120),
    industry: optionalText(120),
    company: optionalText(120),
    jobTitle: optionalText(120),
    biography: optionalText(1000),
    phone: phoneSchema,
    linkedInUrl: optionalUrl,
    websiteUrl: optionalUrl,
    privacy: z.object({
      email: z.nativeEnum(VisibilityLevel),
      phone: z.nativeEnum(VisibilityLevel),
      location: z.nativeEnum(VisibilityLevel),
      company: z.nativeEnum(VisibilityLevel),
      linkedin: z.nativeEnum(VisibilityLevel),
      photo: z.nativeEnum(VisibilityLevel),
    }),
  })
  .superRefine((profile, context) => {
    if (
      profile.entryYear !== null &&
      profile.leavingYear !== null &&
      profile.entryYear > profile.leavingYear
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Leaving year must be the same as or later than entry year',
        path: ['leavingYear'],
      })
    }
    if (
      profile.setYear !== null &&
      profile.entryYear !== null &&
      profile.setYear < profile.entryYear
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Set year must not be earlier than your entry year',
        path: ['setYear'],
      })
    }
    if (
      profile.setYear !== null &&
      profile.leavingYear !== null &&
      profile.setYear > profile.leavingYear
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Set year must not be later than your leaving year',
        path: ['setYear'],
      })
    }
  })

export type ProfileInput = z.infer<typeof profileInputSchema>

export function profileCompletion(input: {
  firstName: string
  surname: string
  entryYear: number | null
  leavingYear: number | null
  setYear: number | null
  profession: string | null
  company: string | null
  jobTitle: string | null
  industry: string | null
  biography: string | null
}) {
  const sections = [
    Boolean(input.firstName && input.surname),
    Boolean(input.setYear || (input.entryYear !== null && input.leavingYear !== null)),
    Boolean(input.profession || input.company || input.jobTitle || input.industry),
    Boolean(input.biography),
  ]
  const complete = sections.filter(Boolean).length
  return {
    percent: Math.round((complete / sections.length) * 100),
    isComplete: complete === sections.length,
  }
}
