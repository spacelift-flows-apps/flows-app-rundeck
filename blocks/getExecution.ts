import { AppBlock, events } from "@slflows/sdk/v1";
import { createRundeckClient } from "../rundeck/client.ts";
import type { RundeckExecution } from "../rundeck/types.ts";
import { executionSchema, mapExecution } from "../utils/mapExecution.ts";

export const getExecution: AppBlock = {
  name: "Get Execution",
  description: "Get details of a specific Rundeck execution by ID",
  category: "Executions",

  inputs: {
    default: {
      config: {
        executionId: {
          name: "Execution ID",
          description: "The ID of the execution to retrieve",
          type: "number",
          required: true,
        },
      },
      onEvent: async (input) => {
        const { rundeckUrl, apiToken, apiVersion } = input.app.config;
        const { executionId } = input.event.inputConfig;

        const client = createRundeckClient({
          rundeckUrl,
          apiToken,
          apiVersion: apiVersion ?? 57,
        });

        const exec = await client.get<RundeckExecution>(
          `execution/${executionId}`,
        );

        await events.emit(mapExecution(exec));
      },
    },
  },

  outputs: {
    default: {
      name: "Execution Details",
      description: "Details of the execution",
      default: true,
      type: executionSchema,
    },
  },
};
