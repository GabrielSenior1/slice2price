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

  // --------------------------------------------------------------------------
  // Escritura
  // --------------------------------------------------------------------------

  /** Crea un perfil nuevo con ID y timestamps automáticos. */
  create(data: CreateProfileData<T>): T {
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
