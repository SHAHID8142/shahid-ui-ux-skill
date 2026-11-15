/** Types for the build-artifact guard (T1010). */

export const REQUIRED_ARTIFACTS: string[];

export function missingBuildArtifacts(input: {
  artifacts?: string[];
  exists: (artifact: string) => boolean;
}): string[];

export function buildHint(missing: string[]): string;
