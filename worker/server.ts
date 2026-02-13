import express from "express";
import { chromium, Browser, BrowserContext, Page, Request, Response } from "playwright";

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 8080);
const WORKER_SECRET = process.env.WORKER_SECRET || "";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TestType = "quick_check" | "cmp_test";

interface NavigationHop {
  url: string;
  statusCode: number | null;
  type: "http_redirect" | "js_redirect" | "meta_redirect" | "initial";
  server?: string;
  location?: string;
  setCookie?: string;
  timestamp: number;
}

interface CookieInfo {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
  expires: number;
}

interface NetworkMatch {
  network: string;
  matchedUrl: string;
}

interface ParameterAnalysis {
  originalParams: Record<string, string>;
  finalParams: Record<string, string>;
  preserved: string[];
  lost: string[];
  added: string[];
  allPreserved: boolean;
}

interface QuickCheckResult {
  success: true;
  redirectChain: NavigationHop[];
  finalUrl: string;
  cookies: CookieInfo[];
  networkDetected: NetworkMatch[];
  parameterAnalysis: ParameterAnalysis;
  screenshot: string;
  timing: { totalMs: number };
  warnings: string[];
}

interface CmpResult extends QuickCheckResult {
  cmp: {
    detected: boolean;
    provider: string | null;
    selector: string | null;
    consentAccepted: boolean;
    cookiesBefore: number;
    cookiesAfter: number;
    newCookiesAfterConsent: Array<{ name: string; domain: string }>;
    trackingCookieSurvived: boolean;
    screenshotBeforeConsent: string;
  };
}

// ---------------------------------------------------------------------------
// Network detection — expanded for real-world coverage
// ---------------------------------------------------------------------------

const NETWORK_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "awin", regex: /awin1\.com|awltovhc\.com|zenaps\.com|awin\.com/i },
  { name: "cj", regex: /(dpbolvw|jdoqocy|tkqlhce|anrdoezrs|kqzyfj)\.(net|com)|commission-junction/i },
  { name: "rakuten", regex: /click\.linksynergy\.com|linksynergy\.walmart|rakutenadvertising/i },
  { name: "impact", regex: /impact\.com|\.sjv\.io|\.evyy\.net|goto\.target\.com/i },
  { name: "shareasale", regex: /shareasale\.com|shrsl\.com/i },
  { name: "amazon", regex: /amazon\.[a-z.]+.*[?&]tag=|amzn\.to/i },
  { name: "tradedoubler", regex: /tradedoubler\.com|clkuk\.tradedoubler/i },
  { name: "partnerize", regex: /partnerize\.com|prf\.hn/i },
  { name: "webgains", regex: /webgains\.com|track\.webgains/i },
  { name: "admitad", regex: /admitad\.com|ad\.admitad/i },
  { name: "skimlinks", regex: /go\.skimresources\.com|go\.redirectingat\.com/i },
  { name: "sovrn", regex: /sovrn\.co|redirect\.viglink\.com/i },
  { name: "flexoffers", regex: /flexoffers\.com|track\.flexlinkspro/i },
  { name: "pepperjam", regex: /pepperjam\.com|gopjn\.com/i },
  { name: "hasoffers", regex: /hasoffers\.com|go2cloud\.org/i },
  { name: "tune", regex: /tune\.com|hastrk[0-9]*\.com/i },
  { name: "clickbank", regex: /clickbank\.net|hop\.clickbank/i },
  { name: "avangate", regex: /avangate\.com|2checkout/i },
  { name: "tradetracker", regex: /tradetracker\.(com|net)/i },
  { name: "daisycon", regex: /daisycon\.io|ds1\.nl/i },
  { name: "effiliation", regex: /effiliation\.com/i },
  { name: "zanox", regex: /zanox\.com|ad\.zanox/i },
];

function detectNetworks(urls: string[]): NetworkMatch[] {
  const matches: NetworkMatch[] = [];
  const seen = new Set<string>();
  for (const url of urls) {
    for (const { name, regex } of NETWORK_PATTERNS) {
      if (!seen.has(name) && regex.test(url)) {
        matches.push({ network: name, matchedUrl: url });
        seen.add(name);
      }
    }
  }
  return matches;
}

// ---------------------------------------------------------------------------
// Parameter analysis
// ---------------------------------------------------------------------------

