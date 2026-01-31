# LinkPath — Build Context

This file contains everything you need to build LinkPath. Read this before starting any story.

## What is LinkPath?

AI-powered affiliate link tracking QA platform. Publishers paste affiliate links, we test them with real browsers (Playwright), verify redirects, cookies, CMP consent handling, and report what's broken. Self-serve, credit-based pricing.

**Target users:** Affiliate publishers, content creators, agencies, affiliate networks.
**Competitor:** Moonpull (enterprise-only, legacy tech, no self-serve).

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 15 (App Router) | Server Components by default |
| Styling | Tailwind CSS v4 + shadcn/ui | Use `npx shadcn@latest add <component>` |
| Backend | Convex | DB, auth, real-time, background jobs, file storage |
| Auth | Clerk (@clerk/nextjs) + convex/react-clerk | Google OAuth + email/password |
| Browser Worker | Playwright + Node.js HTTP server | Separate /worker directory |
| Payments | Stripe | Subscriptions + webhooks |
| Error Tracking | Sentry (add later) | Not needed for MVP stories |

### Key Dependencies

```json
{
  "next": "^15",
  "react": "^19",
  "convex": "latest",
  "@auth/core": "latest",
  "tailwindcss": "^4",
  "stripe": "latest",
  "lucide-react": "latest",
  "recharts": "^2",
  "sonner": "latest",
  "zod": "latest"
}
```

### Project Structure

```
linkpath/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Auth group (login, signup)
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (marketing)/              # Public pages (no auth)
│   │   ├── page.tsx              # Landing page
│   │   └── layout.tsx
│   ├── dashboard/                # Authenticated app
│   │   ├── layout.tsx            # Dashboard shell (sidebar + header)
│   │   ├── page.tsx              # Dashboard home
│   │   ├── tests/
│   │   │   ├── page.tsx          # Test history list
│   │   │   └── [id]/page.tsx     # Test detail/results
│   │   └── settings/
│   │       └── page.tsx          # Settings
│   ├── report/
│   │   └── [shareId]/page.tsx    # Public shareable report
│   ├── layout.tsx                # Root layout
│   └── globals.css
├── components/                   # Shared React components
│   ├── ui/                       # shadcn/ui components
│   ├── dashboard/                # Dashboard-specific components
│   ├── test/                     # Test-related components
│   └── marketing/                # Landing page components
├── convex/                       # Convex backend
│   ├── schema.ts                 # Database schema
│   ├── auth.ts                   # Auth config
│   ├── tests.ts                  # Test mutations/queries
│   ├── testRunner.ts             # Test execution actions
│   ├── billing.ts                # Credit & Stripe logic
│   ├── profiles.ts               # Profile queries/mutations
│   ├── organizations.ts          # Org queries/mutations
│   ├── reports.ts                # Shareable report logic
│   ├── http.ts                   # HTTP routes (Stripe webhooks)
│   └── _generated/               # Auto-generated types
├── lib/                          # Shared utilities
│   ├── network-detection.ts      # Affiliate network regex patterns
│   ├── utils.ts                  # General utilities
│   └── stripe.ts                 # Stripe client config
├── worker/                       # Browser automation worker
│   ├── package.json
│   ├── tsconfig.json
│   ├── server.ts                 # HTTP server
│   ├── tests/
│   │   ├── quick-check.ts        # Quick Link Check implementation
│   │   └── cmp-test.ts           # CMP Consent Test implementation
│   ├── lib/
│   │   ├── cmp-detection.ts      # CMP provider detection
│   │   └── cookie-capture.ts     # Cookie extraction
│   └── Dockerfile
├── prd.json                      # Ralph Wiggum user stories
├── progress.txt                  # Build progress log
├── CONTEXT.md                    # This file
├── ralph.sh                      # Ralph loop script
├── package.json
├── tsconfig.json
├── next.config.ts
├── convex.json
└── tailwind.config.ts
```

---

## Convex Schema (MVP Tables)

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Auth tables are managed by @convex-dev/better-auth component (separate from app schema)

