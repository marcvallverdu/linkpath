import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

// Create Stripe Checkout session for Pro plan
export const createCheckoutSession = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const profile = await ctx.runQuery(
      internal.stripe.getProfileForCheckout,
      { userId: identity.subject }
    );
    if (!profile) throw new Error("Profile not found");

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) throw new Error("Stripe not configured");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        mode: "subscription",
        "line_items[0][price]": process.env.STRIPE_PRO_PRICE_ID || "",
        "line_items[0][quantity]": "1",
        success_url: `${appUrl}/dashboard/settings?upgraded=true`,
        cancel_url: `${appUrl}/dashboard/settings`,
        customer_email: profile.email,
        "metadata[orgId]": profile.currentOrgId,
        "metadata[profileId]": profile._id,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe error: ${error}`);
    }

    const session = await response.json();
    return { url: session.url };
  },
});

// Create Stripe Checkout for credit pack purchase
export const createCreditPackCheckout = action({
  args: {
    packSize: v.union(
      v.literal("small"),
      v.literal("medium"),
      v.literal("large")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const profile = await ctx.runQuery(
      internal.stripe.getProfileForCheckout,
      { userId: identity.subject }
    );
    if (!profile) throw new Error("Profile not found");

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) throw new Error("Stripe not configured");

    const packs: Record<string, { priceId: string; credits: number }> = {
      small: {
        priceId: process.env.STRIPE_PACK_SMALL_PRICE_ID || "",
        credits: 50,
      },
      medium: {
        priceId: process.env.STRIPE_PACK_MEDIUM_PRICE_ID || "",
        credits: 200,
      },
      large: {
        priceId: process.env.STRIPE_PACK_LARGE_PRICE_ID || "",
        credits: 500,
      },
    };

    const pack = packs[args.packSize];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        mode: "payment",
        "line_items[0][price]": pack.priceId,
        "line_items[0][quantity]": "1",
        success_url: `${appUrl}/dashboard/settings?credits=added`,
        cancel_url: `${appUrl}/dashboard/settings`,
        "metadata[orgId]": profile.currentOrgId,
        "metadata[profileId]": profile._id,
        "metadata[credits]": String(pack.credits),
        "metadata[type]": "credit_pack",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe error: ${error}`);
    }

    const session = await response.json();
    return { url: session.url };
  },
});

// Internal: handle successful checkout webhook
export const handleCheckoutCompleted = internalMutation({
  args: {
    orgId: v.string(),
    profileId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    type: v.string(),
    credits: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // orgId comes as string from Stripe metadata — cast back to Convex ID
    let org;
    try {
      org = await ctx.db.get(args.orgId as any);
    } catch {
      // If ID format is invalid, try filter
      org = await ctx.db
        .query("organizations")
        .filter((q) => q.eq(q.field("_id"), args.orgId))
        .first();
    }
    if (!org) return;

    if (args.type === "subscription") {
      // Upgrade to Pro
      await ctx.db.patch(org._id, {
        plan: "pro" as const,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
      });

      // Grant monthly credits (500 for Pro)
      const newBalance = org.creditBalance + 500;
      await ctx.db.patch(org._id, { creditBalance: newBalance });

      await ctx.db.insert("creditTransactions", {
        orgId: org._id,
        amount: 500,
        type: "subscription_grant",
        balanceAfter: newBalance,
        createdAt: Date.now(),
        note: "Pro plan subscription credits",
      });
    } else if (args.type === "credit_pack" && args.credits) {
      const newBalance = org.creditBalance + args.credits;
      await ctx.db.patch(org._id, { creditBalance: newBalance });

      await ctx.db.insert("creditTransactions", {
        orgId: org._id,
        amount: args.credits,
        type: "pack_purchase",
        balanceAfter: newBalance,
        createdAt: Date.now(),
        note: `${args.credits} credit pack`,
      });
    }
  },
});

// Internal query used by actions
import { internalQuery } from "./_generated/server";

export const getProfileForCheckout = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();
  },
});
