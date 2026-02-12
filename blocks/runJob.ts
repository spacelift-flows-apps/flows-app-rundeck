import { AppBlock, events } from "@slflows/sdk/v1";
import { createRundeckClient } from "../rundeck/client.ts";
import type { RundeckExecution, RunJobRequest } from "../rundeck/types.ts";
import { executionSchema, mapExecution } from "../utils/mapExecution.ts";
import { suggestProjects } from "../utils/suggestProjects.ts";
import { suggestJobs } from "../utils/suggestJobs.ts";
import {
  startTracking,
  pollExecution,
  cleanupStaleTracking,
} from "../utils/executionPoller.ts";

export const runJob: AppBlock = {
  name: "Run Job",
  description: "Trigger a Rundeck job and track its execution until completion",
  category: "Jobs",

  config: {
    project: {
      name: "Project",
      description: "The Rundeck project containing the job",
      type: "string",
      required: true,
      suggestValues: suggestProjects,
    },
    trackExecution: {
      name: "Track Execution",
      description:
        "Whether to subscribe to execution state changes after triggering the job",
      type: "boolean",
      required: false,
      default: true,
    },
    pollInterval: {
      name: "Poll Interval (seconds)",
      description: "How often to poll for execution status updates",
      type: "number",
      required: false,
      default: 5,
    },
    maxRetries: {
      name: "Max Poll Retries",
      description:
        "Maximum number of consecutive poll failures before giving up",
      type: "number",
      required: false,
      default: 3,
    },
  },

  inputs: {
    default: {
      config: {
        jobId: {
          name: "Job",
          description: "The Rundeck job to run",
          type: "string",
          required: true,
          suggestValues: suggestJobs,
        },
        options: {
          name: "Job Options (JSON)",
          description: 'JSON object of job options (e.g., {"opt1": "val1"})',
          type: "string",
          required: false,
        },
        nodeFilter: {
          name: "Node Filter",
          description: 'Override the job\'s node filter (e.g., "tags: web")',
          type: "string",
          required: false,
        },
        logLevel: {
          name: "Log Level",
          description: "Execution log level",
          type: "string",
          required: false,
          default: "INFO",
        },
      },
      onEvent: async (input) => {
        const { rundeckUrl, apiToken, apiVersion } = input.app.config;
        const {
          jobId,
          options,
          nodeFilter,
          logLevel = "INFO",
        } = input.event.inputConfig;
        const pollInterval = input.block.config.pollInterval ?? 5;

        const client = createRundeckClient({
          rundeckUrl,
          apiToken,
          apiVersion: apiVersion ?? 57,
        });

        const body: RunJobRequest = { loglevel: logLevel };
        if (options) {
          body.options = JSON.parse(options);
        }
        if (nodeFilter) {
          body.filter = nodeFilter;
        }

        const exec = await client.post<RundeckExecution>(
          `job/${jobId}/executions`,
          body,
        );
        const mapped = mapExecution(exec);

        // Emit immediately on the default output (fire-and-forget)
        await events.emit(mapped);

        // Optionally start tracking execution state changes
        const trackExecution = input.block.config.trackExecution ?? true;
        if (trackExecution) {
          await startTracking({
            exec,
            parentEventId: input.event.id,
            outputKey: "stateChanged",
            pollInterval,
          });
        }
      },
    },
  },

  onTimer: async (input) => {
    const trackingKey = input.timer.payload;
    const pendingEventId = input.timer.pendingEvent?.id;
    const { rundeckUrl, apiToken, apiVersion } = input.app.config;
    const pollInterval = input.block.config.pollInterval ?? 5;
    const maxRetries = input.block.config.maxRetries ?? 3;

    if (!pendingEventId) {
      console.error(
        `No pending event for tracking key ${trackingKey}, aborting poll`,
      );
      return;
    }

    const client = createRundeckClient({
      rundeckUrl,
      apiToken,
      apiVersion: apiVersion ?? 57,
    });

    await pollExecution(trackingKey, pendingEventId, {
      client,
      pollInterval,
      maxRetries,
      outputKey: "stateChanged",
    });
  },

  schedules: {
    cleanup: {
      definition: {
        type: "cron",
        cron: {
          expression: "0 * * * *",
          location: "UTC",
        },
      },
      onTrigger: cleanupStaleTracking,
    },
  },

  outputs: {
    default: {
      name: "Job Submitted",
      description:
        "Emitted immediately when the job is triggered, before execution completes",
      default: true,
      type: executionSchema,
    },
    stateChanged: {
      name: "State Changed",
      description:
        "Emitted each time the execution status changes during polling, including terminal states (succeeded, failed, aborted, timedout, failed-with-retry)",
      type: executionSchema,
    },
  },
};
