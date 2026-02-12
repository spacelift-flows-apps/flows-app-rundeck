import { AppBlock, events } from "@slflows/sdk/v1";
import { createRundeckClient } from "../rundeck/client.ts";
import type { RundeckJob } from "../rundeck/types.ts";
import { suggestProjects } from "../utils/suggestProjects.ts";

export const listJobs: AppBlock = {
  name: "List Project Jobs",
  description: "List all jobs in a Rundeck project",
  category: "Jobs",

  inputs: {
    default: {
      config: {
        project: {
          name: "Project",
          description: "The Rundeck project to list jobs from",
          type: "string",
          required: true,
          suggestValues: suggestProjects,
        },
        jobFilter: {
          name: "Job Name Filter",
          description:
            "Filter jobs by name (matches any job name containing this value)",
          type: "string",
          required: false,
        },
        groupPath: {
          name: "Group Path",
          description:
            'Filter jobs by group path (e.g., "production/deploy"). Use "*" for all groups.',
          type: "string",
          required: false,
        },
      },
      onEvent: async (input) => {
        const { rundeckUrl, apiToken, apiVersion } = input.app.config;
        const { project, jobFilter, groupPath } = input.event.inputConfig;

        const client = createRundeckClient({
          rundeckUrl,
          apiToken,
          apiVersion: apiVersion ?? 57,
        });

        const params = new URLSearchParams();
        if (jobFilter) params.set("jobFilter", jobFilter);
        if (groupPath) params.set("groupPath", groupPath);

        const query = params.toString();
        const endpoint = `project/${project}/jobs${query ? `?${query}` : ""}`;

        const jobs = await client.get<RundeckJob[]>(endpoint);

        await events.emit({
          project,
          total: jobs.length,
          jobs: jobs.map((job) => ({
            id: job.id,
            name: job.name,
            group: job.group,
            project: job.project,
            description: job.description,
            href: job.href,
            permalink: job.permalink,
            scheduled: job.scheduled,
            scheduleEnabled: job.scheduleEnabled,
            enabled: job.enabled,
            averageDuration: job.averageDuration,
          })),
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Jobs List",
      description: "List of jobs in the project",
      default: true,
      type: {
        type: "object",
        properties: {
          project: {
            type: "string",
            description: "The project name",
          },
          total: {
            type: "number",
            description: "Total number of jobs returned",
          },
          jobs: {
            type: "array",
            description: "Array of jobs in the project",
            items: {
              type: "object",
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
                href: { type: "string", description: "The API URL" },
                permalink: { type: "string", description: "The GUI URL" },
                scheduled: {
                  type: "boolean",
                  description: "Whether the job has a schedule",
                },
                scheduleEnabled: {
                  type: "boolean",
                  description: "Whether the schedule is enabled",
                },
                enabled: {
                  type: "boolean",
                  description: "Whether the job is enabled",
                },
                averageDuration: {
                  type: "number",
                  description: "Average execution duration in milliseconds",
                },
              },
              required: [
                "id",
                "name",
                "group",
                "project",
                "description",
                "href",
                "permalink",
                "scheduled",
                "scheduleEnabled",
                "enabled",
              ],
            },
          },
        },
        required: ["project", "total", "jobs"],
      },
    },
  },
};
