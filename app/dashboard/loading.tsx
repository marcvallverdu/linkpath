export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-800" />
        ))}
      </div>
      <div className="h-8 w-48 animate-pulse rounded bg-slate-800" />
      <div className="h-64 animate-pulse rounded-3xl bg-slate-800" />
    </div>
  );
}
