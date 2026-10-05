import { NextResponse } from 'next/server'
import { currentSchoolAdministrator } from '@/lib/admin'
import {
  findArchiveDuplicates,
  hashParsedRows,
  normalizeArchiveRows,
  verifyImportToken,
} from '@/lib/alumni-archive'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const admin = await currentSchoolAdministrator()
  if (!admin) return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 })
  const lengthHeader = request.headers.get('content-length')
  const contentLength = Number(lengthHeader)
  if (!lengthHeader || !/^\d+$/.test(lengthHeader)) {
    return NextResponse.json({ error: 'The preview size could not be verified.' }, { status: 411 })
  }
  if (!Number.isFinite(contentLength) || contentLength > 2_500_000) {
    return NextResponse.json({ error: 'The mapped preview is too large.' }, { status: 413 })
  }

  try {
    const body = await request.json() as {
      rows?: unknown
      sourceRowNumbers?: unknown
      mapping?: unknown
      token?: unknown
    }
    const token = verifyImportToken(body.token, admin.id, admin.schoolId)
    if (!token) return NextResponse.json({ error: 'This import preview expired. Upload the file again.' }, { status: 400 })
    if (hashParsedRows(body.rows, body.sourceRowNumbers) !== token.rowsHash) {
      return NextResponse.json({ error: 'The spreadsheet data changed. Upload the file again.' }, { status: 400 })
    }
    const normalized = normalizeArchiveRows(body.rows, body.mapping, body.sourceRowNumbers)
    const duplicates = await findArchiveDuplicates(admin.schoolId, normalized.records)
    return NextResponse.json({
      records: normalized.records,
      errors: normalized.errors,
      duplicates: [...duplicates.values()],
      contentHash: token.contentHash,
    })
  } catch {
    console.error('Could not validate alumni archive preview.')
    return NextResponse.json({ error: 'The preview could not be validated. Try the upload again.' }, { status: 400 })
  }
}
