# LinkPath — Setup Guide

## Prerequisites

- Node.js 20+
- npm
- A [Convex](https://convex.dev) account
- A [Clerk](https://clerk.com) account
- A [Stripe](https://stripe.com) account (for payments, optional for dev)

---

## 1. Clone & Install

```bash
git clone https://github.com/marcvallverdu/linkpath.git
cd linkpath
npm install
```

## 2. Convex Setup

```bash
npx convex dev
```

This will:
- Prompt you to log in / create a Convex project
- Deploy the schema and functions
- Create a `.env.local` with `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`

Leave `convex dev` running in a terminal — it hot-reloads.

## 3. Clerk Setup

1. Go to [clerk.com](https://clerk.com) → Create application
2. Enable **Google OAuth** and **Email/Password** sign-in methods
3. Copy your keys and add to `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard/onboarding
```

4. In Clerk Dashboard → JWT Templates → Create a Convex template:
   - Name: `convex`
   - Issuer: your Clerk issuer URL (from API Keys page)

5. Add the Clerk issuer to Convex environment variables:
   ```bash
   npx convex env set CLERK_ISSUER_URL https://your-clerk-instance.clerk.accounts.dev
   ```

## 4. Browser Worker Setup

The Playwright worker runs as a separate service:

```bash
cd worker
npm install
npx playwright install chromium
npm run dev   # starts on port 8080
```

Then tell Convex where to find it:
```bash
npx convex env set BROWSER_WORKER_URL http://localhost:8080
```

### Docker (Production)

```bash
cd worker
docker build -t linkpath-worker .
docker run -p 8080:8080 linkpath-worker
```

## 5. Stripe Setup (Optional)

For payments to work:

1. Create products in Stripe Dashboard:
   - **Pro Plan**: $49/mo subscription → copy Price ID
   - **Credit Pack Small**: $9 one-time → copy Price ID
   - **Credit Pack Medium**: $29 one-time → copy Price ID
   - **Credit Pack Large**: $59 one-time → copy Price ID

2. Add to Convex env vars:
   ```bash
   npx convex env set STRIPE_SECRET_KEY sk_test_...
   npx convex env set STRIPE_PRO_PRICE_ID price_...
   npx convex env set STRIPE_PACK_SMALL_PRICE_ID price_...
   npx convex env set STRIPE_PACK_MEDIUM_PRICE_ID price_...
   npx convex env set STRIPE_PACK_LARGE_PRICE_ID price_...
   ```

3. Set up a webhook in Stripe → Developers → Webhooks:
   - URL: `https://your-convex-deployment.convex.site/stripe-webhook`
   - Events: `checkout.session.completed`
   - Copy the webhook secret:
   ```bash
   npx convex env set STRIPE_WEBHOOK_SECRET whsec_...
   ```

4. Add the app URL for redirects:
   ```bash
   npx convex env set NEXT_PUBLIC_APP_URL http://localhost:3000
   ```

## 6. Run the App

Terminal 1 — Convex:
```bash
npx convex dev
```

Terminal 2 — Worker:
```bash
cd worker && npm run dev
```

Terminal 3 — Next.js:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## Environment Variables Summary

### `.env.local` (Next.js — auto-created by Convex)

| Variable | Source |
|----------|--------|
| `CONVEX_DEPLOYMENT` | `npx convex dev` |
| `NEXT_PUBLIC_CONVEX_URL` | `npx convex dev` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard |
| `CLERK_SECRET_KEY` | Clerk Dashboard |

### Convex Environment Variables (`npx convex env set`)

| Variable | Source |
|----------|--------|
| `CLERK_ISSUER_URL` | Clerk Dashboard → API Keys |
| `BROWSER_WORKER_URL` | Your worker URL |
| `STRIPE_SECRET_KEY` | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhooks |
| `STRIPE_PRO_PRICE_ID` | Stripe Products |
| `STRIPE_PACK_SMALL_PRICE_ID` | Stripe Products |
| `STRIPE_PACK_MEDIUM_PRICE_ID` | Stripe Products |
| `STRIPE_PACK_LARGE_PRICE_ID` | Stripe Products |
| `NEXT_PUBLIC_APP_URL` | Your app domain |

---

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│    Convex    │────▶│ Playwright      │
│   (Frontend)    │◀────│   (Backend)   │◀────│ Worker (HTTP)   │
└─────────────────┘     └──────────────┘     └─────────────────┘
        │                       │
        │                       │
   ┌────┴────┐            ┌────┴────┐
   │  Clerk  │            │ Stripe  │
   │ (Auth)  │            │(Billing)│
   └─────────┘            └─────────┘
```

1. User submits URL → Convex creates test + deducts credits + schedules action
2. Convex action calls Playwright worker → follows redirects, captures cookies, screenshots
3. Results stored in Convex → real-time updates push to frontend
4. User sees redirect chain, cookies, network detection, screenshot
