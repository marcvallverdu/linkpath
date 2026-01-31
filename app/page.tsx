import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-slate-100">
      <div className="max-w-xl text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
          LinkPath
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Hello, LinkPath
        </h1>
        <p className="mt-3 text-sm text-slate-300">
          Next.js 15 + Convex + Tailwind v4 + shadcn/ui are ready to ship.
        </p>
      </div>
      <Button className="bg-emerald-400 text-slate-950 hover:bg-emerald-300">
        Shadcn Button
      </Button>
    </main>
  );
}
