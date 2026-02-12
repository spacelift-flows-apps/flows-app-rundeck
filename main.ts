import { defineApp } from "@slflows/sdk/v1";
import { blocks } from "./blocks/index";

export const app = defineApp({
  name: "Rundeck Integration",
  installationInstructions: `Rundeck integration app for managing jobs and executions.

To install:
1. Add your Rundeck instance URL (e.g., https://your-rundeck-server:4440)
2. Add your Rundeck API token (generate from User Profile > API Tokens)
3. Optionally adjust the API version (default: 57)
4. Start using the blocks in your flows`,

  blocks,

  config: {
    rundeckUrl: {
      name: "Rundeck URL",
      description:
        "Your Rundeck instance URL (e.g., https://your-rundeck-server:4440)",
      type: "string",
      required: true,
    },
    apiToken: {
      name: "API Token",
      description:
        "Your Rundeck API token (generate from User Profile > API Tokens)",
      type: "string",
      required: true,
      sensitive: true,
    },
    apiVersion: {
      name: "API Version",
      description: "Rundeck API version to use",
      type: "number",
      required: false,
      default: 57,
    },
  },
});
