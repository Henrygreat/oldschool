import { PeopleView } from '@/components/professional/people-view'

export default async function ProfessionalPeoplePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <PeopleView
      basePath="/professional/people"
      mentorsOnly={false}
      params={await searchParams}
      subtitle="Find Old Boys by profession, skills, company and where they are based. Members appear here only if they opt in."
      title="Professional search"
    />
  )
}
