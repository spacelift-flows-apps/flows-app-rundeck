# Rundeck Integration for Flows

A [Flows](https://useflows.com) app that integrates with [Rundeck](https://www.rundeck.com/) for managing jobs and executions.

## Blocks

- **List Project Jobs** - List jobs in a project, with optional name/group filters
- **List Project Executions** - List executions in a project, with status filter and pagination
- **Get Execution** - Get details of a single execution by ID
- **Run Job** - Trigger a Rundeck job and optionally track its execution state changes until completion
- **Subscribe to Execution** - Subscribe to a Rundeck execution by ID and track its state changes until completion

## Configuration

| Field       | Type   | Required | Description               |
| ----------- | ------ | -------- | ------------------------- |
| Rundeck URL | string | yes      | Your Rundeck instance URL |
| API Token   | secret | yes      | Rundeck API token         |
| API Version | number | no       | API version (default: 57) |

## Development

```bash
npm install
npm run typecheck
npm run format
```

## Deploying

```bash
flowctl auth login
flowctl app create
flowctl version update --entrypoint main.ts --watch
```

See the [custom apps docs](https://docs.useflows.com/developers/deploying-apps/custom-apps/) for more details.
