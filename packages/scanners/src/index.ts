/**
 * @sus/scanners — deterministic anti-slop detector (M3).
 * T0303: rule engine + first rule; T0304: CLI + JSON contract;
 * T0305: suite + precision/recall on the labelled corpus (G10).
 */
export { scanText, type Finding, type ScanResult } from './engine.js';
export { checkSeo, type SeoCheck, type SeoResult } from './seo.js';
