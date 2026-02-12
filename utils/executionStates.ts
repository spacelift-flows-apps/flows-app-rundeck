export type TerminalState =
  | "succeeded"
  | "failed"
  | "failed-with-retry"
  | "aborted"
  | "timedout";

export const terminalStates: Record<TerminalState, true> = {
  succeeded: true,
  failed: true,
  "failed-with-retry": true,
  aborted: true,
  timedout: true,
};

export function isTerminalState(status: string): status is TerminalState {
  return status in terminalStates;
}
