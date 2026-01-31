import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { nanoid } from "nanoid";

// Enable sharing for a test
export const enableShare = mutation({
  args: { testId: v.id("tests") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const test = await ctx.db.get(args.testId);
    if (!test) throw new Error("Test not found");

    // Verify ownership
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile || profile.currentOrgId !== test.orgId) {
      throw new Error("Not authorized");
    }

    if (test.shareId) {
      // Already has a share ID, just enable
      await ctx.db.patch(args.testId, { shareEnabled: true });
      return { shareId: test.shareId };
    }

    const shareId = nanoid(12);
    await ctx.db.patch(args.testId, { shareId, shareEnabled: true });
    return { shareId };
  },
});

export const disableShare = mutation({
  args: { testId: v.id("tests") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const test = await ctx.db.get(args.testId);
    if (!test) throw new Error("Test not found");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile || profile.currentOrgId !== test.orgId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.testId, { shareEnabled: false });
    return { success: true };
  },
});

// Public query - no auth required
export const getSharedTest = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const test = await ctx.db
      .query("tests")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!test || !test.shareEnabled) return null;

    // Get screenshots
    const screenshots = await ctx.db
      .query("screenshots")
      .withIndex("by_test", (q) => q.eq("testId", test._id))
      .collect();

    const screenshotUrls = await Promise.all(
      screenshots.map(async (s) => ({
        step: s.step,
        url: await ctx.storage.getUrl(s.storageId),
      }))
    );

    // Return test without sensitive org data
    return {
      url: test.url,
      testType: test.testType,
      status: test.status,
      networkDetected: test.networkDetected,
      report: test.report,
      errorMessage: test.errorMessage,
      createdAt: test.createdAt,
      completedAt: test.completedAt,
      screenshots: screenshotUrls,
    };
  },
});
