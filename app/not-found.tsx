import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="max-w-md text-center">
        <div className="text-6xl font-bold text-slate-800">404</div>
        <h2 className="mt-4 text-xl font-bold text-slate-100">Page not found</h2>
        <p className="mt-2 text-sm text-slate-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
