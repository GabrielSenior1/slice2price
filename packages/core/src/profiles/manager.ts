// ============================================================================
// Slice2Price — Gestor de perfiles (CRUD en memoria)
// ============================================================================
// Operaciones: crear, leer, actualizar, duplicar, eliminar.
// La persistencia (JSON / SQLite) se agrega en la etapa 2.
// ============================================================================

import type {
  AnyProfile,
  BaseProfile,
  CreateProfileData,
  UpdateProfileData,
} from './types.js';

export type IdGenerator = () => string;

/**
 * Generador de IDs por defecto usando crypto.randomUUID.
 * Compatible con Node.js 19+ y browsers modernos.
 */
const defaultIdGenerator: IdGenerator = () => crypto.randomUUID();

/**
 * Gestor genérico de perfiles con CRUD completo.
 * Opera en memoria; se puede poblar con datos iniciales y serializar después.
 */
export class ProfileManager<T extends AnyProfile> {
  private profiles: Map<string, T> = new Map();
  private generateId: IdGenerator;

  constructor(initialProfiles: T[] = [], idGenerator?: IdGenerator) {
    this.generateId = idGenerator ?? defaultIdGenerator;
    for (const profile of initialProfiles) {
      this.profiles.set(profile.id, { ...profile });
    }
  }

  // --------------------------------------------------------------------------
  // Lectura
  // --------------------------------------------------------------------------

  /** Obtiene un perfil por su ID. Lanza error si no existe. */
  getById(id: string): T {
    const profile = this.profiles.get(id);
    if (!profile) {
      throw new Error(`Perfil no encontrado: ${id}`);
    }
    return { ...profile };
  }

  /** Obtiene un perfil por ID, o undefined si no existe. */
  findById(id: string): T | undefined {
    const profile = this.profiles.get(id);
    return profile ? { ...profile } : undefined;
  }

  /** Devuelve todos los perfiles como un array. */
  getAll(): T[] {
    return Array.from(this.profiles.values()).map((p) => ({ ...p }));
  }

  /** Número total de perfiles. */
  get count(): number {
    return this.profiles.size;
  }

  /** Valida los campos numéricos y requeridos del perfil (Falla N2) */
  private validateProfileData(data: Record<string, any>): void {
    const d = data;
    if (d.name !== undefined && (typeof d.name !== 'string' || d.name.trim() === '')) {
      throw new Error('El nombre del perfil no puede estar vacío');
    }
    // Impresora
    if (d.powerConsumptionW !== undefined && (!Number.isFinite(d.powerConsumptionW) || d.powerConsumptionW < 0)) {
      throw new Error('El consumo en Watts debe ser un número finito mayor o igual a 0');
    }
    if (d.depreciationPerHour !== undefined && (!Number.isFinite(d.depreciationPerHour) || d.depreciationPerHour < 0)) {
      throw new Error('La depreciación por hora debe ser un número finito mayor o igual a 0');
    }
    // Material
    if (d.pricePerKg !== undefined && (!Number.isFinite(d.pricePerKg) || d.pricePerKg < 0)) {
      throw new Error('El precio por kg debe ser un número finito mayor o igual a 0');
    }
    if (d.density !== undefined && (!Number.isFinite(d.density) || d.density <= 0)) {
      throw new Error('La densidad del material debe ser un número finito mayor a 0');
    }
    // Cliente
    if (d.profitMargin !== undefined && (!Number.isFinite(d.profitMargin) || d.profitMargin < 0)) {
      throw new Error('El margen de ganancia debe ser un número finito mayor o igual a 0');
    }
    if (d.discount !== undefined && (!Number.isFinite(d.discount) || d.discount < 0 || d.discount > 100)) {
      throw new Error('El descuento debe ser un número finito entre 0 y 100');
    }
    if (d.defaultDesignCost !== undefined && (!Number.isFinite(d.defaultDesignCost) || d.defaultDesignCost < 0)) {
      throw new Error('El costo de diseño no puede ser negativo');
    }
    // General
    if (d.pricePerKwh !== undefined && (!Number.isFinite(d.pricePerKwh) || d.pricePerKwh < 0)) {
      throw new Error('El precio por kWh debe ser un número finito mayor o igual a 0');
    }
    if (d.errorMargin !== undefined && (!Number.isFinite(d.errorMargin) || d.errorMargin < 0)) {
      throw new Error('El margen de error no puede ser negativo');
    }
    if (d.failureRisk !== undefined && (!Number.isFinite(d.failureRisk) || d.failureRisk < 0)) {
      throw new Error('El riesgo de fallo no puede ser negativo');
    }
  }

  // --------------------------------------------------------------------------
  // Escritura
  // --------------------------------------------------------------------------

  /** Crea un perfil nuevo con ID y timestamps automáticos. */
  create(data: CreateProfileData<T>): T {
    this.validateProfileData(data);
    const now = new Date().toISOString();
    const profile = {
      ...data,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    } as T;

    this.profiles.set(profile.id, profile);
    return { ...profile };
  }

  /** Actualiza campos de un perfil existente. */
  update(id: string, changes: UpdateProfileData<T>): T {
    const existing = this.profiles.get(id);
    if (!existing) {
      throw new Error(`Perfil no encontrado: ${id}`);
    }
    this.validateProfileData(changes);

    const updated = {
      ...existing,
      ...changes,
      id: existing.id,              // no se puede cambiar
      type: existing.type,          // no se puede cambiar
      createdAt: existing.createdAt, // no se puede cambiar
      updatedAt: new Date().toISOString(),
    } as T;

    this.profiles.set(id, updated);
    return { ...updated };
  }

  /** Elimina un perfil. Lanza error si no existe. */
  delete(id: string): void {
    if (!this.profiles.has(id)) {
      throw new Error(`Perfil no encontrado: ${id}`);
    }
    this.profiles.delete(id);
  }

  /** Duplica un perfil con un nuevo ID y nombre modificado. */
  duplicate(id: string, newName?: string): T {
    const original = this.getById(id);
    const now = new Date().toISOString();

    const duplicated = {
      ...original,
      id: this.generateId(),
      name: newName ?? `${original.name} (copia)`,
      createdAt: now,
      updatedAt: now,
    } as T;

    this.profiles.set(duplicated.id, duplicated);
    return { ...duplicated };
  }

  // --------------------------------------------------------------------------
  // Serialización (para futura persistencia)
  // --------------------------------------------------------------------------

  /** Exporta todos los perfiles como array serializable a JSON. */
  toJSON(): T[] {
    return this.getAll();
  }

  /** Reemplaza todos los perfiles con datos cargados desde JSON. */
  loadFromJSON(data: T[]): void {
    this.profiles.clear();
    for (const profile of data) {
      this.profiles.set(profile.id, { ...profile });
    }
  }
}
