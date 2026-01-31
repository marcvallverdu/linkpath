import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up tests stuck in "running" state for > 5 minutes
crons.interval(
  "cleanup stale tests",
  { minutes: 5 },
  internal.testPipeline.cleanupStaleTests
);

export default crons;
