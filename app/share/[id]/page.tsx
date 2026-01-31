"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import Link from "next/link";

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
  queued: { label: "Queued", class: "bg-gray-500/20 text-gray-400" },
  running: { label: "Running", class: "bg-blue-500/20 text-blue-400" },
  success: { label: "Success", class: "bg-green-500/20 text-green-400" },
  partial: { label: "Partial", class: "bg-yellow-500/20 text-yellow-400" },
  failed: { label: "Failed", class: "bg-red-500/20 text-red-400" },
};

export default function SharedTestPage() {
  const params = useParams();
  const shareId = params.id as string;

  const test = useQuery(api.share.getSharedTest, { shareId });

  if (test === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="animate-pulse text-slate-400">Loading report...</div>
      </div>
    );
  }

  if (test === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-100">Report not found</h2>
          <p className="mt-2 text-sm text-slate-400">
            This report doesn&apos;t exist or sharing has been disabled.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950"
          >
            Try LinkPath
          </Link>
        </div>
      </div>
    );
  }

  const report = test.report as Record<string, unknown> | undefined;
  const style = STATUS_STYLES[test.status] || STATUS_STYLES.queued;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-800/50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-bold uppercase tracking-[0.4em] text-emerald-300">
            LinkPath
          </Link>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
            Shared Report
          </span>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Link Check Report</h1>
            <p className="mt-1 break-all font-mono text-sm text-slate-400">{test.url}</p>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-xs font-medium", style.class)}>
            {style.label}
          </span>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-400">Network</p>
            <p className="text-sm font-medium capitalize">{test.networkDetected || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Type</p>
            <p className="text-sm font-medium">
              {test.testType === "quick_check" ? "Quick Check" : "CMP Test"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Duration</p>
            <p className="text-sm font-medium">
              {report?.timing
                ? `${((report.timing as Record<string, number>).durationMs / 1000).toFixed(1)}s`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Tested</p>
            <p className="text-sm font-medium">
              {new Date(test.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Redirect chain */}
        {report?.redirectChain && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="mb-3 text-sm font-medium">Redirect Chain</h3>
            <div className="space-y-2">
              {(report.redirectChain as Array<{ url: string; statusCode: number }>).map(
                (entry, i, arr) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                          entry.statusCode >= 300 && entry.statusCode < 400
                            ? "bg-yellow-500/20 text-yellow-400"
                            : entry.statusCode >= 200 && entry.statusCode < 300
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        )}
                      >
                        {entry.statusCode}
                      </div>
                      {i < arr.length - 1 && <div className="h-6 w-px bg-slate-700" />}
                    </div>
                    <p className="truncate pt-1 font-mono text-sm text-slate-300" title={entry.url}>
                      {entry.url}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Parameter preservation */}
        {report && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="mb-2 text-sm font-medium">Parameter Preservation</h3>
            <p className={cn("text-sm", report.parameterPreservation ? "text-green-400" : "text-red-400")}>
              {report.parameterPreservation
                ? "✓ Parameters preserved through redirect chain"
                : "✗ Parameters were lost during redirects"}
            </p>
          </div>
        )}

        {/* Cookies */}
        {report?.cookies && (report.cookies as unknown[]).length > 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="mb-3 text-sm font-medium">
              Cookies ({(report.cookies as unknown[]).length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Domain</th>
                    <th className="pb-2">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.cookies as Array<Record<string, unknown>>).map((c, i) => (
                    <tr key={i} className="border-b border-slate-800">
                      <td className="py-2 pr-4 font-mono text-xs">{String(c.name)}</td>
                      <td className="py-2 pr-4 text-xs text-slate-400">{String(c.domain)}</td>
                      <td className="py-2 text-xs">
                        <div className="flex gap-1">
                          {c.httpOnly && <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-purple-400">HttpOnly</span>}
                          {c.secure && <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-400">Secure</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Screenshot */}
        {test.screenshots && test.screenshots.length > 0 && test.screenshots[0].url && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="mb-3 text-sm font-medium">Landing Page</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={test.screenshots[0].url}
              alt="Landing page"
              className="w-full rounded border border-slate-700"
            />
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-6 text-center">
          <p className="text-sm text-slate-300">
            Want to test your own affiliate links?
          </p>
          <Link
            href="/signup"
            className="mt-3 inline-block rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
          >
            Start Free — 50 Credits
          </Link>
        </div>
      </main>
    </div>
  );
}
