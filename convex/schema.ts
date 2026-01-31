import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  profiles: defineTable({
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    currentOrgId: v.id("organizations"),
    role: v.optional(v.string()),
    onboardingCompleted: v.boolean(),
    createdAt: v.number()
  })
    .index("by_user_id", ["userId"])
    .index("by_email", ["email"]),

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    isPersonal: v.boolean(),
    creditBalance: v.number(),
    plan: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("agency"),
      v.literal("enterprise")
    ),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    createdAt: v.number()
  })
    .index("by_slug", ["slug"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

  orgMembers: defineTable({
    orgId: v.id("organizations"),
    profileId: v.id("profiles"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer")
    ),
    createdAt: v.number()
  })
    .index("by_org", ["orgId"])
    .index("by_profile", ["profileId"])
    .index("by_org_and_profile", ["orgId", "profileId"]),

  tests: defineTable({
    orgId: v.id("organizations"),
    createdBy: v.id("profiles"),
    url: v.string(),
    testType: v.union(v.literal("quick_check"), v.literal("cmp_test")),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("success"),
      v.literal("partial"),
      v.literal("failed")
    ),
    creditsCharged: v.number(),
    networkDetected: v.optional(v.string()),
    report: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
    shareId: v.optional(v.string()),
    shareEnabled: v.optional(v.boolean()),
    createdAt: v.number(),
    completedAt: v.optional(v.number())
  })
    .index("by_org", ["orgId", "createdAt"])
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_share_id", ["shareId"])
    .index("by_created", ["createdAt"]),

  screenshots: defineTable({
    testId: v.id("tests"),
    step: v.string(),
    storageId: v.id("_storage"),
    createdAt: v.number()
  }).index("by_test", ["testId"]),

  creditTransactions: defineTable({
    orgId: v.id("organizations"),
    profileId: v.optional(v.id("profiles")),
    amount: v.number(),
    type: v.union(
      v.literal("welcome_bonus"),
      v.literal("subscription_grant"),
      v.literal("pack_purchase"),
      v.literal("test_charge"),
      v.literal("refund"),
      v.literal("manual_adjustment")
    ),
    testId: v.optional(v.id("tests")),
    stripeSessionId: v.optional(v.string()),
    note: v.optional(v.string()),
    balanceAfter: v.number(),
    createdAt: v.number()
  })
    .index("by_org", ["orgId", "createdAt"])
    .index("by_profile", ["profileId", "createdAt"]),

  featureFlags: defineTable({
    key: v.string(),
    enabled: v.boolean(),
    description: v.optional(v.string()),
    createdAt: v.number()
  }).index("by_key", ["key"])
});
