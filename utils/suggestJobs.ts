import { createRundeckClient } from "../rundeck/client.ts";
import type { RundeckJob } from "../rundeck/types.ts";

interface SuggestValuesInput {
  app: { config: Record<string, any> };
  block: { config?: Record<string, any> };
  searchPhrase?: string;
}

export async function suggestJobs(input: SuggestValuesInput) {
  try {
    const project = input.block?.config?.project;
    if (!project) {
      return { suggestedValues: [] };
    }

    const { rundeckUrl, apiToken, apiVersion } = input.app.config;

    const client = createRundeckClient({
      rundeckUrl,
      apiToken,
      apiVersion: apiVersion ?? 57,
    });

    const jobs = await client.get<RundeckJob[]>(`project/${project}/jobs`);

    const filtered = input.searchPhrase
      ? jobs.filter(
          (j) =>
            j.name.toLowerCase().includes(input.searchPhrase!.toLowerCase()) ||
            j.group.toLowerCase().includes(input.searchPhrase!.toLowerCase()),
        )
      : jobs;

    return {
      suggestedValues: filtered.map((job) => ({
        label: job.group ? `${job.group}/${job.name}` : job.name,
        value: job.id,
      })),
    };
  } catch (error) {
    console.error("suggestJobs error:", error);
    return { suggestedValues: [] };
  }
}
