import { query } from "./_generated/server";

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile) return null;

    const orgId = profile.currentOrgId;

    // Cap at 1000 most recent tests for stats (prevents OOM on large orgs)
    const allTests = await ctx.db
      .query("tests")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(1000);

    const totalTests = allTests.length;
    const successCount = allTests.filter((t) => t.status === "success").length;
    const failedCount = allTests.filter((t) => t.status === "failed").length;
    const runningCount = allTests.filter(
      (t) => t.status === "running" || t.status === "queued"
    ).length;

    // Network breakdown
    const networkCounts: Record<string, number> = {};
    for (const t of allTests) {
      if (t.networkDetected) {
        networkCounts[t.networkDetected] =
          (networkCounts[t.networkDetected] || 0) + 1;
      }
    }

    // Recent 5 tests
    const recentTests = allTests
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    // Credits used this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const creditsUsedThisMonth = allTests
      .filter((t) => t.createdAt >= monthStart.getTime())
      .reduce((sum, t) => sum + t.creditsCharged, 0);

    return {
      totalTests,
      successCount,
      failedCount,
      runningCount,
      networkCounts,
      recentTests,
      creditsUsedThisMonth,
    };
  },
});
