"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { cn } from "@/lib/utils";

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

export default function DashboardPage() {
  const [url, setUrl] = useState("");
  const [testType, setTestType] = useState<
    "quick_check" | "cmp_test"
  >("quick_check");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createTest = useMutation("tests:create");
  const context = useQuery("profiles:getDashboardContext");
  const creditBalance = context?.organization?.creditBalance ?? 0;

  const selected = useMemo(
    () => TEST_OPTIONS.find((option) => option.value === testType),
    [testType],
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
      await createTest({ url, testType });
      setUrl("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create the test. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="space-y-8">
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

        {error ? (
          <p className="mt-3 text-sm text-rose-300">{error}</p>
        ) : null}

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
                    : "border-slate-800 bg-slate-950 hover:border-slate-600",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">
                    {option.label}
                  </span>
                  <span className="text-xs text-emerald-200">
                    {option.credits} credit{option.credits === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {option.description}
                </p>
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
            <span className="text-sm text-slate-400">
              {creditBalance} credits available
            </span>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition",
              canSubmit
                ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                : "cursor-not-allowed bg-slate-800 text-slate-500",
            )}
          >
            {isSubmitting
              ? "Creating..."
              : `Run ${selected?.label ?? "Test"} (${creditsRequired} credit${
                  creditsRequired === 1 ? "" : "s"
                })`}
          </button>
        </div>
      </form>
    </main>
  );
}
