export default function UnitLoading() {
  return (
    <div className="px-4 py-6 arena-page animate-pulse">
      <div className="h-4 w-20 bg-gray-100 dark:bg-slate-800/80 rounded mb-4" />
      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800/80" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-24 bg-gray-100 dark:bg-slate-800/80 rounded" />
          <div className="h-5 w-48 bg-gray-100 dark:bg-slate-800/80 rounded" />
        </div>
      </div>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-gray-100 dark:border-slate-800 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800/80" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-24 bg-gray-100 dark:bg-slate-800/80 rounded" />
            <div className="h-3 w-36 bg-gray-100 dark:bg-slate-800/80 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
