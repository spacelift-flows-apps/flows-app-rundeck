export type TerminalStatus =
  | "succeeded"
  | "failed"
  | "failed-with-retry"
  | "aborted"
  | "timedout";

export const terminalStatuses: Record<TerminalStatus, true> = {
  succeeded: true,
  failed: true,
  "failed-with-retry": true,
  aborted: true,
  timedout: true,
};

export function isTerminalStatus(status: string): status is TerminalStatus {
  return status in terminalStatuses;
}
