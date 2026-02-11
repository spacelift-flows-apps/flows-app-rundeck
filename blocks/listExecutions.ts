import { AppBlock, events } from "@slflows/sdk/v1";
import { createRundeckClient } from "../rundeck/client.ts";
import type { ExecutionsResponse } from "../rundeck/types.ts";
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
          type: "string",
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
          executions: response.executions.map((exec) => ({
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
          })),
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
            items: {
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
                    group: {
                      type: "string",
                      description: "The job group path",
                    },
                    project: {
                      type: "string",
                      description: "The project name",
                    },
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
        required: ["project", "paging", "executions"],
      },
    },
  },
};
