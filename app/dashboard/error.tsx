"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="text-4xl">⚠️</div>
      <h2 className="mt-4 text-lg font-semibold text-slate-200">Something went wrong</h2>
      <p className="mt-2 max-w-md text-center text-sm text-slate-400">
        {error.message || "An error occurred while loading this page."}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
      >
        Try Again
      </button>
    </div>
  );
}
