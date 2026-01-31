import { mutation, query } from "convex/server";

export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .unique();

    if (existing) {
      return { profileId: existing._id, orgId: existing.currentOrgId };
    }

    const now = Date.now();
    const orgId = await ctx.db.insert("organizations", {
      name: "Personal",
      slug: `personal-${identity.subject.slice(0, 8)}`,
      isPersonal: true,
      creditBalance: 50,
      plan: "free",
      createdAt: now,
    });

    const profileId = await ctx.db.insert("profiles", {
      userId: identity.subject,
      name: identity.name ?? undefined,
      email: identity.email ?? "",
      avatarUrl: identity.pictureUrl ?? undefined,
      currentOrgId: orgId,
      onboardingCompleted: false,
      createdAt: now,
    });

    await ctx.db.insert("orgMembers", {
      orgId,
      profileId,
      role: "owner",
      createdAt: now,
    });

    await ctx.db.insert("creditTransactions", {
      orgId,
      profileId,
      amount: 50,
      type: "welcome_bonus",
      balanceAfter: 50,
      createdAt: now,
      note: "Welcome bonus",
    });

    return { profileId, orgId };
  },
});

export const getDashboardContext = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!profile) {
      return null;
    }

    const organization = await ctx.db.get(profile.currentOrgId);

    return {
      profile,
      organization,
    };
  },
});
