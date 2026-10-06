export const PROFESSIONAL_PAGE_SIZE = 12

export const businessRoleOptions = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'FOUNDER', label: 'Founder' },
  { value: 'CO_FOUNDER', label: 'Co-founder' },
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'EMPLOYEE', label: 'Employee' },
] as const

export const opportunityTypeOptions = [
  { value: 'JOB', label: 'Job' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'BUSINESS_OPPORTUNITY', label: 'Business opportunity' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'VOLUNTEERING', label: 'Volunteering' },
  { value: 'MENTORSHIP', label: 'Mentorship' },
  { value: 'OTHER', label: 'Other' },
] as const

export const workModeOptions = [
  { value: 'ON_SITE', label: 'On-site' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'REMOTE', label: 'Remote' },
] as const

export const listingReportReasons = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'MISLEADING', label: 'Misleading information' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content' },
  { value: 'FRAUD', label: 'Fraud or scam concern' },
  { value: 'DUPLICATE', label: 'Duplicate listing' },
  { value: 'OTHER', label: 'Other' },
] as const

export const opportunityTypeLabel = (value: string) =>
  opportunityTypeOptions.find((option) => option.value === value)?.label ?? value
export const workModeLabel = (value: string | null) =>
  workModeOptions.find((option) => option.value === value)?.label ?? null
export const businessRoleLabel = (value: string) =>
  businessRoleOptions.find((option) => option.value === value)?.label ?? value
