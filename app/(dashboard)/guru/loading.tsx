export default function GuruLoading() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="h-6 w-48 rounded-lg bg-slate-200" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-xl bg-slate-200" />
        <div className="h-64 rounded-xl bg-slate-200" />
      </div>
      <div className="h-40 rounded-xl bg-slate-200" />
    </div>
  )
}
