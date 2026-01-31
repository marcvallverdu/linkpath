"use client";

import { ReactNode, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import {
  CreditCard,
  Gauge,
  Link as LinkIcon,
  Settings,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge },
  { label: "Link Checks", href: "/dashboard/tests", icon: LinkIcon },
  { label: "Monitoring", href: "/dashboard/monitoring", icon: Activity, disabled: true },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const ensureProfile = useMutation("profiles:ensureProfile");
  const hasProvisioned = useRef(false);
  const pathname = usePathname();
  const context = useQuery("profiles:getDashboardContext");

  useEffect(() => {
    if (!isLoaded || !user || hasProvisioned.current) {
      return;
    }

    hasProvisioned.current = true;
    void ensureProfile().catch((error) => {
      console.error("Failed to provision profile", error);
      hasProvisioned.current = false;
    });
  }, [ensureProfile, isLoaded, user]);

  const organization = context?.organization;
  const creditBalance = organization?.creditBalance ?? 0;

  const renderedNav = useMemo(() => {
    return navItems.map((item) => {
      const isActive =
        item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname.startsWith(item.href);
      const Icon = item.icon;

      if (item.disabled) {
        return (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500"
            aria-disabled="true"
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
            <span className="ml-auto rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
              Soon
            </span>
          </div>
        );
      }

      return (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
            isActive
              ? "bg-emerald-500/20 text-emerald-200"
              : "text-slate-300 hover:bg-slate-800 hover:text-white",
          )}
        >
          <Icon className="h-4 w-4" />
          {item.label}
        </Link>
      );
    });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="md:flex">
        <aside className="hidden min-h-screen w-64 flex-col border-r border-slate-800 bg-slate-950/80 px-5 py-6 md:flex">
          <div className="text-xs uppercase tracking-[0.4em] text-emerald-300">
            LinkPath
          </div>
          <div className="mt-6 flex flex-1 flex-col gap-2">{renderedNav}</div>
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
            Monitoring launches soon. We&#39;ll notify you when it&#39;s ready.
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Organization
              </p>
              <h1 className="text-lg font-semibold text-slate-100">
                {organization?.name ?? "Personal"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-200">
                <CreditCard className="h-4 w-4" />
                <span>{creditBalance} credits</span>
              </div>
              <UserButton afterSignOutUrl="/" />
            </div>
          </header>

          <main className="flex-1 px-6 py-6 pb-24 md:pb-6">{children}</main>
        </div>
      </div>

      <nav className="fixed bottom-4 left-1/2 z-20 flex w-[90%] -translate-x-1/2 items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-xs text-slate-200 shadow-xl shadow-black/40 backdrop-blur md:hidden">
        {navItems
          .filter((item) => !item.disabled)
          .map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-1",
                  isActive ? "text-emerald-200" : "text-slate-400",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
      </nav>
    </div>
  );
}
