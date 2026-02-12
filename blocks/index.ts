import { listJobs } from "./listJobs.ts";
import { listExecutions } from "./listExecutions.ts";
import { getExecution } from "./getExecution.ts";
import { runJob } from "./runJob.ts";
import { subscribeToExecution } from "./subscribeToExecution.ts";

export const blocks = {
  listJobs,
  listExecutions,
  getExecution,
  runJob,
  subscribeToExecution,
} as const;

export { listJobs, listExecutions, getExecution, runJob, subscribeToExecution };
