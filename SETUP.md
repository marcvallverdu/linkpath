# LinkPath — Setup Guide

Get LinkPath running locally in ~10 minutes. You need 3 accounts (Convex, Clerk, Stripe) and 3 terminals.

---

## Step 0: Prerequisites

```bash
node --version   # Need 20+
npm --version    # Comes with Node
```

No Node? → `brew install node` (macOS) or [nodejs.org](https://nodejs.org)

---

## Step 1: Clone and install (2 min)

```bash
git clone https://github.com/marcvallverdu/linkpath.git
cd linkpath
npm run setup    # installs everything: app + worker + Chromium browser
```

This runs `npm install` for both the app and worker, and downloads the Chromium binary for Playwright.

---

## Step 2: Convex — your backend (3 min)

Run this once to create your Convex project:

```bash
npx convex dev
```

First time? It'll open a browser to create your free Convex account and project. Follow the prompts.

When it finishes, it auto-creates `.env.local` with two values:
- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CONVEX_URL`

Hit `Ctrl+C` once you see "Convex functions ready!" — we'll start everything together in step 5.

---

## Step 3: Clerk — authentication (3 min)

### 3a. Create your Clerk app

1. Go to [clerk.com](https://clerk.com) → **Create application**
2. Name it "LinkPath" (or whatever)
3. Under **Sign-in options**, enable:
   - ✅ Google
   - ✅ Email address
4. Click **Create**

### 3b. Copy your keys

From Clerk Dashboard → **API Keys**, copy both values. Add them to your `.env.local`:

```env
# Add these lines to the .env.local that Convex already created:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard/onboarding
```

### 3c. Create a JWT template for Convex

1. Clerk Dashboard → **JWT Templates** (left sidebar)
2. Click **New template** → choose **Convex**
3. It auto-fills everything. Just click **Save**.
4. Note the **Issuer URL** shown at the top (looks like `https://xxxx.clerk.accounts.dev`)

### 3d. Tell Convex about Clerk

In a new terminal (keep `convex dev` running):

```bash
npx convex env set CLERK_ISSUER_URL "https://xxxx.clerk.accounts.dev"
```

Replace with your actual issuer URL from step 3c.

---

## Step 4: Browser Worker config (1 min)

The worker was already installed by `npm run setup` in step 1. Just configure the env vars:

```bash
npx convex env set BROWSER_WORKER_URL "http://localhost:8080"
npx convex env set WORKER_SECRET "change-me-to-something-random"
```

Create `worker/.env` with the same secret:
```bash
cp worker/.env.example worker/.env
```
Then edit `worker/.env` and set `WORKER_SECRET` to the same value you used above.

---

## Step 5: Start everything (30 sec)

One command, one terminal:

```bash
npm run dev
```

This starts **all three services** in parallel with color-coded output:
- 🔵 **next** — Next.js on `localhost:3000`
- 🟣 **convex** — Convex dev server (hot-deploys functions)
- 🟡 **worker** — Playwright worker on `localhost:8080`

Open **[http://localhost:3000](http://localhost:3000)** 🎉

> **Tip:** You can also run them separately if you prefer: `npm run dev:next`, `npm run dev:convex`, `npm run dev:worker`

### What you should see:

1. **Landing page** → click "Get Started Free"
2. **Clerk sign-up** (dark themed) → sign up with Google or email
3. **Onboarding** → pick your role, paste a test link
4. **Dashboard** → your test runs in real-time, results appear with redirect chain, cookies, screenshots

### Quick test to verify everything works:

1. Sign up
2. Paste any affiliate link (e.g. an Amazon associates link)
3. Click "Run Quick Check"
4. Watch the test go from Queued → Running → Success
5. See the redirect chain, detected network, cookies, and screenshot

---

## Step 6: Stripe — payments (optional, skip for dev)

Only needed if you want to test the upgrade/credit purchase flow.

### 6a. Create Stripe products

Go to [dashboard.stripe.com](https://dashboard.stripe.com) → **Product catalog** → create 4 products:

| Product | Type | Price | You need |
|---------|------|-------|----------|
| Pro Plan | Recurring, $49/mo | `price_xxx` | Price ID |
| 50 Credit Pack | One-time, $9 | `price_xxx` | Price ID |
| 200 Credit Pack | One-time, $29 | `price_xxx` | Price ID |
| 500 Credit Pack | One-time, $59 | `price_xxx` | Price ID |

### 6b. Set the env vars

```bash
npx convex env set STRIPE_SECRET_KEY "sk_test_xxxxx"
npx convex env set STRIPE_PRO_PRICE_ID "price_xxxxx"
npx convex env set STRIPE_PACK_SMALL_PRICE_ID "price_xxxxx"
npx convex env set STRIPE_PACK_MEDIUM_PRICE_ID "price_xxxxx"
npx convex env set STRIPE_PACK_LARGE_PRICE_ID "price_xxxxx"
npx convex env set NEXT_PUBLIC_APP_URL "http://localhost:3000"
```

### 6c. Set up the webhook

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**
2. URL: your Convex HTTP endpoint (find it in Convex dashboard under "HTTP Actions"):
   ```
   https://your-deployment.convex.site/stripe-webhook
   ```
3. Events to listen for: `checkout.session.completed`
4. Copy the **signing secret** (starts with `whsec_`):

```bash
npx convex env set STRIPE_WEBHOOK_SECRET "whsec_xxxxx"
```

For local testing, use [Stripe CLI](https://stripe.com/docs/stripe-cli):
```bash
stripe listen --forward-to https://your-deployment.convex.site/stripe-webhook
```

---

## Your `.env.local` should look like this

```env
# Auto-generated by Convex
CONVEX_DEPLOYMENT=dev:your-project-123
NEXT_PUBLIC_CONVEX_URL=https://your-project-123.convex.cloud

# Clerk (from step 3)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard/onboarding
```

That's it for local. Stripe env vars go into Convex (not `.env.local`).

---

## Deploy to production

### 1. Frontend → Vercel (2 min)

```bash
npx vercel
```

Follow the prompts. Then add env vars in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex production URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk **production** key |
| `CLERK_SECRET_KEY` | Your Clerk **production** secret |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/signup` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard/onboarding` |

### 2. Backend → Convex Cloud (1 min)

```bash
npx convex deploy
```

Then set all production env vars:

```bash
npx convex env set CLERK_ISSUER_URL "https://your-prod-clerk.clerk.accounts.dev"
npx convex env set BROWSER_WORKER_URL "https://linkpath-worker.fly.dev"
npx convex env set STRIPE_SECRET_KEY "sk_live_xxxxx"
npx convex env set STRIPE_WEBHOOK_SECRET "whsec_xxxxx"
npx convex env set STRIPE_PRO_PRICE_ID "price_xxxxx"
npx convex env set STRIPE_PACK_SMALL_PRICE_ID "price_xxxxx"
npx convex env set STRIPE_PACK_MEDIUM_PRICE_ID "price_xxxxx"
npx convex env set STRIPE_PACK_LARGE_PRICE_ID "price_xxxxx"
npx convex env set NEXT_PUBLIC_APP_URL "https://your-domain.com"
```

### 3. Worker → Fly.io (3 min)

Vercel can't run Playwright. Fly.io is the easiest:

```bash
cd worker
brew install flyctl                              # or: curl -L https://fly.io/install.sh | sh
fly auth login
fly launch --name linkpath-worker --region lhr   # London region, say yes to defaults
fly deploy
```

Your worker is live at `https://linkpath-worker.fly.dev`. Verify:

```bash
curl https://linkpath-worker.fly.dev/health
# → {"status":"ok","timestamp":"..."}
```

Update Convex to point at it:

```bash
npx convex env set BROWSER_WORKER_URL "https://linkpath-worker.fly.dev"
```

**Fly.io pricing:** Free tier for hobby. ~$5-10/mo for real traffic. Scales to zero when idle.

#### Alternative worker hosts

| Option | Best for | Cost |
|--------|----------|------|
| **Fly.io** ⭐ | Easiest, Docker native, London region | Free → ~$5/mo |
| **Railway** | GitHub auto-deploy | $5/mo min |
| **Render** | Free tier | Free (30s cold starts) |
| **Browserless.io** | Zero infra | $0.01/session |

---

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│    Convex    │────▶│ Playwright      │
│   (Vercel)      │◀────│  (Cloud DB)  │◀────│ Worker (Fly.io) │
└─────────────────┘     └──────────────┘     └─────────────────┘
        │                       │
   ┌────┴────┐            ┌────┴────┐
   │  Clerk  │            │ Stripe  │
   │ (Auth)  │            │(Billing)│
   └─────────┘            └─────────┘
```

**How a test runs:**

1. User pastes URL → clicks "Run Quick Check"
2. Convex deducts credits → creates test record → schedules action
3. Convex action calls Playwright worker via HTTP
4. Worker launches headless Chrome → follows redirects → captures cookies → takes screenshot
5. Worker returns results → Convex stores in DB + file storage
6. Frontend auto-updates in real-time (Convex reactivity) → user sees results

---

## Troubleshooting

**"Not authenticated" errors on every page?**
→ Check that `CLERK_ISSUER_URL` is set in Convex env vars and matches your Clerk JWT template issuer.

**Tests stuck on "Running" forever?**
→ Check the worker is running (`curl http://localhost:8080/health`). The cleanup cron auto-fails stuck tests after 5 minutes.

**Clerk sign-in shows white flash?**
→ Make sure you're on the latest code — auth pages use Clerk's dark theme.

**"Insufficient credits" on first test?**
→ The auto-provisioning gives 50 credits on signup. Check the browser console for errors on the `ensureProfile` mutation.

**Worker crashes on macOS ARM?**
→ Run `npx playwright install chromium` again. Playwright needs the correct binary for your architecture.

**Stripe webhook not firing?**
→ For local dev, use `stripe listen --forward-to`. For prod, check the webhook URL matches your Convex HTTP endpoint exactly.
