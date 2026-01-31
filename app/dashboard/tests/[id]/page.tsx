"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useState } from "react";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
  queued: { label: "Queued", class: "bg-gray-500/20 text-gray-400" },
  running: { label: "Running", class: "bg-blue-500/20 text-blue-400 animate-pulse" },
  success: { label: "Success", class: "bg-green-500/20 text-green-400" },
  partial: { label: "Partial", class: "bg-yellow-500/20 text-yellow-400" },
  failed: { label: "Failed", class: "bg-red-500/20 text-red-400" },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.queued;
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium", style.class)}>
      {style.label}
    </span>
  );
}

function RedirectChain({ chain }: { chain: Array<{ url: string; statusCode: number }> }) {
  if (!chain || chain.length === 0) return <p className="text-sm text-slate-400">No redirects captured</p>;

  return (
    <div className="space-y-2">
      {chain.map((entry, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
              entry.statusCode >= 300 && entry.statusCode < 400
                ? "bg-yellow-500/20 text-yellow-400"
                : entry.statusCode >= 200 && entry.statusCode < 300
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            )}>
              {entry.statusCode}
            </div>
            {i < chain.length - 1 && <div className="h-6 w-px bg-slate-700" />}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <p className="truncate text-sm text-slate-300 font-mono" title={entry.url}>
              {entry.url}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CookieTable({ cookies }: { cookies: Array<Record<string, unknown>> }) {
  if (!cookies || cookies.length === 0) return <p className="text-sm text-slate-400">No cookies found</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
            <th className="pb-2 pr-4">Name</th>
            <th className="pb-2 pr-4">Domain</th>
            <th className="pb-2 pr-4">Value</th>
            <th className="pb-2 pr-4">Flags</th>
          </tr>
        </thead>
        <tbody>
          {cookies.map((cookie, i) => (
            <tr key={i} className="border-b border-slate-800">
              <td className="py-2 pr-4 font-mono text-xs text-slate-200">{String(cookie.name || "")}</td>
              <td className="py-2 pr-4 text-xs text-slate-400">{String(cookie.domain || "")}</td>
              <td className="py-2 pr-4 text-xs text-slate-400 max-w-[200px] truncate" title={String(cookie.value || "")}>
                {String(cookie.value || "").slice(0, 40)}{String(cookie.value || "").length > 40 ? "…" : ""}
              </td>
              <td className="py-2 pr-4 text-xs">
                <div className="flex gap-1">
                  {cookie.httpOnly && <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-purple-400">HttpOnly</span>}
                  {cookie.secure && <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-400">Secure</span>}
                  {cookie.sameSite && (
                    <span className="rounded bg-slate-500/20 px-1.5 py-0.5 text-slate-400">
                      {String(cookie.sameSite)}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as Id<"tests">;

  const test = useQuery(api.tests.get, { testId });
  const screenshots = useQuery(api.tests.getScreenshots, { testId });
  const createTest = useMutation(api.tests.create);

  const [screenshotExpanded, setScreenshotExpanded] = useState(false);

  if (test === undefined) {
    return (
      <main className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-slate-800" />
          <div className="h-4 w-96 rounded bg-slate-800" />
        </div>
      </main>
    );
  }

  if (test === null) {
    return (
      <main className="p-6">
        <h2 className="text-xl font-semibold text-slate-200">Test not found</h2>
        <button
          onClick={() => router.push("/dashboard/tests")}
          className="mt-4 text-sm text-blue-400 hover:underline"
        >
          ← Back to tests
        </button>
      </main>
    );
  }

  const report = test.report as Record<string, unknown> | undefined;

  const handleRunAgain = async () => {
    try {
      const result = await createTest({ url: test.url, testType: test.testType });
      router.push(`/dashboard/tests/${result.testId}`);
    } catch (e) {
      console.error("Failed to re-run test:", e);
    }
  };

  return (
    <main className="max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/dashboard/tests")}
            className="mb-2 text-sm text-slate-400 hover:text-slate-200"
          >
            ← All Tests
          </button>
          <h2 className="text-xl font-semibold text-slate-200">Test Results</h2>
          <p className="mt-1 break-all font-mono text-sm text-slate-400">{test.url}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={test.status} />
          <button
            onClick={handleRunAgain}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Run Again
          </button>
        </div>
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-slate-400">Network</p>
          <p className="text-sm font-medium text-slate-200 capitalize">
            {test.networkDetected || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Test Type</p>
          <p className="text-sm font-medium text-slate-200">
            {test.testType === "quick_check" ? "Quick Check" : "CMP Test"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Credits</p>
          <p className="text-sm font-medium text-slate-200">{test.creditsCharged}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Duration</p>
          <p className="text-sm font-medium text-slate-200">
            {report?.timing
              ? `${((report.timing as Record<string, number>).durationMs / 1000).toFixed(1)}s`
              : "—"}
          </p>
        </div>
      </div>

      {/* Error message */}
      {test.errorMessage && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-4">
          <p className="text-sm font-medium text-red-400">Error</p>
          <p className="mt-1 text-sm text-red-300">{test.errorMessage}</p>
        </div>
      )}

      {/* Redirect Chain */}
      {report?.redirectChain && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-200">Redirect Chain</h3>
          <RedirectChain chain={report.redirectChain as Array<{ url: string; statusCode: number }>} />
        </div>
      )}

      {/* Parameter Preservation */}
      {report && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <h3 className="mb-2 text-sm font-medium text-slate-200">Parameter Preservation</h3>
          <p className={cn("text-sm", report.parameterPreservation ? "text-green-400" : "text-red-400")}>
            {report.parameterPreservation ? "✓ Parameters preserved through redirect chain" : "✗ Parameters were lost during redirects"}
          </p>
        </div>
      )}

      {/* Cookies */}
      {report?.cookies && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-200">
            Cookies ({(report.cookies as unknown[]).length})
          </h3>
          <CookieTable cookies={report.cookies as Array<Record<string, unknown>>} />
        </div>
      )}

      {/* Screenshot */}
      {screenshots && screenshots.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-200">Landing Page Screenshot</h3>
            <button
              onClick={() => setScreenshotExpanded(!screenshotExpanded)}
              className="text-xs text-blue-400 hover:underline"
            >
              {screenshotExpanded ? "Collapse" : "Expand"}
            </button>
          </div>
          <div className={cn("mt-3 overflow-hidden rounded border border-slate-700", screenshotExpanded ? "" : "max-h-[400px]")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshots[0].url || ""}
              alt="Landing page screenshot"
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Running state */}
      {(test.status === "queued" || test.status === "running") && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-800/50 bg-blue-900/20 p-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          <p className="text-sm text-blue-300">
            {test.status === "queued" ? "Waiting in queue..." : "Test is running..."}
          </p>
        </div>
      )}
    </main>
  );
}
