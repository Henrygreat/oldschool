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

  try {
    const body = await request.json() as {
      rows?: unknown
      sourceRowNumbers?: unknown
      mapping?: unknown
      token?: unknown
      filename?: unknown
      choices?: unknown
    }
    const token = verifyImportToken(body.token, admin.id, admin.schoolId)
    if (!token) return NextResponse.json({ error: 'This import preview expired. Upload the file again.' }, { status: 400 })
    if (hashParsedRows(body.rows, body.sourceRowNumbers) !== token.rowsHash) {
      return NextResponse.json({ error: 'The spreadsheet data changed. Upload the file again.' }, { status: 400 })
    }
    const contentHash = hashImportConfiguration(token.contentHash, body.mapping)
    const normalized = normalizeArchiveRows(body.rows, body.mapping, body.sourceRowNumbers)
    const duplicates = await findArchiveDuplicates(admin.schoolId, normalized.records)
    if (normalized.records.length === 0) {
      return NextResponse.json({ error: 'The spreadsheet has no valid rows to import.' }, { status: 400 })
    }
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

    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.alumniImportBatch.findUnique({
        where: { schoolId_contentHash: { schoolId: admin.schoolId, contentHash } },
        select: { id: true },
      })
      if (existing) return { duplicateUpload: true as const }

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
        const cohort = await transaction.cohort.upsert({
          where: { schoolId_year: { schoolId: admin.schoolId, year } },
          create: { schoolId: admin.schoolId, year, name: `Set of ${year}` },
          update: {},
          select: { id: true },
        })
        cohortIds.set(year, cohort.id)
      }
      let importedCount = 0
      for (const record of selectedRecords) {
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
    revalidatePath('/admin/alumni')
    revalidatePath('/directory')
    revalidatePath('/sets/[year]', 'page')
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'This spreadsheet was already imported. No records were added.' }, { status: 409 })
    }
    console.error('Could not confirm alumni archive import.')
    return NextResponse.json({ error: 'The import could not be completed. No partial rows were committed.' }, { status: 500 })
  }
}
