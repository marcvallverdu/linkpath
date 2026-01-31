"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="max-w-md text-center">
        <div className="text-5xl">💥</div>
        <h2 className="mt-4 text-xl font-bold text-slate-100">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-400">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="rounded-full border border-slate-700 px-6 py-2 text-sm text-slate-300 hover:border-slate-500"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
