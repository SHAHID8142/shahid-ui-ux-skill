/** Types for the live-document drift checks (T1026). */

export interface DriftTask {
  id: string;
  status: string;
  m?: string;
}

export interface CompatibilityRow {
  host: string;
  evidenceState: string;
  evidence: unknown;
}

export interface DocDriftInput {
  tasks: DriftTask[];
  files: Record<string, string>;
  compatibility?: { rows: CompatibilityRow[] };
  expectedBuildCompletePushed?: boolean;
}

export interface DriftFinding {
  rule: string;
  path: string;
  detail: string;
}

export const HISTORICAL_DOCUMENTS: string[];
export const LIVE_DOCUMENTS: string[];

export function checkDocDrift(input: DocDriftInput): DriftFinding[];
export function formatDocDrift(findings: DriftFinding[]): string;
