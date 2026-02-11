import { createRundeckClient } from "../rundeck/client.ts";
import type { RundeckProject } from "../rundeck/types.ts";

interface SuggestValuesInput {
  app: { config: Record<string, any> };
  block: Record<string, any>;
  searchPhrase?: string;
}

export async function suggestProjects(input: SuggestValuesInput) {
  console.log("suggestProjects called, searchPhrase:", input.searchPhrase);

  try {
    const { rundeckUrl, apiToken, apiVersion } = input.app.config;
    console.log(
      "suggestProjects config - rundeckUrl:",
      rundeckUrl,
      "apiVersion:",
      apiVersion,
    );

    const client = createRundeckClient({
      rundeckUrl,
      apiToken,
      apiVersion: apiVersion ?? 57,
    });

    const projects = await client.get<RundeckProject[]>("projects");
    console.log("suggestProjects fetched", projects.length, "projects");

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

    const result = {
      suggestedValues: filtered.map((project) => ({
        label: project.label || project.name,
        value: project.name,
      })),
    };

    console.log(
      "suggestProjects returning",
      result.suggestedValues.length,
      "values:",
      JSON.stringify(result.suggestedValues),
    );
    return result;
  } catch (error) {
    console.error("suggestProjects error:", error);
    return { suggestedValues: [] };
  }
}
