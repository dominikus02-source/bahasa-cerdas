// Skeleton instan untuk /admin — muncul langsung saat navigasi sementara data
// dashboard di-fetch di server, agar "Panel Admin" terasa responsif dibuka.
export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-lg bg-slate-200 dark:bg-slate-800/60" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800/60" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-800/60" />
        <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-800/60" />
      </div>
      <div className="h-40 rounded-xl bg-slate-200 dark:bg-slate-800/60" />
    </div>
  );
}