function analyzeParameters(firstUrl: string, lastUrl: string): ParameterAnalysis {
  const result: ParameterAnalysis = {
    originalParams: {},
    finalParams: {},
    preserved: [],
    lost: [],
    added: [],
    allPreserved: true,
  };
  try {
    const first = new URL(firstUrl);
    const last = new URL(lastUrl);
    for (const [k, v] of first.searchParams.entries()) result.originalParams[k] = v;
    for (const [k, v] of last.searchParams.entries()) result.finalParams[k] = v;

    for (const key of Object.keys(result.originalParams)) {
      if (key in result.finalParams) {
        result.preserved.push(key);
      } else {
        result.lost.push(key);
        result.allPreserved = false;
      }
    }
    for (const key of Object.keys(result.finalParams)) {
      if (!(key in result.originalParams)) {
        result.added.push(key);
      }
    }
  } catch {
    // malformed URL
  }
  return result;
}

// ---------------------------------------------------------------------------
// Browser pool — reuse a single browser instance
// ---------------------------------------------------------------------------

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  });
  return _browser;
}

// ---------------------------------------------------------------------------
// Stealth helpers
// ---------------------------------------------------------------------------

async function applyStealthScripts(page: Page) {
  await page.addInitScript(() => {
    // Hide webdriver flag
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    // Fake plugins
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5] as unknown as PluginArray,
    });
    // Fake languages
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-GB", "en-US", "en"],
    });
    // Chrome runtime
    (window as unknown as Record<string, unknown>).chrome = { runtime: {} };
  });
}

// ---------------------------------------------------------------------------
// Core: trace a full redirect chain (HTTP + JS + meta)
// ---------------------------------------------------------------------------

async function traceRedirectChain(
  url: string,
  options: { acceptCookies?: boolean; timeout?: number } = {}
): Promise<{
  chain: NavigationHop[];
  finalUrl: string;
  cookies: CookieInfo[];
  screenshot: string;
  timing: { totalMs: number };
  warnings: string[];
  page: Page;
  context: BrowserContext;
}> {
  const { timeout = 30000 } = options;
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    locale: "en-GB",
    timezoneId: "Europe/London",
  });

  const page = await context.newPage();
  await applyStealthScripts(page);

  const chain: NavigationHop[] = [];
  const warnings: string[] = [];
  let lastUrl = url;
  const startTime = Date.now();

  // Track every frame navigation (catches JS redirects + meta refreshes)
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      const navUrl = frame.url();
      if (navUrl && navUrl !== "about:blank" && navUrl !== lastUrl) {
        // Check if this was already captured as an HTTP redirect
        const alreadyCaptured = chain.some(
          (h) => h.url === navUrl && Date.now() - h.timestamp < 500
        );
        if (!alreadyCaptured) {
          chain.push({
            url: navUrl,
            statusCode: null,
            type: "js_redirect",
            timestamp: Date.now(),
          });
        }
        lastUrl = navUrl;
      }
    }
  });

  // Track HTTP-level redirects
  const responseHandler = (response: Response) => {
    const reqUrl = response.url();
    const status = response.status();
    const headers = response.headers();

    // Only track main-frame navigations, not subresources
    if (response.request().resourceType() === "document") {
      chain.push({
        url: reqUrl,
        statusCode: status,
        type: status >= 300 && status < 400 ? "http_redirect" : "initial",
        server: headers["server"],
        location: headers["location"],
        setCookie: headers["set-cookie"],
        timestamp: Date.now(),
      });
      lastUrl = reqUrl;
    }
  };
  page.on("response", responseHandler);

  try {
    // Navigate — use domcontentloaded (networkidle hangs on heavy sites like Amazon)
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout,
    });

    if (!response) {
      warnings.push("No response received from initial navigation");
    }

    // Wait for URL to stabilize (catches JS redirects that fire after DOMContentLoaded)
    await waitForUrlStability(page, 5000, 1500);

    // If no chain entries, add the final URL
    if (chain.length === 0) {
      chain.push({
        url: page.url(),
        statusCode: response?.status() ?? null,
        type: "initial",
        timestamp: Date.now(),
      });
    }

    const finalUrl = page.url();
    const cookies = (await context.cookies()).map((c) => ({
      name: c.name,
      value: c.value.slice(0, 200),
      domain: c.domain,
      path: c.path,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite,
      expires: c.expires,
    }));

    const screenshotBuffer = await page.screenshot({
      type: "jpeg",
      quality: 75,
      fullPage: false,
    });

    const totalMs = Date.now() - startTime;

    // Deduplicate chain — same URL within 200ms = same hop
    const deduped = deduplicateChain(chain);

    return {
      chain: deduped,
      finalUrl,
      cookies,
      screenshot: screenshotBuffer.toString("base64"),
      timing: { totalMs },
      warnings,
      page,
      context,
    };
  } catch (error) {
    // Cleanup on error
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    throw error;
  }
}

