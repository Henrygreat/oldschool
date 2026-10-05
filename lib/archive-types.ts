export const archiveFieldNames = [
  'fullName',
  'firstName',
  'middleName',
  'surname',
  'title',
  'setYear',
  'house',
  'profession',
  'status',
  'email',
  'phone',
  'remarks',
  'biography',
] as const

export type ArchiveField = (typeof archiveFieldNames)[number]
export type ArchiveMapping = Partial<Record<ArchiveField, number>>
