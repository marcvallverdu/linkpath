"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, Zap } from "lucide-react";

const TEST_OPTIONS = [
  {
    value: "quick_check" as const,
    label: "Quick Link Check",
    description: "Fast redirect + cookie validation.",
    credits: 1,
  },
  {
    value: "cmp_test" as const,
    label: "CMP Consent Test",
    description: "Verify consent banners and tracking after acceptance.",
    credits: 3,
  },
];

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
  queued: { label: "Queued", class: "text-gray-400" },
  running: { label: "Running", class: "text-blue-400 animate-pulse" },
  success: { label: "Success", class: "text-green-400" },
  partial: { label: "Partial", class: "text-yellow-400" },
  failed: { label: "Failed", class: "text-red-400" },
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center gap-3">
        <div className={cn("rounded-lg p-2", color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-100">{value}</p>
          <p className="text-xs text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [testType, setTestType] = useState<"quick_check" | "cmp_test">("quick_check");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createTest = useMutation(api.tests.create);
  const context = useQuery(api.profiles.getDashboardContext);
  const stats = useQuery(api.stats.getDashboardStats);
  const creditBalance = context?.organization?.creditBalance ?? 0;

  const selected = useMemo(
    () => TEST_OPTIONS.find((option) => option.value === testType),
    [testType]
  );

  const creditsRequired = selected?.credits ?? 0;
  const hasCredits = creditBalance >= creditsRequired;
  const canSubmit = url.trim().length > 0 && hasCredits && !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL starting with http or https.");
      return;
    }

    if (!hasCredits) {
      setError("Not enough credits to run this test.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createTest({ url, testType });
      setUrl("");
      router.push(`/dashboard/tests/${result.testId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the test.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="space-y-8">
      {/* Stats row */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Tests"
            value={stats.totalTests}
            icon={Zap}
            color="bg-blue-500/20 text-blue-400"
          />
          <StatCard
            label="Successful"
            value={stats.successCount}
            icon={CheckCircle}
            color="bg-green-500/20 text-green-400"
          />
          <StatCard
            label="Failed"
            value={stats.failedCount}
            icon={XCircle}
            color="bg-red-500/20 text-red-400"
          />
          <StatCard
            label="In Progress"
            value={stats.runningCount}
            icon={Clock}
            color="bg-yellow-500/20 text-yellow-400"
          />
        </div>
      )}

      {/* New test form */}
      <section>
        <h2 className="text-2xl font-semibold">Run a new link check</h2>
        <p className="mt-2 text-sm text-slate-300">
          Paste an affiliate link and choose the test you want to run.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30"
      >
        <label className="text-sm font-medium text-slate-200">
          Affiliate URL
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Paste your affiliate link..."
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          />
        </label>

        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

        <div className="mt-6">
          <p className="text-sm font-medium text-slate-200">Test type</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {TEST_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTestType(option.value)}
                className={cn(
                  "rounded-2xl border px-4 py-4 text-left transition",
                  option.value === testType
                    ? "border-emerald-400 bg-emerald-500/10"
                    : "border-slate-800 bg-slate-950 hover:border-slate-600"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">{option.label}</span>
                  <span className="text-xs text-emerald-200">
                    {option.credits} credit{option.credits === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {!hasCredits ? (
            <span className="text-sm text-amber-300">
              You need {creditsRequired} credits to run this test.
            </span>
          ) : (
            <span className="text-sm text-slate-400">{creditBalance} credits available</span>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition",
              canSubmit
                ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                : "cursor-not-allowed bg-slate-800 text-slate-500"
            )}
          >
            {isSubmitting
              ? "Creating..."
              : `Run ${selected?.label ?? "Test"} (${creditsRequired} credit${creditsRequired === 1 ? "" : "s"})`}
          </button>
        </div>
      </form>

      {/* Recent tests */}
      {stats && stats.recentTests.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-200">Recent Tests</h3>
            <button
              onClick={() => router.push("/dashboard/tests")}
              className="text-sm text-blue-400 hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {stats.recentTests.map((test) => {
              const style = STATUS_STYLES[test.status] || STATUS_STYLES.queued;
              return (
                <button
                  key={test._id}
                  onClick={() => router.push(`/dashboard/tests/${test._id}`)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-left transition hover:bg-slate-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-slate-300">{test.url}</p>
                    <p className="mt-0.5 text-xs text-slate-500 capitalize">
                      {test.networkDetected || test.testType.replace("_", " ")}
                    </p>
                  </div>
                  <span className={cn("ml-3 text-xs font-medium", style.class)}>{style.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
