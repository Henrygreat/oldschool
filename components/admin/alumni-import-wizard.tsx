'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { archiveFieldNames, type ArchiveField } from '@/lib/archive-types'

type ParsedSheet = { filename: string; headers: string[]; rows: string[][]; sourceRowNumbers: number[]; token: string }
type ImportedRow = {
  fullName: string
  firstName: string | null
  middleName: string | null
  surname: string | null
  title: string | null
  setYear: number
  house: string | null
  profession: string | null
  status: 'LIVING' | 'DECEASED' | 'UNKNOWN'
  email: string | null
  phone: string | null
  remarks: string | null
  biography: string | null
  sourceRowNumber: number
}
type Duplicate = { rowNumber: number; reasons: string[]; recordIds: string[] }
type Preview = { records: ImportedRow[]; errors: string[]; duplicates: Duplicate[] }
type FieldOption = { id: ArchiveField; label: string }

const fields: FieldOption[] = [
  { id: 'fullName', label: 'Full name' },
  { id: 'firstName', label: 'First name' },
  { id: 'middleName', label: 'Middle name' },
  { id: 'surname', label: 'Surname' },
  { id: 'title', label: 'Title' },
  { id: 'setYear', label: 'Set / year' },
  { id: 'house', label: 'House' },
  { id: 'profession', label: 'Profession' },
  { id: 'status', label: 'Status' },
  { id: 'email', label: 'Email (admin only)' },
  { id: 'phone', label: 'Phone (admin only)' },
  { id: 'remarks', label: 'Remarks (admin only)' },
  { id: 'biography', label: 'Biography (admin only)' },
]

const aliases: Record<ArchiveField, string[]> = {
  fullName: ['name', 'full name', 'alumni name', 'old boy', 'member name'],
  firstName: ['first name', 'firstname', 'given name', 'forename'],
  middleName: ['middle name', 'middlename', 'other names'],
  surname: ['surname', 'last name', 'lastname', 'family name'],
  title: ['title', 'salutation', 'prefix'],
  setYear: ['set', 'set year', 'year', 'cohort', 'class year', 'graduation year'],
  house: ['house', 'school house'],
  profession: ['profession', 'occupation', 'job', 'career'],
  status: ['status', 'life status'],
  email: ['email', 'email address', 'e-mail'],
  phone: ['phone', 'telephone', 'mobile', 'phone number'],
  remarks: ['remarks', 'notes', 'comment'],
  biography: ['biography', 'bio', 'profile'],
}

function inferredMapping(headers: string[]) {
  const mapping: Partial<Record<ArchiveField, number>> = {}
  for (const field of archiveFieldNames) {
    const index = headers.findIndex((header) => {
      const normalized = header.trim().toLowerCase().replace(/[_-]+/g, ' ')
      return aliases[field].some((alias) => normalized === alias)
    })
    if (index >= 0) mapping[field] = index
  }
  return mapping
}

async function responseError(response: Response) {
  try {
    const result = await response.json() as { error?: string }
    return result.error ?? 'The request could not be completed.'
  } catch {
    return 'The request could not be completed.'
  }
}

