/**
 * @sus/adapters — per-host + per-framework adapters with honest support
 * tiers (M9). T0202: deterministic intent router (CLI/no-model path).
 */
export { routeIntent, fallbackIntent } from './router.js';
export {
  loadModules,
  moduleRegistry,
  DEFAULT_LOAD_BUDGET,
  type LoadReport,
  type LoadedModule,
  type ModuleDescriptor,
} from './jit-loader.js';
export {
  resolvePrecedence,
  FIXED_RULES,
  type Instruction,
  type PrecedenceResult,
  type PrecedenceConflict,
  type LayerSource,
} from './precedence.js';
export { CAPABILITY_MATRIX, capabilitiesText, main as cliMain } from './cli.js';
export {
  type HostAdapter,
  type HostCapabilities,
  type SupportTier,
  supportTier,
  generateSupportMatrix,
} from './adapter-interface.js';
