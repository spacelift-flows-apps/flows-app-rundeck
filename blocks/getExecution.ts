import { AppBlock, events } from "@slflows/sdk/v1";
import { createRundeckClient } from "../rundeck/client.ts";
import type { RundeckExecution } from "../rundeck/types.ts";

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

        await events.emit({
          id: exec.id,
          href: exec.href,
          permalink: exec.permalink,
          status: exec.status,
          customStatus: exec.customStatus,
          project: exec.project,
          user: exec.user,
          dateStarted: exec["date-started"]?.date,
          dateEnded: exec["date-ended"]?.date,
          job: {
            id: exec.job.id,
            name: exec.job.name,
            group: exec.job.group,
            project: exec.job.project,
            description: exec.job.description,
            averageDuration: exec.job.averageDuration,
          },
          description: exec.description,
          argstring: exec.argstring,
          successfulNodes: exec.successfulNodes,
          failedNodes: exec.failedNodes,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Execution Details",
      description: "Details of the execution",
      default: true,
      type: {
        type: "object",
        properties: {
          id: { type: "number", description: "The execution ID" },
          href: { type: "string", description: "The API URL" },
          permalink: { type: "string", description: "The GUI URL" },
          status: {
            type: "string",
            description:
              "Execution status (running, succeeded, failed, aborted, timedout, scheduled, other)",
          },
          customStatus: {
            type: "string",
            description: "Custom status when status is 'other'",
          },
          project: { type: "string", description: "The project name" },
          user: {
            type: "string",
            description: "User who started the execution",
          },
          dateStarted: {
            type: "string",
            description: "ISO-8601 start timestamp",
          },
          dateEnded: {
            type: "string",
            description: "ISO-8601 end timestamp",
          },
          job: {
            type: "object",
            description: "The job that was executed",
            properties: {
              id: { type: "string", description: "The job UUID" },
              name: { type: "string", description: "The job name" },
              group: { type: "string", description: "The job group path" },
              project: { type: "string", description: "The project name" },
              description: {
                type: "string",
                description: "The job description",
              },
              averageDuration: {
                type: "number",
                description: "Average duration in milliseconds",
              },
            },
            required: ["id", "name", "group", "project"],
          },
          description: {
            type: "string",
            description: "Execution description",
          },
          argstring: {
            type: "string",
            description: "Argument string passed to the execution",
          },
          successfulNodes: {
            type: "array",
            description: "Nodes that succeeded",
            items: { type: "string" },
          },
          failedNodes: {
            type: "array",
            description: "Nodes that failed",
            items: { type: "string" },
          },
        },
        required: [
          "id",
          "href",
          "permalink",
          "status",
          "project",
          "user",
          "dateStarted",
          "job",
          "description",
        ],
      },
    },
  },
};