// Wait until the URL hasn't changed for `stableMs`
async function waitForUrlStability(page: Page, maxWaitMs: number, stableMs = 1000) {
  const start = Date.now();
  let lastUrl = page.url();
  let lastChange = Date.now();

  while (Date.now() - start < maxWaitMs) {
    await page.waitForTimeout(200);
    const currentUrl = page.url();
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      lastChange = Date.now();
    }
    if (Date.now() - lastChange >= stableMs) {
      return; // URL has been stable
    }
  }
}

function deduplicateChain(chain: NavigationHop[]): NavigationHop[] {
  if (chain.length <= 1) return chain;
  const result: NavigationHop[] = [chain[0]];
  for (let i = 1; i < chain.length; i++) {
    const prev = result[result.length - 1];
    const curr = chain[i];
    // Same URL within 500ms = duplicate
    if (curr.url === prev.url && curr.timestamp - prev.timestamp < 500) {
      // Keep the one with more info (HTTP > JS)
      if (curr.statusCode && !prev.statusCode) {
        result[result.length - 1] = curr;
      }
      continue;
    }
    result.push(curr);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Quick check
// ---------------------------------------------------------------------------

async function runQuickCheck(url: string): Promise<QuickCheckResult> {
  const { chain, finalUrl, cookies, screenshot, timing, warnings, page, context } =
    await traceRedirectChain(url);

  // Cleanup
  await page.close().catch(() => {});
  await context.close().catch(() => {});

  const allUrls = chain.map((h) => h.url);
  allUrls.push(finalUrl);

  return {
    success: true,
    redirectChain: chain,
    finalUrl,
    cookies,
    networkDetected: detectNetworks(allUrls),
    parameterAnalysis: analyzeParameters(url, finalUrl),
    screenshot,
    timing,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// CMP test
// ---------------------------------------------------------------------------

const CMP_PROVIDERS: Array<{
  name: string;
  selectors: string[];
  acceptSelectors: string[];
}> = [
  {
    name: "onetrust",
    selectors: ["#onetrust-banner-sdk", "#onetrust-consent-sdk"],
    acceptSelectors: [
      "#onetrust-accept-btn-handler",
      'button[aria-label="Accept All Cookies"]',
    ],
  },
  {
    name: "cookiebot",
    selectors: ["#CybotCookiebotDialog"],
    acceptSelectors: [
      "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
      "#CybotCookiebotDialogBodyButtonAccept",
    ],
  },
  {
    name: "usercentrics",
    selectors: ["#usercentrics-root"],
    acceptSelectors: ['button[data-testid="uc-accept-all-button"]'],
  },
  {
    name: "quantcast",
    selectors: ["#qc-cmp2-ui", ".qc-cmp2-summary-buttons"],
    acceptSelectors: [
      'button[mode="primary"]',
      ".qc-cmp2-summary-buttons button:first-child",
    ],
  },
  {
    name: "didomi",
    selectors: ["#didomi-popup", "#didomi-notice"],
    acceptSelectors: ["#didomi-notice-agree-button"],
  },
  {
    name: "trustarc",
    selectors: [".truste_box_overlay", "#truste-consent-track"],
    acceptSelectors: [".pdynamicbutton .call", "#truste-consent-button"],
  },
  {
    name: "sourcepoint",
    selectors: ["#sp_message_container"],
    acceptSelectors: [], // iframe-based, needs special handling
  },
];

// Generic "accept all" button patterns as fallback
const GENERIC_ACCEPT_TEXTS = [
  "Accept All",
  "Accept all",
  "Accept Cookies",
  "Accept cookies",
  "Allow All",
  "Allow all",
  "I Accept",
  "I agree",
  "Agree",
  "Got it",
  "OK",
  "Alles akzeptieren",
  "Alle akzeptieren",
  "Tout accepter",
  "Aceptar todo",
  "Aceitar tudo",
];

async function runCmpTest(url: string): Promise<CmpResult> {
  const { chain, finalUrl, cookies: cookiesInitial, screenshot, timing, warnings, page, context } =
    await traceRedirectChain(url);

  const allUrls = chain.map((h) => h.url);
  allUrls.push(finalUrl);

  try {
    // Detect CMP provider
    let detectedProvider: string | null = null;
    let detectedSelector: string | null = null;
    let acceptSelector: string | null = null;

    for (const provider of CMP_PROVIDERS) {
      for (const sel of provider.selectors) {
        const el = await page.$(sel);
        if (el && (await el.isVisible().catch(() => false))) {
          detectedProvider = provider.name;
          detectedSelector = sel;
          // Find accept button
          for (const accSel of provider.acceptSelectors) {
            const btn = await page.$(accSel);
            if (btn && (await btn.isVisible().catch(() => false))) {
              acceptSelector = accSel;
              break;
            }
          }
          break;
        }
      }
      if (detectedProvider) break;
    }

    // Fallback: try generic accept button text
    if (!detectedProvider) {
      // Check for any visible cookie-ish banner
      const genericSelectors = [
        '[id*="cookie"]',
        '[class*="cookie"]',
        '[id*="consent"]',
        '[class*="consent"]',
        '[id*="gdpr"]',
        '[class*="gdpr"]',
      ];
      for (const sel of genericSelectors) {
        const el = await page.$(sel);
        if (el && (await el.isVisible().catch(() => false))) {
          detectedProvider = "generic";
          detectedSelector = sel;
          break;
        }
      }
    }

    if (!acceptSelector && detectedProvider) {
      // Try generic text-based accept buttons
      for (const text of GENERIC_ACCEPT_TEXTS) {
        try {
          const btn = page.getByRole("button", { name: text, exact: false });
          if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
            acceptSelector = `button:text("${text}")`;
            break;
          }
        } catch {
          // continue
        }
      }
    }

    // Cookies before consent
    const cookiesBefore = await context.cookies();
    const screenshotBefore = (
      await page.screenshot({ type: "jpeg", quality: 75, fullPage: false })
    ).toString("base64");

    // Accept consent
    let consentAccepted = false;
    if (acceptSelector) {
      try {
        if (acceptSelector.startsWith('button:text("')) {
          const text = acceptSelector.match(/button:text\("(.+?)"\)/)?.[1] || "";
          await page.getByRole("button", { name: text, exact: false }).click();
        } else {
          await page.click(acceptSelector);
        }
        consentAccepted = true;
        await page.waitForTimeout(2000);
      } catch (e) {
        warnings.push(`Failed to click accept button: ${e}`);
      }
    }

    // Cookies after consent
    const cookiesAfter = await context.cookies();
    const beforeNames = new Set(cookiesBefore.map((c) => c.name));
    const newCookies = cookiesAfter.filter((c) => !beforeNames.has(c.name));

    // Check if any affiliate/tracking cookies survived
    const affiliateKeywords = [
      "awin",
      "aw",
      "zanpid",
      "cje",
      "irclickid",
      "sas_",
      "tduid",
      "partnerize",
      "impact",
    ];
    const trackingCookieSurvived = cookiesAfter.some((c) =>
      affiliateKeywords.some((kw) => c.name.toLowerCase().includes(kw))
    );

    const screenshotAfter = (
      await page.screenshot({ type: "jpeg", quality: 75, fullPage: false })
    ).toString("base64");

    return {
      success: true,
      redirectChain: chain,
      finalUrl,
      cookies: cookiesAfter.map((c) => ({
        name: c.name,
        value: c.value.slice(0, 200),
        domain: c.domain,
        path: c.path,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
        expires: c.expires,
      })),
      networkDetected: detectNetworks(allUrls),
      parameterAnalysis: analyzeParameters(url, finalUrl),
      screenshot: screenshotAfter,
      timing,
      warnings,
      cmp: {
        detected: !!detectedProvider,
        provider: detectedProvider,
        selector: detectedSelector,
        consentAccepted,
        cookiesBefore: cookiesBefore.length,
        cookiesAfter: cookiesAfter.length,
        newCookiesAfterConsent: newCookies.map((c) => ({
          name: c.name,
          domain: c.domain,
        })),
        trackingCookieSurvived,
        screenshotBeforeConsent: screenshotBefore,
      },
    };
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Retry wrapper
// ---------------------------------------------------------------------------

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// HTTP API
// ---------------------------------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    browserConnected: _browser?.isConnected() ?? false,
    timestamp: new Date().toISOString(),
  });
});

// Simple test endpoint — no auth needed, no Convex dependency
app.post("/test", async (req, res) => {
  const { url, testType = "quick_check" } = req.body as {
    url?: string;
    testType?: TestType;
  };

  if (!url) {
    return res.status(400).json({ success: false, error: "url is required" });
  }

  try {
    const runner = testType === "cmp_test" ? runCmpTest : runQuickCheck;
    const result = await withRetry(() => runner(url), 1);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, error: message });
  }
});

// Legacy endpoint for Convex pipeline compatibility
app.post("/run", async (req, res) => {
  if (WORKER_SECRET) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${WORKER_SECRET}`) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
  }

  const { testId, url, testType } = req.body as {
    testId?: string;
    url?: string;
    testType?: TestType;
  };

  if (!testId || !url || !testType) {
    return res.status(400).json({ success: false, error: "testId, url, and testType required" });
  }

  try {
    const runner = testType === "cmp_test" ? runCmpTest : runQuickCheck;
    const result = await withRetry(() => runner(url), 1);
    return res.json({ testId, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, error: message });
  }
});

app.listen(PORT, () => {
  console.log(`LinkPath worker listening on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  if (_browser) await _browser.close().catch(() => {});
  process.exit(0);
});
