# Flows Overview

Flows is a workflow automation tool targeted at DevOps engineers. You have blocks on a canvas connected by lines. Those blocks may have multiple inputs and outputs on which they send and receive events. We call these blocks "entities" as they can be very powerful. New entities can be implemented by means of apps which are implemented in JavaScript. Those entities can have http endpoints, manage infrastructure resources, have a lifecycle, and more. Entities live in flows.

All configuration expressions and the code of apps are executed on agents, which are connected to the gateway via websockets. Those agents are responsible for managing Node.js runtimes for apps and for flows.

This repository is an app repo based on our Flows App Template. It can be used as a starting point for building new Flows apps.

When working on the app, **always** make sure to read the appRuntime.ts from https://docs.useflows.com/appRuntime.ts . This is later injected by the Flows runtime, you should never include it yourself. It's presented there as a reference.

If necessary, you may also consider reading the documentation about building Flows apps at https://docs.useflows.com/developers/building-apps/ , specifically:

- Configuration: https://docs.useflows.com/developers/building-apps/configuration/
- Events: https://docs.useflows.com/developers/building-apps/events/
- Lifecycle: https://docs.useflows.com/developers/building-apps/lifecycle/
- KV Storage: https://docs.useflows.com/developers/building-apps/kv-storage/
- HTTP Handlers: https://docs.useflows.com/developers/building-apps/http/
- Scheduling: https://docs.useflows.com/developers/building-apps/scheduling/
- Messaging: https://docs.useflows.com/developers/building-apps/messaging/

If necessary, you can also find other apps in public repos of the https://github.com/spacelift-flows-apps organization.

## Overview

This is a Rundeck integration app for Flows that allows managing Rundeck jobs and executions. It provides:

- Clean configuration schema with secrets support for the Rundeck API token
- Blocks for listing jobs, listing executions, getting execution details, running jobs, and subscribing to executions
- Dynamic project selection via `suggestValues` dropdowns
- Type-safe implementation with TypeScript
- Shared Rundeck API client and type definitions

## Architecture

### App Structure

```text
flows-app-rundeck/
├── blocks/                      # Block implementations
│   ├── index.ts                 # Block registry and exports
│   ├── listJobs.ts              # List jobs in a project
│   ├── listExecutions.ts        # List executions in a project
│   ├── getExecution.ts          # Get execution details by ID
│   ├── runJob.ts                # Run a job and optionally track execution
│   └── subscribeToExecution.ts  # Subscribe to execution state changes
├── rundeck/                     # Rundeck API client and types
│   ├── client.ts                # RundeckClient class + factory function
│   └── types.ts                 # Shared Rundeck API response types
├── utils/                       # Shared utilities
│   ├── suggestProjects.ts       # suggestValues handler for project selection
│   ├── suggestJobs.ts           # suggestValues handler for job selection
│   ├── mapExecution.ts          # Execution mapping and JSON Schema
│   ├── executionStates.ts       # Terminal state types and helpers
│   └── executionPoller.ts       # Shared polling/tracking utilities
├── examples/                    # Example Rundeck job definitions
│   └── test-job.yaml            # Test jobs for development
├── .github/workflows/ci.yml     # CI/CD pipeline
├── main.ts                      # App definition and configuration
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
└── README.md                    # Documentation and setup guide
```

### Key Components

#### Configuration (`main.ts`)

The app requires the following configuration values:

