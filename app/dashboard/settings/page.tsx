"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const TX_TYPE_LABELS: Record<string, string> = {
  welcome_bonus: "Welcome Bonus",
  subscription_grant: "Subscription Credits",
  pack_purchase: "Credit Pack",
  test_charge: "Test Charge",
  refund: "Refund",
  manual_adjustment: "Adjustment",
};

const CREDIT_PACKS = [
  { size: "small" as const, credits: 50, price: "$9" },
  { size: "medium" as const, credits: 200, price: "$29" },
  { size: "large" as const, credits: 500, price: "$59" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();

  const context = useQuery(api.profiles.getDashboardContext);
  const creditHistory = useQuery(api.settings.getCreditHistory);
  const updateProfile = useMutation(api.settings.updateProfile);
  const deleteAccount = useMutation(api.settings.deleteAccount);
  const createCheckout = useAction(api.stripe.createCheckoutSession);
  const createCreditPack = useAction(api.stripe.createCreditPackCheckout);

  const [name, setName] = useState("");
  const [nameLoaded, setNameLoaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  // Initialize name from profile
  if (context?.profile?.name && !nameLoaded) {
    setName(context.profile.name);
    setNameLoaded(true);
  }

  const profile = context?.profile;
  const org = context?.organization;

  const handleSaveName = async () => {
    try {
      await updateProfile({ name });
    } catch (e) {
      console.error("Failed to update name:", e);
    }
  };

  const handleUpgrade = async () => {
    try {
      const result = await createCheckout();
      if (result.url) window.location.href = result.url;
    } catch (e) {
      console.error("Failed to create checkout:", e);
    }
  };

  const handleBuyCredits = async (packSize: "small" | "medium" | "large") => {
    try {
      const result = await createCreditPack({ packSize });
      if (result.url) window.location.href = result.url;
    } catch (e) {
      console.error("Failed to create checkout:", e);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== "DELETE") return;
    try {
      await deleteAccount();
      await signOut();
      router.push("/");
    } catch (e) {
      console.error("Failed to delete account:", e);
    }
  };

  return (
    <main className="max-w-3xl space-y-8 p-6">
      <h2 className="text-xl font-semibold text-slate-200">Settings</h2>

      {/* Profile */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-sm font-medium text-slate-200">Profile</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs text-slate-400">Display Name</label>
            <div className="mt-1 flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
              />
              <button
                onClick={handleSaveName}
                className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-300"
              >
                Save
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">Email</label>
            <p className="mt-1 text-sm text-slate-300">{user?.primaryEmailAddress?.emailAddress || profile?.email}</p>
          </div>
        </div>
      </section>

      {/* Plan */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-sm font-medium text-slate-200">Plan & Credits</h3>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300">
              Current plan: <span className="font-semibold capitalize text-emerald-400">{org?.plan || "free"}</span>
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {org?.creditBalance ?? 0} credits remaining
            </p>
          </div>
          {org?.plan === "free" && (
            <button
              onClick={handleUpgrade}
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
            >
              Upgrade to Pro
            </button>
          )}
        </div>

        {/* Credit packs */}
        <div className="mt-6">
          <p className="text-xs font-medium text-slate-400">Buy more credits</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {CREDIT_PACKS.map((pack) => (
              <button
                key={pack.size}
                onClick={() => handleBuyCredits(pack.size)}
                className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-left transition hover:border-slate-500"
              >
                <p className="text-lg font-bold text-slate-100">{pack.credits}</p>
                <p className="text-xs text-slate-400">credits</p>
                <p className="mt-2 text-sm font-semibold text-emerald-400">{pack.price}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Credit History */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-sm font-medium text-slate-200">Credit History</h3>
        {creditHistory && creditHistory.length > 0 ? (
          <div className="mt-4 space-y-2">
            {creditHistory.map((tx) => (
              <div
                key={tx._id}
                className="flex items-center justify-between border-b border-slate-800/50 py-2 last:border-0"
              >
                <div>
                  <p className="text-sm text-slate-300">{TX_TYPE_LABELS[tx.type] || tx.type}</p>
                  {tx.note && <p className="text-xs text-slate-500">{tx.note}</p>}
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-medium", tx.amount > 0 ? "text-green-400" : "text-red-400")}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(tx.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No transactions yet.</p>
        )}
      </section>

      {/* Danger Zone */}
      <section className="rounded-2xl border border-red-900/50 bg-red-900/10 p-6">
        <h3 className="text-sm font-medium text-red-400">Danger Zone</h3>
        <p className="mt-2 text-sm text-slate-400">
          Permanently delete your account and all data. This cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-4 rounded-lg border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-900/30"
          >
            Delete Account
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-red-300">Type DELETE to confirm:</p>
            <input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              className="w-full rounded-lg border border-red-800 bg-slate-950 px-3 py-2 text-sm text-red-300 focus:outline-none"
              placeholder="DELETE"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteText !== "DELETE"}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium",
                  deleteText === "DELETE"
                    ? "bg-red-600 text-white hover:bg-red-500"
                    : "cursor-not-allowed bg-slate-800 text-slate-500"
                )}
              >
                Confirm Delete
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteText(""); }}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
