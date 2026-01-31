"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "publisher", label: "Publisher", description: "I run content sites with affiliate links" },
  { value: "agency", label: "Agency", description: "I manage affiliate programs for clients" },
  { value: "network", label: "Network", description: "I run or work at an affiliate network" },
  { value: "brand", label: "Brand / Advertiser", description: "I have an affiliate program" },
  { value: "other", label: "Other", description: "Something else entirely" },
];

const EXAMPLE_LINKS = [
  { network: "Amazon", url: "https://amzn.to/example" },
  { network: "Awin", url: "https://www.awin1.com/cread.php?awinmid=1234&awinaffid=5678&ued=https://example.com" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [testUrl, setTestUrl] = useState("");

  const context = useQuery(api.profiles.getDashboardContext);
  const completeOnboarding = useMutation(api.settings.completeOnboarding);
  const createTest = useMutation(api.tests.create);

  // If already onboarded, redirect
  if (context?.profile?.onboardingCompleted) {
    router.push("/dashboard");
    return null;
  }

  const handleRoleSelect = async () => {
    setStep(2);
  };

  const handleRunTest = async () => {
    if (!testUrl.trim()) return;

    try {
      new URL(testUrl);
    } catch {
      return;
    }

    try {
      await completeOnboarding({ role: role || undefined });
      const result = await createTest({ url: testUrl, testType: "quick_check" });
      router.push(`/dashboard/tests/${result.testId}`);
    } catch (e) {
      console.error("Failed to create test:", e);
    }
  };

  const handleSkip = async () => {
    await completeOnboarding({ role: role || undefined });
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="mb-8 flex justify-center gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={cn(
                "h-2 w-2 rounded-full transition",
                s === step ? "bg-emerald-400" : "bg-slate-700"
              )}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-100">Welcome to LinkPath! 🎉</h2>
              <p className="mt-2 text-sm text-slate-400">
                What best describes your role?
              </p>
            </div>

            <div className="space-y-3">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 text-left transition",
                    role === r.value
                      ? "border-emerald-400 bg-emerald-500/10"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
                  )}
                >
                  <p className="text-sm font-medium text-slate-200">{r.label}</p>
                  <p className="text-xs text-slate-400">{r.description}</p>
                </button>
              ))}
            </div>

            <button
              onClick={handleRoleSelect}
              disabled={!role}
              className={cn(
                "w-full rounded-full py-3 text-sm font-semibold transition",
                role
                  ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  : "cursor-not-allowed bg-slate-800 text-slate-500"
              )}
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-100">Run your first test</h2>
              <p className="mt-2 text-sm text-slate-400">
                Paste an affiliate link to see LinkPath in action. You have 50 free credits.
              </p>
            </div>

            <div>
              <input
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="Paste your affiliate link..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-2">Or try one of these examples:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_LINKS.map((link) => (
                  <button
                    key={link.network}
                    onClick={() => setTestUrl(link.url)}
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200"
                  >
                    {link.network} example
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRunTest}
                disabled={!testUrl.trim()}
                className={cn(
                  "flex-1 rounded-full py-3 text-sm font-semibold transition",
                  testUrl.trim()
                    ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                    : "cursor-not-allowed bg-slate-800 text-slate-500"
                )}
              >
                Run Quick Check (1 credit)
              </button>
              <button
                onClick={handleSkip}
                className="rounded-full border border-slate-700 px-6 py-3 text-sm text-slate-400 hover:text-white"
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
