"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

type TestStatus = "queued" | "running" | "success" | "partial" | "failed";

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
  queued: { label: "Queued", class: "bg-gray-500/20 text-gray-400" },
  running: { label: "Running", class: "bg-blue-500/20 text-blue-400 animate-pulse" },
  success: { label: "Success", class: "bg-green-500/20 text-green-400" },
  partial: { label: "Partial", class: "bg-yellow-500/20 text-yellow-400" },
  failed: { label: "Failed", class: "bg-red-500/20 text-red-400" },
};

const STATUS_FILTERS: Array<{ value: TestStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "queued", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

function truncateUrl(url: string, max = 50): string {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > max ? display.slice(0, max) + "…" : display;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TestsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<TestStatus | "all">("all");

  const tests = useQuery(api.tests.listByOrg, {
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-200">Link Checks</h2>
          <p className="mt-1 text-sm text-slate-400">
            Run and review your affiliate link tests.
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          + New Test
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              statusFilter === f.value
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {tests === undefined && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-800" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {tests !== undefined && tests.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 py-16">
          <p className="text-lg font-medium text-slate-300">No tests yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Run your first affiliate link check to see results here.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Run First Test
          </button>
        </div>
      )}

      {/* Test table */}
      {tests !== undefined && tests.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-left text-xs text-slate-400">
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Network</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Credits</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => {
                const style = STATUS_STYLES[test.status] || STATUS_STYLES.queued;
                return (
                  <tr
                    key={test._id}
                    onClick={() => router.push(`/dashboard/tests/${test._id}`)}
                    className="cursor-pointer border-b border-slate-800/50 transition hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-300" title={test.url}>
                      {truncateUrl(test.url)}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize text-slate-400">
                      {test.networkDetected || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {test.testType === "quick_check" ? "Quick" : "CMP"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", style.class)}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatDate(test.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">
                      {test.creditsCharged}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
