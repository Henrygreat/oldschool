import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { currentSchoolAdministrator } from '@/lib/admin'
import {
  findArchiveDuplicates,
  hashParsedRows,
  hashImportConfiguration,
  normalizeArchiveRows,
  verifyImportToken,
} from '@/lib/alumni-archive'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Choice = { rowNumber: number; action: 'skip' | 'import' }

function redactDiagnosticMessage(message: string, sensitiveValues: string[]) {
  let safeMessage = message
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^/\s@]+@/gi, '$1[redacted]@')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted]')
    .replace(/\)=\([^)]*\)/g, ')=([redacted])')
  for (const value of [...new Set(sensitiveValues)].sort((a, b) => b.length - a.length)) {
    safeMessage = safeMessage.split(value).join('[redacted]')
  }
  return safeMessage.slice(0, 2000)
}

function safePrismaMetadata(error: unknown, sensitiveValues: string[]) {
  if (!error || typeof error !== 'object' || !('meta' in error) || !error.meta || typeof error.meta !== 'object') {
    return undefined
  }
  const meta = error.meta as Record<string, unknown>
  const safe: Record<string, string | string[]> = {}
  for (const key of ['modelName', 'target', 'field_name', 'constraint', 'column']) {
    const value = meta[key]
    if (typeof value === 'string') {
      safe[key] = redactDiagnosticMessage(value, sensitiveValues)
    } else if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      safe[key] = value.map((item) => redactDiagnosticMessage(item, sensitiveValues))
    }
  }
  return Object.keys(safe).length > 0 ? safe : undefined
}

