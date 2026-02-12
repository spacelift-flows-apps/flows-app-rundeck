import {createRundeckClient} from "../rundeck/client.ts";
import type {RundeckProject} from "../rundeck/types.ts";

interface SuggestValuesInput {
  app: { config: Record<string, any> };
  block: Record<string, any>;
  searchPhrase?: string;
}

export async function suggestProjects(input: SuggestValuesInput) {
  try {
    const { rundeckUrl, apiToken, apiVersion } = input.app.config;

    const client = createRundeckClient({
      rundeckUrl,
      apiToken,
      apiVersion: apiVersion ?? 57,
    });

    const projects = await client.get<RundeckProject[]>("projects");

    const filtered = input.searchPhrase
      ? projects.filter(
          (p) =>
            p.name.toLowerCase().includes(input.searchPhrase!.toLowerCase()) ||
            (p.label &&
              p.label
                .toLowerCase()
                .includes(input.searchPhrase!.toLowerCase())),
        )
      : projects;

    return {
      suggestedValues: filtered.map((project) => ({
        label: project.label || project.name,
        value: project.name,
      })),
    };
  } catch (error) {
    return { suggestedValues: [] };
  }
}