- `rundeckUrl` (text, required) - Rundeck instance URL (e.g., https://your-rundeck-server:4440)
- `apiToken` (secret, required) - Rundeck API token
- `apiVersion` (number, optional) - Rundeck API version (default: 57)

#### Rundeck Client (`rundeck/`)

- **`rundeck/client.ts`** - HTTP client for the Rundeck API. Handles authentication via `X-Rundeck-Auth-Token` header, JSON request/response handling, and error reporting. Provides `get`, `post`, `put`, `delete` methods.
- **`rundeck/types.ts`** - Shared TypeScript interfaces for Rundeck API responses: `RundeckProject`, `RundeckJob`, `RundeckExecution`, `ExecutionsResponse`.

#### Utilities (`utils/`)

- **`utils/suggestProjects.ts`** - Shared `suggestValues` handler that fetches projects from Rundeck and returns them as dropdown options. Used by blocks that need a project selector. Supports filtering via `searchPhrase`.
- **`utils/suggestJobs.ts`** - Shared `suggestValues` handler that fetches jobs for a given project. Used by the Run Job block. Requires `block.config.project` to be set.
- **`utils/mapExecution.ts`** - Maps raw `RundeckExecution` API responses to a clean output format. Also exports `executionSchema` (JSON Schema) used by execution-related block outputs.
- **`utils/executionStates.ts`** - Defines the `TerminalState` union type and `isTerminalState()` type guard for Rundeck execution terminal states (`succeeded`, `failed`, `failed-with-retry`, `aborted`, `timedout`).
- **`utils/executionPoller.ts`** - Shared execution polling utilities used by `runJob` and `subscribeToExecution`. Exports:
  - `TrackingState` interface — shape of KV tracking entries
  - `startTracking()` — creates a pending event, stores tracking state in KV (key: `tracking:{parentEventId}`), and sets the first poll timer
  - `pollExecution()` — the timer handler body: reads tracking from KV, fetches execution, emits state changes, handles terminal states/retry/reschedule
  - `cleanupStaleTracking()` — hourly cleanup that cancels pending events and deletes KV entries older than 24 hours

#### Blocks (`blocks/`)

- **`blocks/index.ts`** - Central registry that exports all blocks as a dictionary
- **`blocks/listJobs.ts`** - Lists jobs in a Rundeck project with optional filters (job name, group path). Uses `suggestValues` for project selection.
- **`blocks/listExecutions.ts`** - Lists executions for a Rundeck project with optional status filter and pagination. Uses `suggestValues` for project selection.
- **`blocks/getExecution.ts`** - Gets details of a specific execution by ID.
- **`blocks/runJob.ts`** - Triggers a Rundeck job and optionally tracks its execution state changes. Has a `trackExecution` boolean config (default: `true`) to control whether polling is enabled. Emits immediately on default output ("Job Submitted"), then polls and emits state changes on "stateChanged" output. Uses shared polling utilities from `utils/executionPoller.ts`.
- **`blocks/subscribeToExecution.ts`** - Subscribes to a Rundeck execution by ID and polls for state changes until a terminal state is reached. Uses shared polling utilities from `utils/executionPoller.ts`. Emits on default output ("State Changed") each time the status changes.

## Implementation Patterns

### Block Structure

```typescript
const myBlock: AppBlock = {
  name: "Block Name",
  description: "What this block does",
  category: "Category",

  inputs: {
    default: {
      config: {
        /* input config fields with JSON Schema types */
      },
      onEvent: async (input) => {
        const { rundeckUrl, apiToken, apiVersion } = input.app.config;
        const { myField } = input.event.inputConfig;

        const client = createRundeckClient({
          rundeckUrl,
          apiToken,
          apiVersion: apiVersion ?? 57,
        });

        const result = await client.get<MyType>("endpoint");
        await events.emit(result);
      },
    },
  },

  outputs: {
    default: {
      name: "Output Name",
      description: "Output description",
      default: true,
      type: {
        /* JSON Schema */
      },
    },
  },
};
```

### suggestValues Pattern

Use `suggestValues` on input config fields to provide dynamic dropdown options fetched from the Rundeck API. The shared `suggestProjects` handler in `utils/suggestProjects.ts` can be reused by any block that needs project selection:

```typescript
import { suggestProjects } from "../utils/suggestProjects.ts";

// In a block's input config:
config: {
  project: {
    name: "Project",
    description: "The Rundeck project",
    type: "string",
    required: true,
    suggestValues: suggestProjects,
  },
},
```

To create new `suggestValues` handlers, follow the same pattern: receive `input` with `app.config` and optional `searchPhrase`, return `{ suggestedValues: [{ label, value }] }`.

### Error Handling Pattern

```typescript
// Block logic - just throw errors, don't wrap in success/failure objects
const result = await someOperation();
await events.emit(result);
```

### Configuration Access

```typescript
const { rundeckUrl, apiToken, apiVersion } = input.app.config;
```

### Schema

- Make sure to properly mark required field as required in the schema (whether config field, or event output).

## Development Workflow

### Local Development

1. **Setup**: `npm install`
2. **Type Check**: `npm run typecheck`
3. **Format**: `npm run format`
4. **Bundle**: `npm run bundle`

### Release Process

1. **Develop**: Make changes and test locally
2. **Commit**: Push to feature branch
3. **Review**: Create PR, wait for CI validation
4. **Release**: Tag with `v1.0.0` format
5. **Deploy**: CI automatically creates release and updates registry

### CI/CD Pipeline

The template includes a complete CI/CD system:

- **Quality Gates**: Type checking, formatting validation
- **Automated Releases**: Tag-triggered GitHub releases
- **Version Registry**: Self-maintaining `versions.json`
- **Branch Protection**: Main branch protected, requires CI

## Best Practices

### Code Organization

- Block implementations in `blocks/` directory
- Shared Rundeck API client and types in `rundeck/` directory
- Shared utilities (e.g., `suggestValues` handlers) in `utils/` directory
- Central block registry in `blocks/index.ts`

### Error Handling

- Let errors bubble up naturally - don't catch and wrap them
- Use descriptive error messages
- The framework will handle error catching and reporting

### Security

- Use `sensitive: true` for sensitive configuration
- Never log sensitive data
- Validate all inputs

### Documentation

- Clear block names and descriptions
- Comprehensive README
- Type annotations for all interfaces

## Extension Guidelines

### Adding New Blocks

1. Create block file in `blocks/` directory (e.g., `blocks/myBlock.ts`)
2. Import and add to `blocks` dictionary in `blocks/index.ts`
3. Export from `blocks/index.ts` for external use
4. Use types from `rundeck/types.ts` — add new types there if needed
5. Use `createRundeckClient` from `rundeck/client.ts` for API calls
6. Use `suggestProjects` from `utils/suggestProjects.ts` if the block needs project selection
7. Use `suggestJobs` from `utils/suggestJobs.ts` if the block needs job selection (requires `block.config.project`)
8. For blocks that poll execution state, use the shared utilities from `utils/executionPoller.ts` (`startTracking`, `pollExecution`, `cleanupStaleTracking`) and terminal state helpers from `utils/executionStates.ts`
9. Use `mapExecution` and `executionSchema` from `utils/mapExecution.ts` for execution output formatting
10. Test with `npm run typecheck`

**Example:**

```typescript
// blocks/myBlock.ts
import { AppBlock, events } from "@slflows/sdk/v1";
import { createRundeckClient } from "../rundeck/client.ts";
import type { MyType } from "../rundeck/types.ts";
import { suggestProjects } from "../utils/suggestProjects.ts";

export const myBlock: AppBlock = {
  /* block definition */
};

// blocks/index.ts
import { myBlock } from "./myBlock.ts";
export const blocks = {
  listJobs,
  listExecutions,
  getExecution,
  runJob,
  subscribeToExecution,
  myBlock, // Add here
} as const;
```

### Adding Rundeck API Types

1. Add new interfaces to `rundeck/types.ts`
2. Import them in block files with `import type { ... } from "../rundeck/types.ts"`

### Adding Configuration

1. Update config schema in `main.ts`
2. Access via `input.app.config.fieldName`
3. For both app and block configs, make sure to use `default:` fields with `required: false`, when applicable, rather than using an optional field and conditionally providing a default value in app handlers.

### Adding Dependencies

1. Add to package.json dependencies
2. Import in relevant files
3. Ensure TypeScript types are available

## Testing the App

The app can be submitted to Flows as a custom app, or added to a registry.

The user can use [flowctl](https://github.com/spacelift-io/flowctl) to create a custom app in their Flows organization, and then a version of the app inside of that. They will more or less have to run:

```
flowctl auth login # Follow the prompts to authenticate
flowctl app create # Follow the prompts to create the app
flowctl version update --entrypoint main.ts --watch # Follow the prompts to create a version in watch mode - this will update the app live as you make changes. Can skip --watch to just do a one-time upload.
```

More details can be found here:

- https://docs.useflows.com/developers/deploying-apps/custom-apps/
- https://docs.useflows.com/developers/deploying-apps/app-registries/
