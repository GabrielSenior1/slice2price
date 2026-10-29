// ============================================================================
// Slice2Price — Tipos de perfiles
// ============================================================================

/** Campos comunes a todos los perfiles */
export interface BaseProfile {
  id: string;
  name: string;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
}

// ----------------------------------------------------------------------------
// Perfil de Impresora
// ----------------------------------------------------------------------------
export interface PrinterProfile extends BaseProfile {
  type: 'printer';
  /** Modelo comercial (ej: "Ender 3 Pro") */
  model: string;
  /** Consumo eléctrico promedio en Watts */
  powerConsumptionW: number;
  /** Depreciación por hora de uso (COP/h) */
  depreciationPerHour: number;
}

// ----------------------------------------------------------------------------
// Perfil de Material
// ----------------------------------------------------------------------------
export interface MaterialProfile extends BaseProfile {
  type: 'material';
  /** Precio por kilogramo en COP */
  pricePerKg: number;
  /** Densidad del material en g/cm³ (para convertir volumen → gramos) */
  density: number;
}

// ----------------------------------------------------------------------------
// Perfil de Cliente / Tarifa
// ----------------------------------------------------------------------------
export interface ClientProfile extends BaseProfile {
  type: 'client';
  /** Margen de ganancia (%) */
  profitMargin: number;
  /** Descuento aplicado al precio final (%) */
  discount: number;
  /** Costo de diseño por defecto en COP */
  defaultDesignCost: number;
}

// ----------------------------------------------------------------------------
// Perfil General
// ----------------------------------------------------------------------------
export interface GeneralProfile extends BaseProfile {
  type: 'general';
  /** Precio del kWh en COP */
  pricePerKwh: number;
  /** Margen de error (%) */
  errorMargin: number;
  /** Riesgo de fallo de impresión (%) */
  failureRisk: number;
}

// ----------------------------------------------------------------------------
// Unión de todos los perfiles
// ----------------------------------------------------------------------------
export type AnyProfile = PrinterProfile | MaterialProfile | ClientProfile | GeneralProfile;
export type ProfileType = AnyProfile['type'];

// ----------------------------------------------------------------------------
// Combinación de perfiles para una cotización
// ----------------------------------------------------------------------------
export interface ProfileCombination {
  printer: PrinterProfile;
  material: MaterialProfile;
  client: ClientProfile;
  general: GeneralProfile;
}

// ----------------------------------------------------------------------------
// Datos de entrada para crear/editar un perfil (sin id ni timestamps)
// ----------------------------------------------------------------------------
export type CreateProfileData<T extends AnyProfile> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProfileData<T extends AnyProfile> = Partial<Omit<T, 'id' | 'type' | 'createdAt' | 'updatedAt'>>;
