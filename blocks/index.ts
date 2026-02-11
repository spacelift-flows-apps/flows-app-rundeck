import { listJobs } from "./listJobs.ts";
import { listExecutions } from "./listExecutions.ts";
import { getExecution } from "./getExecution.ts";

export const blocks = {
  listJobs,
  listExecutions,
  getExecution,
} as const;

export { listJobs, listExecutions, getExecution };
