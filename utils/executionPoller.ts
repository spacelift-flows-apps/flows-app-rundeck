import { events, kv, timers } from "@slflows/sdk/v1";
import type { RundeckClient } from "../rundeck/client.ts";
import type { RundeckExecution } from "../rundeck/types.ts";
import { mapExecution } from "./mapExecution.ts";
import { isTerminalStatus } from "./executionStatuses.ts";

export interface TrackingState {
  executionId: number;
  pendingEventId: string;
  lastStatus: string;
  parentEventId: string;
  createdAt: number;
  errorCount: number;
}

export async function startTracking(options: {
  exec: RundeckExecution;
  parentEventId: string;
  outputKey: string;
  pollInterval: number;
}) {
  const { exec, parentEventId, outputKey, pollInterval } = options;
  const mapped = mapExecution(exec);

  // If the execution is already in a terminal status, emit immediately and skip polling.
  if (isTerminalStatus(exec.status)) {
    await events.emit(mapped, { outputKey, parentEventId });
    return;
  }

  const trackingKey = `tracking:${parentEventId}`;

  const pendingEventId = await events.createPending({
    event: mapped,
    outputKey,
    statusDescription: `Execution ${exec.id} is ${exec.status}`,
  });

  await kv.block.set({
    key: trackingKey,
    value: {
      executionId: exec.id,
      pendingEventId,
      lastStatus: exec.status,
      parentEventId,
      createdAt: Date.now(),
      errorCount: 0,
    } satisfies TrackingState,
  });

  await timers.set(pollInterval, {
    inputPayload: trackingKey,
    pendingEventId,
    description: `Polling execution ${exec.id}`,
  });
}

export async function pollExecution(
  trackingKey: string,
  pendingEventId: string,
  options: {
    client: RundeckClient;
    pollInterval: number;
    maxRetries: number;
    outputKey: string;
  },
) {
  const { client, pollInterval, maxRetries, outputKey } = options;

  const { value: tracking } = await kv.block.get(trackingKey);
  if (!tracking) return;

  try {
    const exec = await client.get<RundeckExecution>(
      `execution/${tracking.executionId}`,
    );
    const mapped = mapExecution(exec);

    if (exec.status !== tracking.lastStatus) {
      await kv.block.set({
        key: trackingKey,
        value: { ...tracking, lastStatus: exec.status, errorCount: 0 },
      });

      if (isTerminalStatus(exec.status)) {
        await events.emit(mapped, {
          outputKey,
          complete: pendingEventId,
          parentEventId: tracking.parentEventId,
        });
        await kv.block.delete([trackingKey]);
        return;
      }

      await events.emit(mapped, {
        outputKey,
        parentEventId: tracking.parentEventId,
      });

      await events.updatePending(pendingEventId, {
        event: mapped,
        statusDescription: `Execution ${tracking.executionId} is ${exec.status}`,
      });
    }

    await timers.set(pollInterval, {
      inputPayload: trackingKey,
      pendingEventId,
      description: `Polling execution ${tracking.executionId}`,
    });
  } catch (error) {
    const errorCount = (tracking.errorCount ?? 0) + 1;
    console.error(
      `Error polling execution ${tracking.executionId} (attempt ${errorCount}/${maxRetries}):`,
      error,
    );

    if (errorCount >= maxRetries) {
      await events.cancelPending(
        pendingEventId,
        `Polling failed after ${maxRetries} consecutive attempts`,
      );
      await kv.block.delete([trackingKey]);
      return;
    }

    await kv.block.set({
      key: trackingKey,
      value: { ...tracking, errorCount },
    });

    await events.updatePending(pendingEventId, {
      statusDescription: `Error polling execution ${tracking.executionId}, retrying (${errorCount}/${maxRetries})...`,
    });

    await timers.set(pollInterval, {
      inputPayload: trackingKey,
      pendingEventId,
      description: `Retrying poll for execution ${tracking.executionId}`,
    });
  }
}

export async function cleanupStaleTracking() {
  const staleThreshold = Date.now() - 24 * 60 * 60 * 1000;
  let startingKey: string | undefined;

  do {
    const result = await kv.block.list({
      keyPrefix: "tracking:",
      startingKey,
    });

    for (const pair of result.pairs) {
      if (pair.value?.createdAt < staleThreshold) {
        await events.cancelPending(
          pair.value.pendingEventId,
          "Execution tracking timed out after 24 hours",
        );
        await kv.block.delete([pair.key]);
      }
    }

    startingKey = result.nextStartingKey;
  } while (startingKey);
}
