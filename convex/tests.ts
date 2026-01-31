import { mutation } from "convex/server";
import { v } from "convex/values";

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

    return { testId };
  },
});