export default defineSchema({

  profiles: defineTable({
    userId: v.string(),              // From Convex Auth
    name: v.optional(v.string()),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    currentOrgId: v.id('organizations'),
    role: v.optional(v.string()),    // publisher, creator, agency, network
    onboardingCompleted: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_user_id', ['userId'])
    .index('by_email', ['email']),

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    isPersonal: v.boolean(),
    creditBalance: v.number(),
    plan: v.union(
      v.literal('free'),
      v.literal('pro'),
      v.literal('agency'),
      v.literal('enterprise')
    ),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_stripe_customer', ['stripeCustomerId']),

  orgMembers: defineTable({
    orgId: v.id('organizations'),
    profileId: v.id('profiles'),
    role: v.union(
      v.literal('owner'),
      v.literal('admin'),
      v.literal('member'),
      v.literal('viewer')
    ),
    createdAt: v.number(),
  })
    .index('by_org', ['orgId'])
    .index('by_profile', ['profileId'])
    .index('by_org_and_profile', ['orgId', 'profileId']),

  tests: defineTable({
    orgId: v.id('organizations'),
    createdBy: v.id('profiles'),
    url: v.string(),
    testType: v.union(
      v.literal('quick_check'),
      v.literal('cmp_test')
    ),
    status: v.union(
      v.literal('queued'),
      v.literal('running'),
      v.literal('success'),
      v.literal('partial'),
      v.literal('failed')
    ),
    creditsCharged: v.number(),
    networkDetected: v.optional(v.string()),
    report: v.optional(v.any()),       // Full test results JSON
    errorMessage: v.optional(v.string()),
    shareId: v.optional(v.string()),   // For public sharing
    shareEnabled: v.optional(v.boolean()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_org', ['orgId', 'createdAt'])
    .index('by_org_and_status', ['orgId', 'status'])
    .index('by_share_id', ['shareId'])
    .index('by_created', ['createdAt']),

  screenshots: defineTable({
    testId: v.id('tests'),
    step: v.string(),                  // landing, cmp_before, cmp_after, error
    storageId: v.id('_storage'),       // Convex file storage
    createdAt: v.number(),
  })
    .index('by_test', ['testId']),

  creditTransactions: defineTable({
    orgId: v.id('organizations'),
    profileId: v.optional(v.id('profiles')),
    amount: v.number(),                // Positive = credit, negative = debit
    type: v.union(
      v.literal('welcome_bonus'),
      v.literal('subscription_grant'),
      v.literal('pack_purchase'),
      v.literal('test_charge'),
      v.literal('refund'),
      v.literal('manual_adjustment')
    ),
    testId: v.optional(v.id('tests')),
    stripeSessionId: v.optional(v.string()),
    note: v.optional(v.string()),
    balanceAfter: v.number(),
    createdAt: v.number(),
  })
    .index('by_org', ['orgId', 'createdAt'])
    .index('by_profile', ['profileId', 'createdAt']),
});
```

---

## Auth (Clerk) — Already Set Up

Auth uses Clerk (`@clerk/nextjs`) integrated with Convex via `convex/react-clerk`.

**Files in place:**
- `app/providers.tsx` — ClerkProvider + ConvexProviderWithClerk
- `middleware.ts` — Clerk middleware protecting /dashboard routes
- `app/(auth)/login/[[...login]]/page.tsx` — Clerk SignIn component
- `app/(auth)/signup/[[...signup]]/page.tsx` — Clerk SignUp component

**How to use in React components:**
```typescript
// Get auth state
import { useUser, useAuth } from "@clerk/nextjs";
const { user, isLoaded } = useUser();  // user.id, user.fullName, user.emailAddresses, user.imageUrl
const { isSignedIn } = useAuth();

// Sign out
import { useClerk } from "@clerk/nextjs";
const { signOut } = useClerk();
await signOut();

// UserButton component (avatar + dropdown with sign out)
import { UserButton } from "@clerk/nextjs";
<UserButton afterSignOutUrl="/" />
```

**How to use in Convex functions:**
```typescript
// Get the authenticated user's identity
const identity = await ctx.auth.getUserIdentity();
// identity.subject = Clerk user ID
// identity.email, identity.name, identity.pictureUrl, etc.

// If not authenticated, identity is null
if (!identity) throw new Error("Not authenticated");
```

**Environment variables needed:**
- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `CLERK_SECRET_KEY` — Clerk secret key (server-side)

---

## Network Detection Patterns

```typescript
// lib/network-detection.ts
const NETWORK_PATTERNS: Record<string, RegExp> = {
  awin: /awin1\.com|awltovhc\.com|zenaps\.com/i,
  cj: /(dpbolvw|jdoqocy|tkqlhce|anrdoezrs|kqzyfj)\.(net|com)/i,
  rakuten: /click\.linksynergy\.com|linksynergy\.walmart/i,
  impact: /impact\.com|\.sjv\.io|\.evyy\.net/i,
  shareasale: /shareasale\.com|shrsl\.com/i,
  amazon: /amazon\.[a-z.]+.*[?&]tag=|amzn\.to/i,
};

export function detectNetwork(url: string): string {
  for (const [network, pattern] of Object.entries(NETWORK_PATTERNS)) {
    if (pattern.test(url)) return network;
  }
  return 'unknown';
}
```

---

## CMP Detection Patterns

The browser worker should detect these CMP providers by looking for:

| CMP Provider | Detection Method |
|-------------|-----------------|
| OneTrust | `#onetrust-consent-sdk`, `window.OneTrust`, `onetrust.com` script |
| CookieBot | `#CybotCookiebotDialog`, `window.Cookiebot`, `cookiebot.com` script |
| TrustArc | `.truste_box_overlay`, `window.truste`, `trustarc.com` script |
| Quantcast | `#qc-cmp2-ui`, `window.__tcfapi`, `quantcast.com` script |
| Didomi | `#didomi-popup`, `window.Didomi`, `didomi.io` script |
| Generic | Any element matching common consent banner patterns |

**Accept All button detection:** Look for buttons containing text like "Accept All", "Accept Cookies", "Allow All", "Agree", "I Accept", "OK", "Got it" (case-insensitive, multi-language).

---

## Credit Costs

| Test Type | Credits |
|-----------|---------|
| Quick Link Check | 1 |
| CMP Consent Test | 3 |
| Full Journey (future) | 5 |
| Purchase Verification (future) | 20 |

---

## Subscription Plans (MVP)

| Plan | Price | Monthly Credits | Features |
|------|-------|----------------|----------|
| Free | $0 | 50 (one-time welcome bonus) | All test types, shareable reports |
| Pro | $49/mo | 5,000 | Priority execution, email alerts (future) |

---

## Stripe Configuration

- Use Stripe Checkout for subscription creation
- Use Stripe Customer Portal for subscription management
- Webhook endpoint: Convex HTTP route at /stripe/webhook
- Required webhook events: checkout.session.completed, invoice.payment_succeeded, customer.subscription.updated, customer.subscription.deleted

---

## Browser Worker API

The /worker service exposes a simple HTTP API:

### POST /run

```json
// Request
{
  "testId": "string",
  "url": "string",
  "testType": "quick_check" | "cmp_test"
}

// Response (Quick Link Check)
{
  "success": true,
  "redirectChain": [
    { "url": "string", "statusCode": 200, "headers": {} }
  ],
  "finalUrl": "string",
  "cookies": [
    { "name": "string", "value": "string", "domain": "string", "httpOnly": true, "secure": true, "sameSite": "string" }
  ],
  "networkDetected": "awin",
  "parameterPreservation": {
    "originalParams": { "awinmid": "123", "awinaffid": "456" },
    "finalParams": { "awinmid": "123", "awinaffid": "456" },
    "preserved": true
  },
  "screenshot": "base64string",
  "timing": { "totalMs": 1234, "redirectMs": 500, "pageLoadMs": 734 }
}

// Response (CMP Test) — extends Quick Check
{
  "success": true,
  "redirectChain": [...],
  "finalUrl": "string",
  "cmp": {
    "detected": true,
    "provider": "onetrust",
    "consentAction": "accept_all",
    "cookiesBefore": [...],
    "cookiesAfter": [...],
    "trackingSurvivesConsent": true,
    "affiliateCookiesPresent": true
  },
  "cookies": [...],
  "networkDetected": "awin",
  "screenshotBefore": "base64string",
  "screenshotAfter": "base64string",
  "timing": { "totalMs": 3456 }
}
```

### GET /health

Returns `{ "status": "ok", "timestamp": "..." }`

---

## Design Guidelines

- Use shadcn/ui components consistently
- Color scheme: teal/emerald primary (like the mockup), slate grays for text
- Network icons/colors: Awin (blue), CJ (green), Rakuten (red), Impact (purple), ShareASale (green), Amazon (orange)
- Status badges: success=green, failed=red, running=blue with pulse animation, queued=gray
- Use Lucide icons throughout
- Toast notifications via Sonner
- Responsive design: sidebar collapses to bottom nav on mobile

---

## Full PRD Reference

The complete PRD with all future phases is at:
`/Users/marcvallverdu/clawd/obsidian-vault/01-Projects/uselinkpath/PRD.md`

This MVP covers Phase 1 only. Future phases include:
- Phase 2: Full Journey Test (Claude Computer Use), Multi-browser, Credit packs
- Phase 3: Chrome Extension, Scheduled Monitoring, Teams/Orgs, Agency tier
- Phase 4: Purchase Verification (Lithic), REST API, MCP Server, Enterprise tier
- Phase 5: Network features, Certification badges, CRM integrations
- Phase 6: Mobile/app deep links, Analytics warehouse, Multi-region, SSO
