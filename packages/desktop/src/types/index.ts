import type { CostBreakdown, SliceResult } from '@slice2price/core';

export interface SavedQuote {
  id: string;
  pieceName: string;
  timestamp: string;
  printTimeHours: number;
  filamentGrams: number;
  extraCosts: number;
  quantity: number;
  profiles: {
    printerName: string;
    materialName: string;
    clientName: string;
    printerId: string;
    materialId: string;
    clientId: string;
    generalId: string;
  };
  breakdown: CostBreakdown;
  customProfitMargin?: number;
  customDiscount?: number;
}

export type ActiveTab = 'cotizador' | 'perfiles' | 'historial' | 'vigilante' | 'ajustes';

export interface SlicerDetectedInfo {
  id: string;
  name: string;
  icon: string;
  path: string;
  description: string;
  detected: boolean;
}

export interface SlicerEventPayload {
  sliceResult: SliceResult;
  filePath: string;
  fileName: string;
  timestamp: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  message: string;
  type: ToastType;
}

export interface ElectronAPI {
  isElectron?: boolean;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  getVersion: () => Promise<string>;
  openExternalUrl: (url: string) => Promise<boolean>;
  getDetectedSlicers: () => Promise<SlicerDetectedInfo[]>;
  getWatcherStatus: () => Promise<{ enabled: boolean; watchedPaths: string[] }>;
  setWatcherEnabled: (enabled: boolean) => Promise<boolean>;
  startWatcher: (paths: string[]) => Promise<{ enabled: boolean; watchedPaths: string[] }>;
  stopWatcher: () => Promise<{ enabled: boolean; watchedPaths: string[] }>;
  selectFolder: () => Promise<string | null>;
  selectFile: () => Promise<string | null>;
  parseFilePath: (filePath: string, options?: { density?: number; diameter?: number }) => Promise<SliceResult | null>;
  setActiveMaterialDensity: (density: number) => Promise<boolean>;
  toggleDevTools?: () => Promise<boolean>;
  toggleCompactMode: (forceState?: boolean) => Promise<boolean>;
  isCompactMode: () => Promise<boolean>;
  onCompactModeChanged: (callback: (isCompact: boolean) => void) => () => void;
  onSlicerEvent: (callback: (payload: SlicerEventPayload) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

