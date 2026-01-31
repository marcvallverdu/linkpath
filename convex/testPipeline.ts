import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// --- Internal Mutations ---

export const updateTestStatus = internalMutation({
  args: {
    testId: v.id("tests"),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("success"),
      v.literal("partial"),
      v.literal("failed")
    ),
    report: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
    networkDetected: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { testId, ...fields } = args;
    // Remove undefined fields
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }
    await ctx.db.patch(testId, patch);
  },
});

export const refundCredits = internalMutation({
  args: {
    testId: v.id("tests"),
  },
  handler: async (ctx, args) => {
    const test = await ctx.db.get(args.testId);
    if (!test) return;

    const org = await ctx.db.get(test.orgId);
    if (!org) return;

    const newBalance = org.creditBalance + test.creditsCharged;
    await ctx.db.patch(test.orgId, { creditBalance: newBalance });

    await ctx.db.insert("creditTransactions", {
      orgId: test.orgId,
      profileId: test.createdBy,
      amount: test.creditsCharged,
      type: "refund",
      testId: args.testId,
      note: `Refund for failed test`,
      balanceAfter: newBalance,
      createdAt: Date.now(),
    });
  },
});

export const saveScreenshot = internalMutation({
  args: {
    testId: v.id("tests"),
    step: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("screenshots", {
      testId: args.testId,
      step: args.step,
      storageId: args.storageId,
      createdAt: Date.now(),
    });
  },
});

// --- Internal Action ---

export const executeTest = internalAction({
  args: {
    testId: v.id("tests"),
  },
  handler: async (ctx, args) => {
    const { testId } = args;

    // 1. Get the test doc
    const test = await ctx.runQuery(internal.testPipeline.getTest, { testId });
    if (!test) {
      console.error(`Test ${testId} not found`);
      return;
    }

    // 2. Set status to running
    await ctx.runMutation(internal.testPipeline.updateTestStatus, {
      testId,
      status: "running",
    });

    const workerUrl = process.env.BROWSER_WORKER_URL;
    if (!workerUrl) {
      await ctx.runMutation(internal.testPipeline.updateTestStatus, {
        testId,
        status: "failed",
        errorMessage: "BROWSER_WORKER_URL not configured",
        completedAt: Date.now(),
      });
      await ctx.runMutation(internal.testPipeline.refundCredits, { testId });
      return;
    }

    try {
      // 3. Call the browser worker
      const response = await fetch(`${workerUrl}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          url: test.url,
          testType: test.testType,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Worker returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Worker reported failure");
      }

      // 4. Store screenshot if present
      if (result.screenshot) {
        const binaryStr = atob(result.screenshot);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "image/png" });
        const storageId = await ctx.storage.store(blob);
        await ctx.runMutation(internal.testPipeline.saveScreenshot, {
          testId,
          step: "final",
          storageId,
        });
      }

      // 5. Build report (without the base64 screenshot to save space)
      const report = {
        redirectChain: result.redirectChain,
        finalUrl: result.finalUrl,
        cookies: result.cookies,
        networkDetected: result.networkDetected,
        parameterPreservation: result.parameterPreservation,
        timing: result.timing,
      };

      // 6. Update test with success
      await ctx.runMutation(internal.testPipeline.updateTestStatus, {
        testId,
        status: "success",
        report,
        networkDetected: result.networkDetected,
        completedAt: Date.now(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Test ${testId} failed:`, message);

      await ctx.runMutation(internal.testPipeline.updateTestStatus, {
        testId,
        status: "failed",
        errorMessage: message,
        completedAt: Date.now(),
      });
      await ctx.runMutation(internal.testPipeline.refundCredits, { testId });
    }
  },
});

// Helper query to get test data inside the action
import { internalQuery } from "./_generated/server";

export const getTest = internalQuery({
  args: { testId: v.id("tests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.testId);
  },
});
