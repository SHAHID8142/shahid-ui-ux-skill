/**
 * @sus/scanners — deterministic anti-slop detector (M3).
 * T0303: rule engine + first rule; T0304: CLI + JSON contract;
 * T0305: suite + precision/recall on the labelled corpus (G10).
 * T1016: optional offline-first research-source adapter (see docs/RESEARCH_SOURCES.md).
 */
export { scanText, type Finding, type ScanResult } from './engine.js';
export { checkSeo, type SeoCheck, type SeoResult } from './seo.js';
export {
  checkResponsiveTable,
  type ResponsiveTableCheck,
  type ResponsiveTableResult,
  type ResponsiveTableSource,
} from './responsive-table.js';
export {
  RESEARCH_MAX_CALLS_PER_RUN,
  RESEARCH_MAX_EXCERPT_CHARS,
  RESEARCH_MAX_HITS_PER_QUERY,
  RESEARCH_MAX_QUERY_WORDS,
  RESEARCH_MIN_QUERY_WORDS,
  RESEARCH_SUPPORTED_LICENSE,
  createResearchProvider,
  parseResearchQuery,
  researchOnlineByEnv,
  type ResearchGuidePin,
  type ResearchHit,
  type ResearchLookup,
  type ResearchLookupHit,
  type ResearchLookupOutcome,
  type ResearchPinVerification,
  type ResearchProvider,
  type ResearchProviderOptions,
  type ResearchProviderResult,
  type ResearchQuery,
  type ResearchQueryParse,
  type ResearchSourcePin,
  type ResearchUnavailableReason,
} from './research-provider.js';