export async function POST(request: Request) {
  const admin = await currentSchoolAdministrator()
  if (!admin) return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 })
  const lengthHeader = request.headers.get('content-length')
  const contentLength = Number(lengthHeader)
  if (!lengthHeader || !/^\d+$/.test(lengthHeader)) {
    return NextResponse.json({ error: 'The import size could not be verified.' }, { status: 411 })
  }
  if (!Number.isFinite(contentLength) || contentLength > 2_500_000) {
    return NextResponse.json({ error: 'The import confirmation is too large.' }, { status: 413 })
  }

  let stage = 'reading confirmation request'
  let sensitiveValues: string[] = []
  let rowIndex: number | null = null
  let sourceRowNumber: number | null = null
  try {
    const body = await request.json() as {
      rows?: unknown
      sourceRowNumbers?: unknown
      mapping?: unknown
      token?: unknown
      filename?: unknown
      choices?: unknown
    }
    sensitiveValues = [
      ...(Array.isArray(body.rows)
        ? body.rows.flatMap((row) =>
            Array.isArray(row)
              ? row.filter((value): value is string => typeof value === 'string' && value.length > 0)
              : []
          )
        : []),
      ...(typeof body.filename === 'string' ? [body.filename] : []),
      ...(typeof body.token === 'string' ? [body.token] : []),
    ]
    stage = 'verifying import preview'
    const token = verifyImportToken(body.token, admin.id, admin.schoolId)
    if (!token) return NextResponse.json({ error: 'This import preview expired. Upload the file again.' }, { status: 400 })
    if (hashParsedRows(body.rows, body.sourceRowNumbers) !== token.rowsHash) {
      return NextResponse.json({ error: 'The spreadsheet data changed. Upload the file again.' }, { status: 400 })
    }
    stage = 'validating mapped rows'
    const contentHash = hashImportConfiguration(token.contentHash, body.mapping)
    const normalized = normalizeArchiveRows(body.rows, body.mapping, body.sourceRowNumbers)
    stage = 'checking archive duplicates'
    const duplicates = await findArchiveDuplicates(admin.schoolId, normalized.records)
    if (normalized.records.length === 0) {
      return NextResponse.json({ error: 'The spreadsheet has no valid rows to import.' }, { status: 400 })
    }
    stage = 'validating duplicate choices'
    const choices = Array.isArray(body.choices) ? body.choices as Choice[] : []
    if (choices.some((choice) =>
      !choice ||
      !Number.isInteger(choice.rowNumber) ||
      (choice.action !== 'skip' && choice.action !== 'import')
    )) {
      return NextResponse.json({ error: 'The duplicate review contains an invalid choice.' }, { status: 400 })
    }
    const choiceByRow = new Map(choices.map((choice) => [choice.rowNumber, choice.action]))
    const selectedRecords = normalized.records.filter((record) => {
      if (!duplicates.has(record.sourceRowNumber)) return true
      return choiceByRow.get(record.sourceRowNumber) === 'import'
    })
    const skippedDuplicates = normalized.records.length - selectedRecords.length
    const filename = typeof body.filename === 'string'
      ? body.filename.replace(/[^\p{Letter}\p{Number}._ -]/gu, '').slice(0, 200)
      : 'alumni-import'

    stage = 'starting database transaction'
    const result = await prisma.$transaction(async (transaction) => {
      stage = 'checking for a previously imported batch'
      const existing = await transaction.alumniImportBatch.findUnique({
        where: { schoolId_contentHash: { schoolId: admin.schoolId, contentHash } },
        select: { id: true },
      })
      if (existing) return { duplicateUpload: true as const }

      stage = 'creating import batch'
      const batch = await transaction.alumniImportBatch.create({
        data: {
          schoolId: admin.schoolId,
          uploadedById: admin.id,
          sourceFilename: filename || 'alumni-import',
          contentHash,
          totalRows: Array.isArray(body.rows) ? body.rows.length : normalized.records.length,
          skippedCount: skippedDuplicates + normalized.errors.length,
          duplicateCount: duplicates.size,
          failedCount: normalized.errors.length,
        },
        select: { id: true },
      })
      const cohortIds = new Map<number, string>()
      for (const year of [...new Set(selectedRecords.map((record) => record.setYear))]) {
        stage = 'creating or finding set cohort'
        const cohort = await transaction.cohort.upsert({
          where: { schoolId_year: { schoolId: admin.schoolId, year } },
          create: { schoolId: admin.schoolId, year, name: `Set of ${year}` },
          update: {},
          select: { id: true },
        })
        cohortIds.set(year, cohort.id)
      }
      let importedCount = 0
      for (const [index, record] of selectedRecords.entries()) {
        rowIndex = index
        sourceRowNumber = record.sourceRowNumber
        stage = 'creating archive record'
        await transaction.alumniArchiveRecord.create({
          data: {
            ...record,
            schoolId: admin.schoolId,
            cohortId: cohortIds.get(record.setYear),
            importBatchId: batch.id,
          },
        })
        importedCount += 1
      }
      rowIndex = null
      sourceRowNumber = null
      stage = 'updating import batch counts'
      await transaction.alumniImportBatch.update({
        where: { id: batch.id },
        data: {
          importedCount,
          skippedCount: skippedDuplicates + normalized.errors.length + selectedRecords.length - importedCount,
        },
      })
      return {
        duplicateUpload: false as const,
        importedCount,
        skippedCount: skippedDuplicates + normalized.errors.length + selectedRecords.length - importedCount,
        duplicateCount: duplicates.size,
        failedCount: normalized.errors.length,
      }
    })

    if (result.duplicateUpload) {
      return NextResponse.json({ error: 'This exact spreadsheet was already imported. No records were added.' }, { status: 409 })
    }
    stage = 'revalidating archive pages'
    revalidatePath('/admin/alumni')
    revalidatePath('/directory')
    revalidatePath('/sets/[year]', 'page')
    return NextResponse.json(result)
  } catch (error) {
    const errorRecord = error && typeof error === 'object'
      ? error as { code?: unknown }
      : undefined
    const code = typeof errorRecord?.code === 'string' && /^[A-Z][A-Z0-9]{1,9}$/.test(errorRecord.code)
      ? errorRecord.code
      : undefined
    const errorName = error instanceof Error ? error.name : typeof error
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Could not confirm alumni archive import.', {
      prismaCode: code,
      errorName,
      errorMessage: redactDiagnosticMessage(errorMessage, sensitiveValues),
      prismaMetadata: safePrismaMetadata(error, sensitiveValues),
      stage,
      rowIndex,
      sourceRowNumber,
    })
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'This spreadsheet was already imported. No records were added.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'The import could not be completed. No partial rows were committed.' }, { status: 500 })
  }
}
