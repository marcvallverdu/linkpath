import express from "express";
import { chromium } from "playwright";

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 8080);
const WORKER_SECRET = process.env.WORKER_SECRET || "";

type TestType = "quick_check" | "cmp_test";

type RedirectEntry = {
  url: string;
  statusCode: number;
  headers: Record<string, string>;
};

const networkPatterns: Array<{ name: string; regex: RegExp }> = [
  { name: "awin", regex: /awin1\.com|awltovhc\.com|zenaps\.com/i },
  { name: "cj", regex: /(dpbolvw|jdoqocy|tkqlhce|anrdoezrs|kqzyfj)\.(net|com)/i },
  { name: "rakuten", regex: /click\.linksynergy\.com|linksynergy\.walmart/i },
  { name: "impact", regex: /impact\.com|\.sjv\.io|\.evyy\.net/i },
  { name: "shareasale", regex: /shareasale\.com|shrsl\.com/i },
  { name: "amazon", regex: /amazon\.[a-z.]+.*[?&]tag=|amzn\.to/i }
];

const withTimeout = async <T>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const detectNetwork = (urls: string[]): string => {
  for (const { name, regex } of networkPatterns) {
    if (urls.some((u) => regex.test(u))) {
      return name;
    }
  }
  return "unknown";
};

