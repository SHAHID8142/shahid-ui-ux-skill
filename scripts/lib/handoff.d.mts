/** Types for the handoff-consistency checks (Issue #12). */
export interface TaskCounts {
  done: number;
  pending: number;
  review: number;
  blocked: number;
  total: number;
}

export interface HandoffViolation {
  code: string;
  detail: string;
}

export interface HandoffResult {
  ok: boolean;
  counts: TaskCounts;
  stateCount: { done: number; total: number } | null;
  violations: HandoffViolation[];
}

export function parseStateDoneCount(stateText: string): { done: number; total: number } | null;
export function countTasks(tasksDoc: unknown): TaskCounts;
export function checkHandoff(input: {
  tasksDoc: unknown;
  stateText: string;
  repoPublic?: boolean;
}): HandoffResult;
export function activeVisibilityClaims(input: {
  files: Array<{ file: string; text: string }>;
  patterns?: RegExp[];
}): Array<{ file: string; text: string }>;
