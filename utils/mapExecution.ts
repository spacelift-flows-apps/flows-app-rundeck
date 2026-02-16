import type { RundeckExecution } from "../rundeck/types.ts";

export function mapExecution(exec: RundeckExecution) {
  return {
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
  };
}

export const executionSchema = {
  type: "object" as const,
  properties: {
    id: { type: "number" as const, description: "The execution ID" },
    href: { type: "string" as const, description: "The API URL" },
    permalink: { type: "string" as const, description: "The GUI URL" },
    status: {
      type: "string" as const,
      description:
        "Execution status (running, succeeded, failed, aborted, timedout, scheduled, other)",
    },
    customStatus: {
      type: "string" as const,
      description: "Custom status when status is 'other'",
    },
    project: {
      type: "string" as const,
      description: "The project name",
    },
    user: {
      type: "string" as const,
      description: "User who started the execution",
    },
    dateStarted: {
      type: "string" as const,
      description: "ISO-8601 start timestamp",
    },
    dateEnded: {
      type: "string" as const,
      description: "ISO-8601 end timestamp",
    },
    job: {
      type: "object" as const,
      description: "The job that was executed",
      properties: {
        id: { type: "string" as const, description: "The job UUID" },
        name: {
          type: "string" as const,
          description: "The job name",
        },
        group: {
          type: "string" as const,
          description: "The job group path",
        },
        project: {
          type: "string" as const,
          description: "The project name",
        },
        description: {
          type: "string" as const,
          description: "The job description",
        },
        averageDuration: {
          type: "number" as const,
          description: "Average duration in milliseconds",
        },
      },
      required: ["id", "name", "group", "project"],
    },
    description: {
      type: "string" as const,
      description: "Execution description",
    },
    argstring: {
      type: "string" as const,
      description: "Argument string passed to the execution",
    },
    successfulNodes: {
      type: "array" as const,
      description: "Nodes that succeeded",
      items: { type: "string" as const },
    },
    failedNodes: {
      type: "array" as const,
      description: "Nodes that failed",
      items: { type: "string" as const },
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
};