export function AlumniImportWizard() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [sheet, setSheet] = useState<ParsedSheet | null>(null)
  const [mapping, setMapping] = useState<Partial<Record<ArchiveField, number>>>({})
  const [preview, setPreview] = useState<Preview | null>(null)
  const [choices, setChoices] = useState<Record<number, 'skip' | 'import'>>({})
  const [step, setStep] = useState<'select' | 'mapping' | 'preview' | 'done'>('select')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resultMessage, setResultMessage] = useState('')

  const errorsByRow = useMemo(() => {
    const result = new Map<number, string[]>()
    for (const message of preview?.errors ?? []) {
      const match = message.match(/^Row (\d+)/)
      if (match) result.set(Number(match[1]), [...(result.get(Number(match[1])) ?? []), message])
    }
    return result
  }, [preview])
  const duplicateByRow = useMemo(
    () => new Map((preview?.duplicates ?? []).map((item) => [item.rowNumber, item])),
    [preview]
  )

  async function parseFile() {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const data = new FormData()
      data.set('file', file)
      const response = await fetch('/api/admin/alumni/import/parse', { method: 'POST', body: data })
      if (!response.ok) throw new Error(await responseError(response))
      const result = await response.json() as ParsedSheet
      setSheet(result)
      setMapping(inferredMapping(result.headers))
      setPreview(null)
      setChoices({})
      setStep('mapping')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The file could not be parsed.')
    } finally {
      setBusy(false)
    }
  }

  async function validateMapping() {
    if (!sheet) return
    const hasName = mapping.fullName !== undefined ||
      (mapping.firstName !== undefined && mapping.surname !== undefined)
    if (!hasName || mapping.setYear === undefined) {
      setError('Map a full name (or first name and surname) and Set / year to continue.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/admin/alumni/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: sheet.rows, sourceRowNumbers: sheet.sourceRowNumbers, mapping, token: sheet.token }),
      })
      if (!response.ok) throw new Error(await responseError(response))
      const result = await response.json() as Preview
      setPreview(result)
      setChoices(Object.fromEntries(result.duplicates.map((duplicate) => [duplicate.rowNumber, 'skip'])))
      setStep('preview')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The preview could not be validated.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmImport() {
    if (!sheet) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/admin/alumni/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: sheet.rows,
          sourceRowNumbers: sheet.sourceRowNumbers,
          mapping,
          token: sheet.token,
          filename: sheet.filename,
          choices: Object.entries(choices).map(([rowNumber, action]) => ({
            rowNumber: Number(rowNumber),
            action,
          })),
        }),
      })
      const result = await response.json() as {
        importedCount?: number
        skippedCount?: number
        duplicateCount?: number
        failedCount?: number
        error?: string
      }
      if (!response.ok) throw new Error(result.error ?? 'The import could not be completed.')
      setResultMessage(
        `Imported ${result.importedCount ?? 0}; skipped ${result.skippedCount ?? 0}; duplicates ${result.duplicateCount ?? 0}; failed ${result.failedCount ?? 0}.`
      )
      setStep('done')
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The import could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  function cancel() {
    setFile(null)
    setSheet(null)
    setPreview(null)
    setMapping({})
    setChoices({})
    setError('')
    setStep('select')
  }

  const validCount = preview?.records.length ?? 0
  const warningCount = preview?.records.filter((row) => !row.house || !row.profession || row.status === 'UNKNOWN').length ?? 0
  const statusFor = (row: ImportedRow) => {
    if (errorsByRow.has(row.sourceRowNumber)) return 'Invalid'
    if (duplicateByRow.has(row.sourceRowNumber)) return 'Duplicate'
    if (!row.house || !row.profession || row.status === 'UNKNOWN') return 'Warning'
    return 'Ready'
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-[#9C0621]">Admin import</p>
          <h1 className="mt-1 text-2xl font-bold">Import historical Old Boys</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Upload a CSV or XLSX, map its columns, review validation and duplicates, then confirm. No archive rows are written before confirmation.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Step {step === 'select' ? '1' : step === 'mapping' ? '2' : step === 'preview' ? '3' : '4'} of 4</span>
      </div>

      {step === 'select' && (
        <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <label className="block text-sm font-semibold text-slate-700">
            CSV or Excel workbook (.csv, .xlsx)
            <input
              accept=".csv,.xlsx"
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
              onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
              type="file"
            />
          </label>
          <p className="mt-2 text-xs text-slate-500">Maximum 5 MB and 1,000 data rows. Legacy .xls files are not supported. Formula cells and photo import are not supported.</p>
          <Button className="mt-4 gap-2 bg-[#9C0621] text-white hover:bg-[#80051b]" disabled={!file || busy} onClick={() => void parseFile()} type="button">
            <UploadCloud className="h-4 w-4" /> {busy ? 'Reading spreadsheet…' : 'Upload and map columns'}
          </Button>
        </div>
      )}

      {step === 'mapping' && sheet && (
        <div className="mt-7">
          <p className="text-sm font-semibold text-slate-800">{sheet.filename} · {sheet.rows.length} data rows</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <label className="block text-sm font-semibold text-slate-700" key={field.id}>
                {field.label}
                <select
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal"
                  onChange={(event) => setMapping((current) => {
                    const next = { ...current }
                    if (event.target.value === '') delete next[field.id]
                    else next[field.id] = Number(event.target.value)
                    return next
                  })}
                  value={mapping[field.id] ?? ''}
                >
                  <option value="">Not mapped</option>
                  {sheet.headers.map((header, index) => <option key={`${index}-${header}`} value={index}>{header}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button className="gap-2 bg-[#9C0621] text-white hover:bg-[#80051b]" disabled={busy} onClick={() => void validateMapping()} type="button">
              {busy ? 'Validating…' : 'Preview and check duplicates'} <ArrowRight className="h-4 w-4" />
            </Button>
            <Button disabled={busy} onClick={cancel} type="button" variant="outline">Cancel</Button>
          </div>
        </div>
      )}

      {step === 'preview' && sheet && preview && (
        <div className="mt-7">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ['Total rows', sheet.rows.length],
              ['Valid', validCount],
              ['Warnings', warningCount],
              ['Duplicates', preview.duplicates.length],
              ['Invalid', preview.errors.length],
            ].map(([label, count]) => (
              <div className="rounded-xl border border-slate-200 p-3" key={label}>
                <span className="block text-xl font-bold text-slate-950">{count}</span>
                <span className="text-xs font-medium text-slate-500">{label}</span>
              </div>
            ))}
          </div>
          {preview.errors.length > 0 && (
            <ul className="mt-4 max-h-32 overflow-auto rounded-xl bg-red-50 p-3 text-xs text-red-800">
              {preview.errors.map((message) => <li key={message}>{message}</li>)}
            </ul>
          )}
          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-3">Row</th><th className="px-3 py-3">Name</th><th className="px-3 py-3">Set</th><th className="px-3 py-3">House</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Duplicate review</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sheet.rows.map((_, index) => {
                  const rowNumber = sheet.sourceRowNumbers[index] ?? index + 2
                  const record = preview.records.find((item) => item.sourceRowNumber === rowNumber)
                  const duplicate = duplicateByRow.get(rowNumber)
                  const rowErrors = errorsByRow.get(rowNumber) ?? []
                  const status = record ? statusFor(record) : 'Invalid'
                  return (
                    <tr key={rowNumber}>
                      <td className="px-3 py-3">{rowNumber}</td>
                      <td className="px-3 py-3 font-medium">{record?.fullName ?? '—'}</td>
                      <td className="px-3 py-3">{record?.setYear ?? '—'}</td>
                      <td className="px-3 py-3">{record?.house ?? '—'}</td>
                      <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${status === 'Invalid' ? 'bg-red-50 text-red-700' : status === 'Duplicate' ? 'bg-amber-50 text-amber-800' : status === 'Warning' ? 'bg-yellow-50 text-yellow-800' : 'bg-emerald-50 text-emerald-700'}`}>{status}</span></td>
                      <td className="max-w-sm px-3 py-3 text-xs text-slate-600">
                        {duplicate ? (
                          <div className="space-y-1.5">
                            <p>{duplicate.reasons.join('; ')} {duplicate.recordIds.map((id) => <a className="font-semibold text-[#9C0621] underline" href={`/admin/alumni/records/${id}`} key={id}>Review</a>)}</p>
                            <select
                              aria-label={`Duplicate action for row ${rowNumber}`}
                              className="rounded-lg border border-slate-300 bg-white px-2 py-1"
                              onChange={(event) => setChoices((current) => ({ ...current, [rowNumber]: event.target.value as 'skip' | 'import' }))}
                              value={choices[rowNumber] ?? 'skip'}
                            >
                              <option value="skip">Skip this row</option>
                              <option value="import">Import anyway</option>
                            </select>
                          </div>
                        ) : rowErrors.length ? rowErrors.join(' ') : status === 'Warning' ? record?.status === 'UNKNOWN' ? 'Life status is unknown. Admin must confirm living status before claims are enabled.' : 'Optional house or profession is missing.' : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">Imported emails, phone numbers, and remarks remain admin-only. “Import anyway” adds a separate archive record; it never merges records.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button className="gap-2 bg-[#9C0621] text-white hover:bg-[#80051b]" disabled={busy || validCount === 0} onClick={() => void confirmImport()} type="button">
              {busy ? 'Importing…' : 'Confirm import'} <ArrowRight className="h-4 w-4" />
            </Button>
            <Button className="gap-2" disabled={busy} onClick={() => setStep('mapping')} type="button" variant="outline">
              <ArrowLeft className="h-4 w-4" /> Change mapping
            </Button>
            <Button disabled={busy} onClick={cancel} type="button" variant="outline">Cancel import</Button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="mt-7 rounded-2xl bg-emerald-50 p-5">
          <p className="font-bold text-emerald-900">Import completed</p>
          <p className="mt-1 text-sm text-emerald-800">{resultMessage}</p>
          <Button className="mt-4" onClick={() => { cancel(); router.push('/admin/alumni') }} type="button">Back to Alumni Archive</Button>
        </div>
      )}
      {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
    </section>
  )
}
