import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { ArchiveRecordStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { archiveFieldNames, type ArchiveField } from '@/lib/archive-types'

export const MAX_ARCHIVE_IMPORT_ROWS = 10_000
export const MAX_ARCHIVE_TEXT_LENGTH = 500
export type ArchiveInput = {
  fullName: string
  firstName: string | null
  middleName: string | null
  surname: string | null
  title: string | null
  setYear: number
  house: string | null
  profession: string | null
  status: ArchiveRecordStatus
  email: string | null
  phone: string | null
  remarks: string | null
  biography: string | null
  sourceRowNumber: number
}

export type ArchiveDuplicate = {
  rowNumber: number
  reasons: string[]
  recordIds: string[]
}

export function normalizeArchiveName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizeArchivePhone(value: string) {
  return value.replace(/\D/g, '')
}

function cleanOptional(value: unknown, max = MAX_ARCHIVE_TEXT_LENGTH) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const text = String(value).trim()
  return text ? text.slice(0, max) : null
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return { firstName: parts[0] ?? null, middleName: null, surname: null }
  return {
    firstName: parts[0],
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : null,
    surname: parts.at(-1) ?? null,
  }
}

export function normalizeArchiveRows(
  rows: unknown,
  mapping: unknown,
  sourceRowNumbers?: unknown
): { records: ArchiveInput[]; errors: string[] } {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_ARCHIVE_IMPORT_ROWS) {
    return { records: [], errors: [`Choose between 1 and ${MAX_ARCHIVE_IMPORT_ROWS} spreadsheet rows.`] }
  }
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    return { records: [], errors: ['Choose a valid column mapping.'] }
  }
  if (
    sourceRowNumbers !== undefined &&
    (!Array.isArray(sourceRowNumbers) ||
      sourceRowNumbers.length !== rows.length ||
      sourceRowNumbers.some((rowNumber) => !Number.isInteger(rowNumber) || rowNumber < 2))
  ) {
    return { records: [], errors: ['The spreadsheet row data is invalid.'] }
  }

  const fieldMapping = mapping as Record<string, unknown>
  const indexFor = (field: ArchiveField) => {
    const index = fieldMapping[field]
    return Number.isInteger(index) && Number(index) >= 0 && Number(index) < 50
      ? Number(index)
      : null
  }
  const records: ArchiveInput[] = []
  const errors: string[] = []
  for (let offset = 0; offset < rows.length; offset += 1) {
    const sourceRowNumber = Array.isArray(sourceRowNumbers) ? sourceRowNumbers[offset] as number : offset + 2
    const rawRow = rows[offset]
    if (!Array.isArray(rawRow) || rawRow.length > 50) {
      errors.push(`Row ${sourceRowNumber} has invalid data.`)
      continue
    }
    const cell = (field: ArchiveField) => {
      const index = indexFor(field)
      return index === null ? null : cleanOptional(rawRow[index])
    }

    const originalName = cell('fullName')
    const first = cell('firstName')
    const middle = cell('middleName')
    const surname = cell('surname')
    let fullName = originalName || [first, middle, surname].filter(Boolean).join(' ')
    const statusText = [cell('status'), cell('remarks'), fullName].filter(Boolean).join(' ')
    const deceased = /\b(?:RIP|DECEASED|IN\s+MEMORIAM)\b/i.test(statusText)
    const rawStatus = cell('status') ?? ''
    const explicitlyLiving = /\b(?:LIVING|ALIVE)\b/i.test(rawStatus) &&
      !/\b(?:NOT|NON)\s+(?:LIVING|ALIVE)\b/i.test(rawStatus)
    fullName = fullName.replace(/\b(?:RIP|DECEASED|IN\s+MEMORIAM)\b/ig, '').replace(/\s+/g, ' ').trim()
    if (!fullName) {
      errors.push(`Row ${sourceRowNumber} is missing a name.`)
      continue
    }

    const rawYear = cell('setYear') ?? ''
    const yearMatch = rawYear.match(/\b(19\d{2}|20\d{2})\b/)
    const setYear = yearMatch ? Number(yearMatch[1]) : Number.NaN
    if (!Number.isInteger(setYear) || setYear < 1900 || setYear > new Date().getFullYear()) {
      errors.push(`Row ${sourceRowNumber} has an invalid or missing set/year.`)
      continue
    }

    const parsedName = splitName(fullName)
    const email = cell('email')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Row ${sourceRowNumber} has an invalid email address.`)
      continue
    }
    const phone = cell('phone')
    if (phone && normalizeArchivePhone(phone).length < 7) {
      errors.push(`Row ${sourceRowNumber} has an invalid phone number.`)
      continue
    }
    records.push({
      fullName: fullName.slice(0, 200),
      firstName: first?.slice(0, 80) ?? parsedName.firstName,
      middleName: middle?.slice(0, 80) ?? parsedName.middleName,
      surname: surname?.slice(0, 80) ?? parsedName.surname,
      title: cell('title')?.slice(0, 80) ?? null,
      setYear,
      house: cell('house')?.slice(0, 120) ?? null,
      profession: cell('profession')?.slice(0, 120) ?? null,
      status: deceased
        ? ArchiveRecordStatus.DECEASED
        : explicitlyLiving
          ? ArchiveRecordStatus.LIVING
          : ArchiveRecordStatus.UNKNOWN,
      email: email?.toLowerCase().slice(0, 254) ?? null,
      phone: phone?.slice(0, 80) ?? null,
      remarks: cell('remarks'),
      biography: cell('biography'),
      sourceRowNumber,
    })
  }
  return { records, errors }
}

export function hashParsedRows(rows: unknown, sourceRowNumbers: unknown) {
  return createHash('sha256').update(JSON.stringify([rows, sourceRowNumbers]) ?? '').digest('hex')
}

export function signedImportToken(contentHash: string, rowsHash: string, userId: string, schoolId: string) {
  const expiresAt = Date.now() + 30 * 60 * 1000
  const payload = `${contentHash}.${rowsHash}.${userId}.${schoolId}.${expiresAt}`
  const signature = createHmac('sha256', process.env.AUTH_SECRET ?? '')
    .update(payload)
    .digest('base64url')
  return `${Buffer.from(payload).toString('base64url')}.${signature}`
}

export function verifyImportToken(token: unknown, userId: string, schoolId: string) {
  if (typeof token !== 'string' || token.length > 512) return null
  const [encoded, providedSignature] = token.split('.')
  if (!encoded || !providedSignature) return null
  let payload: string
  try {
    payload = Buffer.from(encoded, 'base64url').toString()
  } catch {
    return null
  }
  const expectedSignature = createHmac('sha256', process.env.AUTH_SECRET ?? '')
    .update(payload)
    .digest()
  let actualSignature: Buffer
  try {
    actualSignature = Buffer.from(providedSignature, 'base64url')
  } catch {
    return null
  }
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) return null
  const [contentHash, rowsHash, tokenUserId, tokenSchoolId, expiry, ...extra] = payload.split('.')
  if (
    !/^[a-f0-9]{64}$/.test(contentHash ?? '') ||
    !/^[a-f0-9]{64}$/.test(rowsHash ?? '') ||
    tokenUserId !== userId ||
    tokenSchoolId !== schoolId ||
    extra.length > 0 ||
    !expiry ||
    Number(expiry) < Date.now()
  ) return null
  return { contentHash, rowsHash }
}

export function hashImportFile(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex')
}

export function hashImportConfiguration(fileHash: string, mapping: unknown) {
  const value = mapping && typeof mapping === 'object' && !Array.isArray(mapping)
    ? mapping as Record<string, unknown>
    : {}
  const canonical = archiveFieldNames
    .map((field) => `${field}:${Number.isInteger(value[field]) ? value[field] : ''}`)
    .join('|')
  return createHash('sha256').update(`${fileHash}|${canonical}`).digest('hex')
}

export async function findArchiveDuplicates(schoolId: string, records: ArchiveInput[]) {
  const candidates: { id: string; fullName: string; setYear: number; house: string | null; email: string | null; phone: string | null }[] = []
  const groups: ArchiveInput[][] = []
  for (let index = 0; index < records.length; index += 40) {
    groups.push(records.slice(index, index + 40))
  }
  for (const group of groups) {
    const or: Prisma.AlumniArchiveRecordWhereInput[] = group.flatMap((record) => {
      const conditions: Prisma.AlumniArchiveRecordWhereInput[] = [
        { fullName: { equals: record.fullName, mode: 'insensitive' }, setYear: record.setYear },
      ]
      if (record.email) conditions.push({ email: { equals: record.email, mode: 'insensitive' } })
      if (record.phone) conditions.push({ phone: record.phone })
      return conditions
    })
    if (!or.length) continue
    const found = await prisma.alumniArchiveRecord.findMany({
      where: { schoolId, OR: or },
      take: 500,
      select: { id: true, fullName: true, setYear: true, house: true, email: true, phone: true },
    })
    candidates.push(...found)
    const phones = [...new Set(group.map((record) => normalizeArchivePhone(record.phone ?? '')).filter(Boolean))]
    if (phones.length) {
      const phoneMatches = await prisma.$queryRaw<{
        id: string
        fullName: string
        setYear: number
        house: string | null
        email: string | null
        phone: string | null
      }[]>(Prisma.sql`
        SELECT "id", "fullName", "setYear", "house", "email", "phone"
        FROM "AlumniArchiveRecord"
        WHERE "schoolId" = ${schoolId}
          AND "phone" IS NOT NULL
          AND regexp_replace("phone", '[^0-9]', '', 'g') IN (${Prisma.join(phones)})
        LIMIT 500
      `)
      candidates.push(...phoneMatches)
    }
  }
  const duplicateByRow = new Map<number, ArchiveDuplicate>()
  const inFile = new Map<string, number[]>()
  const inFileByEmail = new Map<string, number[]>()
  const inFileByPhone = new Map<string, number[]>()
  for (const record of records) {
    const key = `${record.setYear}:${normalizeArchiveName(record.fullName)}`
    inFile.set(key, [...(inFile.get(key) ?? []), record.sourceRowNumber])
    if (record.email) {
      const email = record.email.toLocaleLowerCase()
      inFileByEmail.set(email, [...(inFileByEmail.get(email) ?? []), record.sourceRowNumber])
    }
    const phone = normalizeArchivePhone(record.phone ?? '')
    if (phone) inFileByPhone.set(phone, [...(inFileByPhone.get(phone) ?? []), record.sourceRowNumber])
  }
  for (const record of records) {
    const reasons = new Set<string>()
    const recordIds = new Set<string>()
    for (const candidate of candidates) {
      const sameEmail = record.email && candidate.email?.toLocaleLowerCase() === record.email
      const samePhone = record.phone && normalizeArchivePhone(candidate.phone ?? '') === normalizeArchivePhone(record.phone)
      const sameNameSet =
        candidate.setYear === record.setYear &&
        normalizeArchiveName(candidate.fullName) === normalizeArchiveName(record.fullName)
      if (sameEmail) reasons.add('matching email')
      if (samePhone) reasons.add('matching phone')
      if (sameNameSet) reasons.add(candidate.house && record.house && candidate.house.toLowerCase() !== record.house.toLowerCase()
        ? 'same name and set; different house'
        : 'same name and set')
      if (sameEmail || samePhone || sameNameSet) recordIds.add(candidate.id)
    }
    const key = `${record.setYear}:${normalizeArchiveName(record.fullName)}`
    const duplicateRows = inFile.get(key) ?? []
    const firstRow = duplicateRows[0]
    if (firstRow !== undefined && firstRow !== record.sourceRowNumber) {
      reasons.add(`same name and set as spreadsheet row ${firstRow}`)
    }
    const emailRow = record.email
      ? inFileByEmail.get(record.email.toLocaleLowerCase())?.find((rowNumber) => rowNumber !== record.sourceRowNumber)
      : undefined
    if (emailRow !== undefined) reasons.add(`matching email as spreadsheet row ${emailRow}`)
    const phone = normalizeArchivePhone(record.phone ?? '')
    const phoneRow = phone
      ? inFileByPhone.get(phone)?.find((rowNumber) => rowNumber !== record.sourceRowNumber)
      : undefined
    if (phoneRow !== undefined) reasons.add(`matching phone as spreadsheet row ${phoneRow}`)
    if (reasons.size) {
      duplicateByRow.set(record.sourceRowNumber, {
        rowNumber: record.sourceRowNumber,
        reasons: [...reasons],
        recordIds: [...recordIds],
      })
    }
  }
  return duplicateByRow
}
