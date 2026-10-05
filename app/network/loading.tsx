export default function NetworkLoading() {
  return (
    <main aria-label="Loading your network" className="mx-auto min-h-screen max-w-7xl animate-pulse px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-40 rounded-3xl bg-slate-200" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => <div className="h-24 rounded-2xl bg-slate-200" key={index} />)}
      </div>
      <div className="mt-8 h-8 w-56 rounded bg-slate-200" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <div className="h-52 rounded-2xl bg-slate-200" key={index} />)}
      </div>
    </main>
  )
}
