import { PeopleView } from '@/components/professional/people-view'

export default async function MentorsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <PeopleView
      basePath="/professional/mentors"
      mentorsOnly
      params={await searchParams}
      subtitle="Old Boys who offered to mentor. View a profile, connect and send a message to ask for guidance."
      title="Find a mentor"
    />
  )
}