const checkParameterPreservation = (firstUrl: string, lastUrl: string): boolean => {
  try {
    const firstParams = new URL(firstUrl).searchParams;
    const lastParams = new URL(lastUrl).searchParams;
    for (const [key, value] of firstParams.entries()) {
      if (!lastParams.has(key)) {
        return false;
      }
      if (lastParams.get(key) !== value) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
};

const runQuickCheck = async (url: string) => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.route("**/*", (route) => route.continue());

  const startTime = Date.now();
  try {
    const response = await page.goto(url, { waitUntil: "load", timeout: 60000 });
    if (!response) {
      throw new Error("Navigation failed: no response received");
    }

    const redirectChain: RedirectEntry[] = [];
    let req = response.request();
    while (req) {
      const resp = req.response();
      if (resp) {
        redirectChain.push({
          url: resp.url(),
          statusCode: resp.status(),
          headers: resp.headers()
        });
      }
      req = req.redirectedFrom();
    }
    redirectChain.reverse();

    const cookies = await context.cookies();
    // Use jpeg for smaller size, viewport only (not fullPage) to cap at ~500KB
    const screenshotBuffer = await page.screenshot({ type: "jpeg", quality: 75, fullPage: false });
    const screenshot = screenshotBuffer.toString("base64");

    const finalUrl = response.url();
    const urls = redirectChain.map((entry) => entry.url);
    if (urls.length === 0) {
      urls.push(finalUrl);
    }

    const networkDetected = detectNetwork(urls);
    const parameterPreservation = checkParameterPreservation(urls[0], finalUrl);
    const endTime = Date.now();

    return {
      success: true,
      redirectChain,
      finalUrl,
      cookies,
      networkDetected,
      parameterPreservation,
      screenshot,
      timing: {
        startTime,
        endTime,
        durationMs: endTime - startTime
      }
    };
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
};

const runCmpTest = async (url: string) => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.route("**/*", (route) => route.continue());

  const startTime = Date.now();
  try {
    // Step 1: Navigate without accepting cookies
    const response = await page.goto(url, { waitUntil: "load", timeout: 60000 });
    if (!response) {
      throw new Error("Navigation failed: no response received");
    }

    // Capture redirect chain (same as quick_check)
    const redirectChain: RedirectEntry[] = [];
    let req = response.request();
    while (req) {
      const resp = req.response();
      if (resp) {
        redirectChain.push({
          url: resp.url(),
          statusCode: resp.status(),
          headers: resp.headers()
        });
      }
      req = req.redirectedFrom();
    }
    redirectChain.reverse();

    const finalUrl = response.url();
    const urls = redirectChain.map((entry) => entry.url);
    if (urls.length === 0) urls.push(finalUrl);
    const networkDetected = detectNetwork(urls);
    const parameterPreservation = checkParameterPreservation(urls[0], finalUrl);

    // Step 2: Detect CMP/cookie consent banner
    const cmpSelectors = [
      // Common CMP frameworks
      '#onetrust-banner-sdk',
      '#CybotCookiebotDialog',
      '.cmp-container',
      '[id*="cookie-banner"]',
      '[id*="cookie-consent"]',
      '[id*="cookie-notice"]',
      '[class*="cookie-banner"]',
      '[class*="cookie-consent"]',
      '[class*="consent-banner"]',
      '[id*="gdpr"]',
      '[class*="gdpr"]',
      '#usercentrics-root',
      '.fc-consent-root',
      '#sp_message_container',
      '[aria-label*="cookie"]',
      '[aria-label*="consent"]',
    ];

    let cmpDetected = false;
    let cmpSelector = '';
    for (const selector of cmpSelectors) {
      const el = await page.$(selector);
      if (el && await el.isVisible().catch(() => false)) {
        cmpDetected = true;
        cmpSelector = selector;
        break;
      }
    }

    // Step 3: Get cookies BEFORE accepting consent
    const cookiesBeforeConsent = await context.cookies();
    const screenshotBefore = (await page.screenshot({ type: "png", fullPage: false })).toString("base64");

    // Step 4: Try to accept cookies
    let consentAccepted = false;
    if (cmpDetected) {
      const acceptSelectors = [
        '#onetrust-accept-btn-handler',
        '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
        '#CybotCookiebotDialogBodyButtonAccept',
        'button[id*="accept"]',
        'button[class*="accept"]',
        'button[aria-label*="accept"]',
        'button[aria-label*="Accept"]',
        'button[aria-label*="Allow"]',
        'button:has-text("Accept")',
        'button:has-text("Accept All")',
        'button:has-text("Accept all")',
        'button:has-text("I agree")',
        'button:has-text("Agree")',
        'button:has-text("Allow all")',
        'button:has-text("OK")',
        'a:has-text("Accept")',
      ];

      for (const sel of acceptSelectors) {
        try {
          const btn = await page.$(sel);
          if (btn && await btn.isVisible().catch(() => false)) {
            await btn.click();
            consentAccepted = true;
            // Wait for consent to process
            await page.waitForTimeout(2000);
            break;
          }
        } catch {
          // selector didn't match, continue
        }
      }
    }

    // Step 5: Get cookies AFTER accepting consent
    const cookiesAfterConsent = await context.cookies();
    const screenshotAfter = (await page.screenshot({ type: "png", fullPage: false })).toString("base64");

    // Step 6: Compare cookies before/after
    const cookiesBefore = new Set(cookiesBeforeConsent.map(c => c.name));
    const newCookies = cookiesAfterConsent.filter(c => !cookiesBefore.has(c.name));

    const endTime = Date.now();

    return {
      success: true,
      redirectChain,
      finalUrl,
      cookies: cookiesAfterConsent,
      networkDetected,
      parameterPreservation,
      screenshot: screenshotAfter,
      timing: { startTime, endTime, durationMs: endTime - startTime },
      cmpResult: {
        cmpDetected,
        cmpSelector: cmpSelector || null,
        consentAccepted,
        cookiesBeforeConsent: cookiesBeforeConsent.length,
        cookiesAfterConsent: cookiesAfterConsent.length,
        newCookiesAfterConsent: newCookies.map(c => ({
          name: c.name,
          domain: c.domain,
          httpOnly: c.httpOnly,
          secure: c.secure,
        })),
        screenshotBeforeConsent: screenshotBefore,
      }
    };
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
};

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/run", async (req, res) => {
  // Verify shared secret if configured
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
    return res.status(400).json({ success: false, error: "testId, url, and testType are required" });
  }

  if (testType !== "quick_check" && testType !== "cmp_test") {
    return res.status(400).json({ success: false, error: "Unsupported testType" });
  }

  try {
    const runner = testType === "cmp_test" ? runCmpTest : runQuickCheck;
    const result = await withTimeout(runner(url), 60000, "Test timed out after 60 seconds");
    return res.json({ testId, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, error: message });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Worker listening on port ${PORT}`);
});
