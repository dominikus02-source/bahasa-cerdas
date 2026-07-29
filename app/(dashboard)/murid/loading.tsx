export default function MuridLoading() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="h-6 w-48 rounded-lg bg-slate-200" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-48 rounded-xl bg-slate-200" />
        <div className="h-48 rounded-xl bg-slate-200" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-200" />
        ))}
      </div>
    </div>
  )
}
