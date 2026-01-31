import Link from "next/link";

const FEATURES = [
  {
    title: "Redirect Chain Analysis",
    description: "See every hop your affiliate link takes, with status codes and headers at each step.",
    icon: "🔗",
  },
  {
    title: "Cookie Verification",
    description: "Confirm tracking cookies are set correctly — name, domain, flags, and expiry.",
    icon: "🍪",
  },
  {
    title: "Network Detection",
    description: "Automatically identifies Awin, CJ, Rakuten, Impact, ShareASale, Amazon, and more.",
    icon: "🌐",
  },
  {
    title: "CMP Consent Testing",
    description: "Test how your links behave after cookie consent banners are accepted or rejected.",
    icon: "✅",
  },
  {
    title: "Parameter Preservation",
    description: "Verify that your tracking parameters survive the full redirect chain.",
    icon: "🔍",
  },
  {
    title: "Screenshot Capture",
    description: "Full-page screenshots of landing pages so you can verify what users actually see.",
    icon: "📸",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "",
    credits: "50 credits",
    features: [
      "50 one-time credits",
      "Quick link checks",
      "Redirect chain analysis",
      "Cookie verification",
      "Screenshot capture",
    ],
    cta: "Get Started Free",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    credits: "500 credits/mo",
    features: [
      "500 credits per month",
      "Everything in Free",
      "CMP consent testing",
      "Priority execution",
      "Shareable reports",
      "Email support",
    ],
    cta: "Start Pro Trial",
    href: "/signup",
    highlighted: true,
  },
  {
    name: "Agency",
    price: "$199",
    period: "/mo",
    credits: "2,500 credits/mo",
    features: [
      "2,500 credits per month",
      "Everything in Pro",
      "Team members",
      "API access",
      "Scheduled monitoring",
      "Dedicated support",
    ],
    cta: "Contact Us",
    href: "/signup",
    highlighted: false,
  },
];

const STATS = [
  { value: "10M+", label: "Links tested" },
  { value: "50+", label: "Networks supported" },
  { value: "< 30s", label: "Average test time" },
  { value: "99.9%", label: "Uptime" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Nav */}
      <nav className="border-b border-slate-800/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-sm font-bold uppercase tracking-[0.4em] text-emerald-300">
            LinkPath
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-16 text-center">
        <div className="mb-6 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-xs text-emerald-300">
          Stop losing commission to broken links
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Test your affiliate links
          <br />
          <span className="text-emerald-400">before they cost you money</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          LinkPath tests your affiliate links with real browsers — verifying redirects, cookies,
          consent handling, and tracking parameters. Know exactly what happens when a user clicks.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="rounded-full bg-emerald-400 px-8 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
          >
            Start Testing Free — 50 Credits
          </Link>
          <Link
            href="#features"
            className="rounded-full border border-slate-700 px-8 py-3 text-sm text-slate-300 hover:border-slate-500 transition"
          >
            See How It Works
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-800/50 bg-slate-900/30">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-emerald-400">{stat.value}</p>
              <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Everything you need to QA affiliate links</h2>
          <p className="mt-4 text-lg text-slate-400">
            Powered by real Chromium browsers, not simple HTTP requests.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
            >
              <span className="text-3xl">{feature.icon}</span>
              <h3 className="mt-4 text-lg font-semibold text-slate-100">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-slate-900/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Simple, credit-based pricing</h2>
            <p className="mt-4 text-lg text-slate-400">
              Pay for what you use. No contracts, cancel anytime.
            </p>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 ${
                  plan.highlighted
                    ? "border-emerald-400/50 bg-emerald-500/5"
                    : "border-slate-800 bg-slate-900/40"
                }`}
              >
                {plan.highlighted && (
                  <div className="mb-4 inline-block rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-medium text-emerald-300">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-emerald-400">{plan.credits}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="text-emerald-400">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-8 block rounded-full py-3 text-center text-sm font-semibold transition ${
                    plan.highlighted
                      ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                      : "border border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-12">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} LinkPath. Built for affiliate publishers who care about quality.
        </div>
      </footer>
    </div>
  );
}
