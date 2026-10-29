// ============================================================================
// Slice2Price — Barrel export
// ============================================================================

// Cálculo
export { calculateCost, calculateFromProfiles, paramsFromProfiles } from './calc/engine.js';
export type { CalcParams, PieceInput, CostBreakdown } from './calc/engine.js';

// Perfiles — tipos
export type {
  BaseProfile,
  PrinterProfile,
  MaterialProfile,
  ClientProfile,
  GeneralProfile,
  AnyProfile,
  ProfileType,
  ProfileCombination,
  CreateProfileData,
  UpdateProfileData,
} from './profiles/types.js';

// Perfiles — manager y defaults
export { ProfileManager } from './profiles/manager.js';
export type { IdGenerator } from './profiles/manager.js';
export {
  DEFAULT_PRINTERS,
  DEFAULT_MATERIALS,
  DEFAULT_CLIENTS,
  DEFAULT_GENERALS,
} from './profiles/defaults.js';

// Parsers — tipos, clases y función universal
export type { SliceResult, SlicerParser } from './parsers/types.js';
export { volumeToGrams, filamentLengthToGrams } from './parsers/types.js';
export { OrcaSlicerParser, parseTimeString } from './parsers/orca.js';
export { CuraParser } from './parsers/cura.js';
export { PrusaParser } from './parsers/prusa.js';
export { CrealityParser } from './parsers/creality.js';
export { parseSlicerFile, KNOWN_PARSERS } from './parsers/universal.js';

// Formato
export { formatCOP, formatNumber, formatPercent } from './format/currency.js';
