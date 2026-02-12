import { AppBlock, events } from "@slflows/sdk/v1";
import { createRundeckClient } from "../rundeck/client.ts";
import type { ExecutionsResponse } from "../rundeck/types.ts";
import { executionSchema, mapExecution } from "../utils/mapExecution.ts";
import { suggestProjects } from "../utils/suggestProjects.ts";

export const listExecutions: AppBlock = {
  name: "List Project Executions",
  description: "List executions for a Rundeck project",
  category: "Executions",

  inputs: {
    default: {
      config: {
        project: {
          name: "Project",
          description: "The Rundeck project to list executions from",
          type: "string",
          required: true,
          suggestValues: suggestProjects,
        },
        status: {
          name: "Status Filter",
          description: "Filter executions by status",
          type: {
            type: "string",
            enum: [
              "running",
              "succeeded",
              "failed",
              "aborted",
              "timedout",
              "failed-with-retry",
              "scheduled",
              "other",
            ],
          },
          required: false,
        },
        max: {
          name: "Max Results",
          description: "Maximum number of results to return (default: 20)",
          type: "number",
          required: false,
          default: 20,
        },
        offset: {
          name: "Offset",
          description: "Offset for pagination (zero-indexed)",
          type: "number",
          required: false,
          default: 0,
        },
      },
      onEvent: async (input) => {
        const { rundeckUrl, apiToken, apiVersion } = input.app.config;
        const {
          project,
          status,
          max = 20,
          offset = 0,
        } = input.event.inputConfig;

        const client = createRundeckClient({
          rundeckUrl,
          apiToken,
          apiVersion: apiVersion ?? 57,
        });

        const params = new URLSearchParams();
        if (status) params.set("statusFilter", status);
        params.set("max", String(max));
        params.set("offset", String(offset));

        const query = params.toString();
        const endpoint = `project/${project}/executions?${query}`;

        const response = await client.get<ExecutionsResponse>(endpoint);

        await events.emit({
          project,
          paging: response.paging,
          executions: response.executions.map(mapExecution),
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Executions List",
      description: "List of executions in the project with pagination info",
      default: true,
      type: {
        type: "object",
        properties: {
          project: {
            type: "string",
            description: "The project name",
          },
          paging: {
            type: "object",
            description: "Pagination information",
            properties: {
              count: {
                type: "number",
                description: "Number of results in this page",
              },
              total: {
                type: "number",
                description: "Total number of executions matching the query",
              },
              offset: { type: "number", description: "Current offset" },
              max: { type: "number", description: "Max results per page" },
            },
            required: ["count", "total", "offset", "max"],
          },
          executions: {
            type: "array",
            description: "Array of executions",
            items: executionSchema,
          },
        },
        required: ["project", "paging", "executions"],
      },
    },
  },
};
