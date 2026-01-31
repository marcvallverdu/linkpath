import { mutation, query } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const create = mutation({
  args: {
    url: v.string(),
    testType: v.union(v.literal("quick_check"), v.literal("cmp_test")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    try {
      new URL(args.url);
    } catch {
      throw new Error("Invalid URL");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const organization = await ctx.db.get(profile.currentOrgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const creditsCharged = args.testType === "quick_check" ? 1 : 3;
    if (organization.creditBalance < creditsCharged) {
      throw new Error("Insufficient credits");
    }

    const now = Date.now();
    const testId = await ctx.db.insert("tests", {
      orgId: profile.currentOrgId,
      createdBy: profile._id,
      url: args.url,
      testType: args.testType,
      status: "queued",
      creditsCharged,
      createdAt: now,
    });

    // Deduct credits
    await ctx.db.patch(profile.currentOrgId, {
      creditBalance: organization.creditBalance - creditsCharged,
    });

    // Record credit transaction
    await ctx.db.insert("creditTransactions", {
      orgId: profile.currentOrgId,
      profileId: profile._id,
      amount: -creditsCharged,
      type: "test_charge",
      testId,
      balanceAfter: organization.creditBalance - creditsCharged,
      createdAt: now,
    });

    // Schedule the test execution
    await ctx.scheduler.runAfter(0, internal.testPipeline.executeTest, {
      testId,
    });

    return { testId };
  },
});

// Query: get a single test by ID
export const get = query({
  args: { testId: v.id("tests") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const test = await ctx.db.get(args.testId);
    if (!test) return null;

    // Verify user belongs to the org
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile || profile.currentOrgId !== test.orgId) return null;

    return test;
  },
});

// Query: list tests for current org
export const listByOrg = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("queued"),
        v.literal("running"),
        v.literal("success"),
        v.literal("partial"),
        v.literal("failed")
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile) return [];

    let tests;
    if (args.status) {
      tests = await ctx.db
        .query("tests")
        .withIndex("by_org_and_status", (q) =>
          q.eq("orgId", profile.currentOrgId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    } else {
      tests = await ctx.db
        .query("tests")
        .withIndex("by_org", (q) => q.eq("orgId", profile.currentOrgId))
        .order("desc")
        .collect();
    }

    return tests;
  },
});

// Query: get screenshots for a test
export const getScreenshots = query({
  args: { testId: v.id("tests") },
  handler: async (ctx, args) => {
    const screenshots = await ctx.db
      .query("screenshots")
      .withIndex("by_test", (q) => q.eq("testId", args.testId))
      .collect();

    return Promise.all(
      screenshots.map(async (s) => ({
        ...s,
        url: await ctx.storage.getUrl(s.storageId),
      }))
    );
  },
});
