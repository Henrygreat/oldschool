import ExcelJS from 'exceljs'
import { Readable } from 'node:stream'
import { NextResponse } from 'next/server'
import { currentSchoolAdministrator } from '@/lib/admin'
import {
  hashImportFile,
  hashParsedRows,
  MAX_ARCHIVE_IMPORT_ROWS,
  signedImportToken,
} from '@/lib/alumni-archive'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const maxUploadBytes = 5 * 1024 * 1024
const maxColumns = 50
const maxTotalText = 1_500_000

function cellText(cell: ExcelJS.Cell) {
  const value = cell.value
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object') {
    if ('formula' in value || 'sharedFormula' in value) {
      throw new Error('FORMULAS_UNSUPPORTED')
    }
    if ('richText' in value) return value.richText.map((part) => part.text).join('')
    if ('text' in value && typeof value.text === 'string') return value.text
    return ''
  }
  return String(value).slice(0, 500)
}

export async function POST(request: Request) {
  const admin = await currentSchoolAdministrator()
  if (!admin) return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 })

  const lengthHeader = request.headers.get('content-length')
  const contentLength = Number(lengthHeader)
  if (!lengthHeader || !/^\d+$/.test(lengthHeader)) {
    return NextResponse.json({ error: 'The upload size could not be verified.' }, { status: 411 })
  }
  if (!Number.isFinite(contentLength) || contentLength > maxUploadBytes + 64 * 1024) {
    return NextResponse.json({ error: 'Upload a spreadsheet smaller than 5 MB.' }, { status: 413 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'The spreadsheet could not be read.' }, { status: 400 })
  }
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose a CSV or XLSX spreadsheet.' }, { status: 415 })
  }
  if (file.size === 0 || file.size > maxUploadBytes) {
    return NextResponse.json({ error: 'Upload a spreadsheet smaller than 5 MB.' }, { status: 413 })
  }
  const filename = file.name.split(/[\\/]/).at(-1)?.replace(/[^\p{Letter}\p{Number}._ -]/gu, '').slice(0, 200)
  const extension = filename?.split('.').at(-1)?.toLowerCase()
  if (extension !== 'csv' && extension !== 'xlsx') {
    return NextResponse.json({ error: 'Use a .csv or .xlsx file. Legacy .xls files are not supported.' }, { status: 415 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const workbook = new ExcelJS.Workbook()
  try {
    if (extension === 'csv') {
      await workbook.csv.read(Readable.from([bytes]))
    } else {
      await workbook.xlsx.load(bytes as never)
    }
  } catch (error) {
    console.error('Could not open uploaded alumni spreadsheet.', {
      error,
      filename,
      fileSize: file.size,
      mimeType: file.type,
    })
    return NextResponse.json({ error: 'The spreadsheet is malformed or cannot be opened.' }, { status: 400 })
  }

  const sheet = workbook.worksheets[0]
  if (!sheet) {
    return NextResponse.json({ error: 'The first sheet needs a header row and at least one data row.' }, { status: 400 })
  }
  const populatedRows: ExcelJS.Row[] = []
  let columnCount = 0
  sheet.eachRow((row) => {
    populatedRows.push(row)
    row.eachCell((cell, columnNumber) => {
      if (cell.value !== null && cell.value !== undefined) {
        columnCount = Math.max(columnCount, columnNumber)
      }
    })
  })
  const dataRowCount = populatedRows.filter((row) => row.number !== 1).length
  if (populatedRows.length < 2 || columnCount === 0) {
    return NextResponse.json({ error: 'The first sheet needs a header row and at least one data row.' }, { status: 400 })
  }
  if (columnCount > maxColumns || dataRowCount > MAX_ARCHIVE_IMPORT_ROWS) {
    return NextResponse.json({
      error: `The first sheet may contain at most ${maxColumns} columns and ${MAX_ARCHIVE_IMPORT_ROWS} data rows.`,
    }, { status: 413 })
  }

  try {
    const headers = Array.from({ length: columnCount }, (_, index) =>
      cellText(sheet.getRow(1).getCell(index + 1)).trim().slice(0, 100)
    )
    if (headers.some((header) => !header)) {
      return NextResponse.json({ error: 'Every spreadsheet column must have a header.' }, { status: 400 })
    }
    const rows: string[][] = []
    const sourceRowNumbers: number[] = []
    let totalText = headers.reduce((sum, header) => sum + header.length, 0)
    for (const row of populatedRows) {
      if (row.number === 1) continue
      const values = Array.from({ length: columnCount }, (_, index) =>
        cellText(row.getCell(index + 1)).slice(0, 500)
      )
      if (values.every((value) => !value.trim())) continue
      totalText += values.reduce((sum, value) => sum + value.length, 0)
      if (totalText > maxTotalText) {
        return NextResponse.json({ error: 'The spreadsheet contains too much text to preview safely.' }, { status: 413 })
      }
      rows.push(values)
      sourceRowNumbers.push(row.number)
    }
    if (!rows.length) {
      return NextResponse.json({ error: 'The spreadsheet contains no data rows.' }, { status: 400 })
    }
    if (rows.length > MAX_ARCHIVE_IMPORT_ROWS) {
      return NextResponse.json({ error: `The first sheet may contain at most ${MAX_ARCHIVE_IMPORT_ROWS} data rows.` }, { status: 413 })
    }
    return NextResponse.json({
      filename,
      headers,
      rows,
      sourceRowNumbers,
      token: signedImportToken(hashImportFile(bytes), hashParsedRows(rows, sourceRowNumbers), admin.id, admin.schoolId),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'FORMULAS_UNSUPPORTED') {
      return NextResponse.json({ error: 'Formula cells are not supported. Save the spreadsheet with values only.' }, { status: 400 })
    }
    console.error('Could not parse the uploaded alumni spreadsheet.')
    return NextResponse.json({ error: 'The spreadsheet could not be parsed.' }, { status: 400 })
  }
}
