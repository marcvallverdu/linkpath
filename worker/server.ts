import express from "express";
import { chromium } from "playwright";

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 8080);

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
    const screenshotBuffer = await page.screenshot({ type: "png", fullPage: true });
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

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/run", async (req, res) => {
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
    const result = await withTimeout(runQuickCheck(url), 60000, "Test timed out after 60 seconds");
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
