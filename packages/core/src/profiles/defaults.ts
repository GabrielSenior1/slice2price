// ============================================================================
// Slice2Price — Perfiles por defecto
// ============================================================================
// Valores iniciales editables. Consumos y depreciaciones son estimaciones
// típicas; el usuario debe ajustarlos a su caso real.
// ============================================================================

import type {
  PrinterProfile,
  MaterialProfile,
  ClientProfile,
  GeneralProfile,
} from './types.js';

// Timestamp fijo para defaults (se sobrescribe al editar)
const NOW = '2024-01-01T00:00:00.000Z';

// ----------------------------------------------------------------------------
// Impresoras
// ----------------------------------------------------------------------------
export const DEFAULT_PRINTERS: PrinterProfile[] = [
  {
    id: 'printer-flashforge-creator5',
    type: 'printer',
    name: 'FlashForge Creator 5',
    model: 'FlashForge Creator 5',
    powerConsumptionW: 400,
    depreciationPerHour: 1300,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'printer-ender3-pro',
    type: 'printer',
    name: 'Creality Ender 3 Pro',
    model: 'Ender 3 Pro',
    powerConsumptionW: 270,
    depreciationPerHour: 500,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'printer-bambu-a1-mini',
    type: 'printer',
    name: 'Bambu Lab A1 Mini',
    model: 'A1 Mini',
    powerConsumptionW: 120,
    depreciationPerHour: 350,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'printer-bambu-a1',
    type: 'printer',
    name: 'Bambu Lab A1',
    model: 'A1',
    powerConsumptionW: 150,
    depreciationPerHour: 450,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'printer-bambu-p1s',
    type: 'printer',
    name: 'Bambu Lab P1S',
    model: 'P1S',
    powerConsumptionW: 220,
    depreciationPerHour: 900,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'printer-bambu-x1c',
    type: 'printer',
    name: 'Bambu Lab X1 Carbon',
    model: 'X1 Carbon',
    powerConsumptionW: 220,
    depreciationPerHour: 1200,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'printer-prusa-mk4s',
    type: 'printer',
    name: 'Prusa MK4S',
    model: 'MK4S',
    powerConsumptionW: 150,
    depreciationPerHour: 700,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'printer-ender3-v3',
    type: 'printer',
    name: 'Creality Ender 3 V3',
    model: 'Ender 3 V3',
    powerConsumptionW: 270,
    depreciationPerHour: 400,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'printer-artillery-x2',
    type: 'printer',
    name: 'Artillery Sidewinder X2',
    model: 'Sidewinder X2',
    powerConsumptionW: 350,
    depreciationPerHour: 500,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'printer-anycubic-kobra3',
    type: 'printer',
    name: 'Anycubic Kobra 3',
    model: 'Kobra 3',
    powerConsumptionW: 150,
    depreciationPerHour: 350,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

// ----------------------------------------------------------------------------
// Materiales
// ----------------------------------------------------------------------------
export const DEFAULT_MATERIALS: MaterialProfile[] = [
  {
    id: 'material-pla',
    type: 'material',
    name: 'PLA',
    pricePerKg: 65000,
    density: 1.24,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'material-petg',
    type: 'material',
    name: 'PETG',
    pricePerKg: 75000,
    density: 1.27,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'material-abs',
    type: 'material',
    name: 'ABS',
    pricePerKg: 70000,
    density: 1.04,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'material-tpu',
    type: 'material',
    name: 'TPU',
    pricePerKg: 90000,
    density: 1.21,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'material-asa',
    type: 'material',
    name: 'ASA',
    pricePerKg: 85000,
    density: 1.07,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

// ----------------------------------------------------------------------------
// Clientes / Tarifas
// ----------------------------------------------------------------------------
export const DEFAULT_CLIENTS: ClientProfile[] = [
  {
    id: 'client-personal',
    type: 'client',
    name: 'Personal (sin ganancia)',
    profitMargin: 0,
    discount: 0,
    defaultDesignCost: 0,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'client-regular',
    type: 'client',
    name: 'Cliente regular',
    profitMargin: 40,
    discount: 0,
    defaultDesignCost: 5000,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'client-mayorista',
    type: 'client',
    name: 'Mayorista',
    profitMargin: 30,
    discount: 10,
    defaultDesignCost: 0,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'client-premium',
    type: 'client',
    name: 'Premium',
    profitMargin: 60,
    discount: 0,
    defaultDesignCost: 10000,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

// ----------------------------------------------------------------------------
// General
// ----------------------------------------------------------------------------
export const DEFAULT_GENERALS: GeneralProfile[] = [
  {
    id: 'general-estrato1',
    type: 'general',
    name: 'Residencial — Estrato 1 ($350/kWh subsidio CREG)',
    pricePerKwh: 350,
    errorMargin: 5,
    failureRisk: 3,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'general-estrato2',
    type: 'general',
    name: 'Residencial — Estrato 2 ($440/kWh subsidio CREG)',
    pricePerKwh: 440,
    errorMargin: 5,
    failureRisk: 3,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'general-estrato3',
    type: 'general',
    name: 'Residencial — Estrato 3 ($750/kWh)',
    pricePerKwh: 750,
    errorMargin: 5,
    failureRisk: 3,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'general-default',
    type: 'general',
    name: 'Nacional Base — Estrato 4 ($880/kWh)',
    pricePerKwh: 880,
    errorMargin: 5,
    failureRisk: 3,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'general-comercial',
    type: 'general',
    name: 'Comercial / Taller (+20% sobretasa $1.056/kWh)',
    pricePerKwh: 1056,
    errorMargin: 6,
    failureRisk: 4,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'general-estrato56',
    type: 'general',
    name: 'Residencial — Estrato 5-6 ($1.080/kWh)',
    pricePerKwh: 1080,
    errorMargin: 5,
    failureRisk: 3,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'general-costa',
    type: 'general',
    name: 'Costa Caribe — Afinia/Air-e ($1.200/kWh)',
    pricePerKwh: 1200,
    errorMargin: 8,
    failureRisk: 5,
    createdAt: NOW,
    updatedAt: NOW,
  },
];
