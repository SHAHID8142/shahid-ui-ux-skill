/** Types for the roadmap-consistency checks (T1009). */

export interface MilestoneScope {
  id: string;
  scope: string;
}

export interface MilestoneSummary {
  id: string;
  done: number;
  total: number;
  pending: string[];
}

export interface RoadmapViolation {
  code: string;
  detail: string;
}

export interface RoadmapRow {
  id: string;
  tasks: string;
  status: string;
}

export interface RoadmapResult {
  ok: boolean;
  rows: number;
  milestones: number;
  violations: RoadmapViolation[];
}

export const MILESTONES: MilestoneScope[];
export const TABLE_START: string;
export const TABLE_END: string;

export function milestoneIds(): string[];
export function summariseMilestones(tasksDoc: unknown): MilestoneSummary[];
export function statusCell(summary: MilestoneSummary): string;
export function tasksCell(tasksDoc: unknown): (id: string) => string;
export function renderRoadmapTable(tasksDoc: unknown): string[];
export function renderRoadmapBlock(tasksDoc: unknown): string;
export function parseRoadmapTable(roadmapText: string): RoadmapRow[];
export const COUNT_CLAIM_FILES: string[];
export function parseCountClaims(text: string): Array<{ done: number; total: number }>;
export function checkCountClaims(input: {
  tasksDoc: unknown;
  files: Array<{ file: string; text: string }>;
}): RoadmapViolation[];
export function checkRoadmap(input: {
  tasksDoc: unknown;
  roadmapText: string;
  countClaimFiles?: Array<{ file: string; text: string }>;
}): RoadmapResult;
export function withGeneratedTable(roadmapText: string, tasksDoc: unknown): string;
