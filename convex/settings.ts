import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getCreditHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile) return [];

    return await ctx.db
      .query("creditTransactions")
      .withIndex("by_org", (q) => q.eq("orgId", profile.currentOrgId))
      .order("desc")
      .take(50);
  },
});

export const completeOnboarding = mutation({
  args: {
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile) throw new Error("Profile not found");

    const patch: Record<string, unknown> = { onboardingCompleted: true };
    if (args.role) patch.role = args.role;

    await ctx.db.patch(profile._id, patch);
    return { success: true };
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile) throw new Error("Profile not found");

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name;

    await ctx.db.patch(profile._id, patch);
    return { success: true };
  },
});

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile) throw new Error("Profile not found");

    // Delete all tests for user's org
    const tests = await ctx.db
      .query("tests")
      .withIndex("by_org", (q) => q.eq("orgId", profile.currentOrgId))
      .collect();
    for (const test of tests) {
      await ctx.db.delete(test._id);
    }

    // Delete credit transactions
    const txns = await ctx.db
      .query("creditTransactions")
      .withIndex("by_org", (q) => q.eq("orgId", profile.currentOrgId))
      .collect();
    for (const txn of txns) {
      await ctx.db.delete(txn._id);
    }

    // Delete org members
    const members = await ctx.db
      .query("orgMembers")
      .withIndex("by_org", (q) => q.eq("orgId", profile.currentOrgId))
      .collect();
    for (const m of members) {
      await ctx.db.delete(m._id);
    }

    // Delete org
    await ctx.db.delete(profile.currentOrgId);

    // Delete profile
    await ctx.db.delete(profile._id);

    return { deleted: true };
  },
});
