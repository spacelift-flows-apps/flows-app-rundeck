import { AppBlock } from "@slflows/sdk/v1";
import { createRundeckClient } from "../rundeck/client.ts";
import type { RundeckExecution } from "../rundeck/types.ts";
import { executionSchema } from "../utils/mapExecution.ts";
import {
  startTracking,
  pollExecution,
  cleanupStaleTracking,
} from "../utils/executionPoller.ts";

export const subscribeToExecution: AppBlock = {
  name: "Subscribe to Execution",
  description:
    "Subscribe to a Rundeck execution and track its state changes until completion",
  category: "Executions",

  config: {
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
        executionId: {
          name: "Execution ID",
          description: "The ID of the execution to subscribe to",
          type: "number",
          required: true,
        },
      },
      onEvent: async (input) => {
        const { rundeckUrl, apiToken, apiVersion } = input.app.config;
        const { executionId } = input.event.inputConfig;
        const pollInterval = input.block.config.pollInterval;

        const client = createRundeckClient({
          rundeckUrl,
          apiToken,
          apiVersion: apiVersion ?? 57,
        });

        const exec = await client.get<RundeckExecution>(
          `execution/${executionId}`,
        );

        await startTracking({
          exec,
          parentEventId: input.event.id,
          outputKey: "default",
          pollInterval,
        });
      },
    },
  },

  onTimer: async (input) => {
    const trackingKey = input.timer.payload;
    const pendingEventId = input.timer.pendingEvent?.id;
    const { rundeckUrl, apiToken, apiVersion } = input.app.config;
    const pollInterval = input.block.config.pollInterval;
    const maxRetries = input.block.config.maxRetries;

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
      outputKey: "default",
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
      name: "Status Changed",
      description:
        "Emitted each time the execution status changes during polling, including terminal statuses (succeeded, failed, aborted, timedout)",
      default: true,
      type: executionSchema,
    },
  },
};
