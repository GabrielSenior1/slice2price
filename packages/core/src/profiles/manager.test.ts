// ============================================================================
// Slice2Price — Pruebas unitarias del gestor de perfiles
// ============================================================================

import { describe, it, expect } from 'vitest';
import { ProfileManager } from './manager.js';
import type { PrinterProfile, MaterialProfile } from './types.js';
import { DEFAULT_PRINTERS, DEFAULT_MATERIALS } from './defaults.js';

// Generador de IDs predecible para las pruebas
let idCounter = 0;
const testIdGenerator = () => `test-id-${++idCounter}`;

describe('ProfileManager', () => {
  // Resetear contador antes de cada describe
  beforeEach(() => {
    idCounter = 0;
  });

  // --------------------------------------------------------------------------
  // Inicialización
  // --------------------------------------------------------------------------
  describe('inicialización', () => {
    it('se crea vacío por defecto', () => {
      const manager = new ProfileManager<PrinterProfile>();
      expect(manager.count).toBe(0);
      expect(manager.getAll()).toEqual([]);
    });

    it('se crea con perfiles iniciales', () => {
      const manager = new ProfileManager<PrinterProfile>(DEFAULT_PRINTERS);
      expect(manager.count).toBe(DEFAULT_PRINTERS.length);
    });

    it('los defaults incluyen la FlashForge Creator 5', () => {
      const manager = new ProfileManager<PrinterProfile>(DEFAULT_PRINTERS);
      const creator5 = manager.getById('printer-flashforge-creator5');
      expect(creator5.model).toBe('FlashForge Creator 5');
      expect(creator5.powerConsumptionW).toBe(400);
    });

    it('los defaults incluyen la Ender 3 Pro', () => {
      const manager = new ProfileManager<PrinterProfile>(DEFAULT_PRINTERS);
      const ender = manager.getById('printer-ender3-pro');
      expect(ender.model).toBe('Ender 3 Pro');
      expect(ender.powerConsumptionW).toBe(270);
    });
  });

  // --------------------------------------------------------------------------
  // Crear (Create)
  // --------------------------------------------------------------------------
  describe('create', () => {
    it('crea un perfil con ID y timestamps automáticos', () => {
      const manager = new ProfileManager<PrinterProfile>([], testIdGenerator);
      const profile = manager.create({
        type: 'printer',
        name: 'Mi Impresora',
        model: 'Custom Printer',
        powerConsumptionW: 300,
        depreciationPerHour: 400,
      });

      expect(profile.id).toBe('test-id-1');
      expect(profile.name).toBe('Mi Impresora');
      expect(profile.model).toBe('Custom Printer');
      expect(profile.createdAt).toBeDefined();
      expect(profile.updatedAt).toBeDefined();
      expect(manager.count).toBe(1);
    });

    it('puede crear múltiples perfiles', () => {
      const manager = new ProfileManager<MaterialProfile>([], testIdGenerator);
      manager.create({ type: 'material', name: 'PLA Rojo', pricePerKg: 70000, density: 1.24 });
      manager.create({ type: 'material', name: 'PETG Azul', pricePerKg: 80000, density: 1.27 });
      expect(manager.count).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // Leer (Read)
  // --------------------------------------------------------------------------
  describe('getById / findById', () => {
    it('getById devuelve el perfil correcto', () => {
      const manager = new ProfileManager<PrinterProfile>(DEFAULT_PRINTERS);
      const printer = manager.getById('printer-bambu-a1-mini');
      expect(printer.name).toBe('Bambu Lab A1 Mini');
    });

    it('getById lanza error si no existe', () => {
      const manager = new ProfileManager<PrinterProfile>();
      expect(() => manager.getById('no-existe')).toThrow('Perfil no encontrado');
    });

    it('findById devuelve undefined si no existe', () => {
      const manager = new ProfileManager<PrinterProfile>();
      expect(manager.findById('no-existe')).toBeUndefined();
    });

    it('devuelve copias, no referencias al objeto interno', () => {
      const manager = new ProfileManager<PrinterProfile>(DEFAULT_PRINTERS);
      const a = manager.getById('printer-ender3-pro');
      const b = manager.getById('printer-ender3-pro');
      expect(a).toEqual(b);
      expect(a).not.toBe(b); // objetos distintos
    });
  });

  // --------------------------------------------------------------------------
  // Actualizar (Update)
  // --------------------------------------------------------------------------
  describe('update', () => {
    it('actualiza campos específicos sin cambiar id ni tipo', () => {
      const manager = new ProfileManager<PrinterProfile>(DEFAULT_PRINTERS);
      const updated = manager.update('printer-ender3-pro', {
        name: 'Mi Ender 3 Pro',
        powerConsumptionW: 280,
      });

      expect(updated.id).toBe('printer-ender3-pro');
      expect(updated.type).toBe('printer');
      expect(updated.name).toBe('Mi Ender 3 Pro');
      expect(updated.powerConsumptionW).toBe(280);
      // El modelo no cambió
      expect(updated.model).toBe('Ender 3 Pro');
    });

    it('actualiza el timestamp updatedAt', () => {
      const manager = new ProfileManager<PrinterProfile>(DEFAULT_PRINTERS);
      const before = manager.getById('printer-ender3-pro');
      const updated = manager.update('printer-ender3-pro', { name: 'Editado' });

      expect(updated.updatedAt).not.toBe(before.updatedAt);
      expect(updated.createdAt).toBe(before.createdAt); // createdAt no cambia
    });

    it('lanza error si el perfil no existe', () => {
      const manager = new ProfileManager<PrinterProfile>();
      expect(() => manager.update('no-existe', { name: 'test' })).toThrow('Perfil no encontrado');
    });
  });

  // --------------------------------------------------------------------------
  // Eliminar (Delete)
  // --------------------------------------------------------------------------
  describe('delete', () => {
    it('elimina un perfil existente', () => {
      const manager = new ProfileManager<PrinterProfile>(DEFAULT_PRINTERS);
      const countBefore = manager.count;
      manager.delete('printer-ender3-pro');
      expect(manager.count).toBe(countBefore - 1);
      expect(manager.findById('printer-ender3-pro')).toBeUndefined();
    });

    it('lanza error si el perfil no existe', () => {
      const manager = new ProfileManager<PrinterProfile>();
      expect(() => manager.delete('no-existe')).toThrow('Perfil no encontrado');
    });
  });

  // --------------------------------------------------------------------------
  // Duplicar (Duplicate)
  // --------------------------------------------------------------------------
  describe('duplicate', () => {
    it('crea una copia con nuevo ID y nombre "(copia)"', () => {
      const manager = new ProfileManager<PrinterProfile>(DEFAULT_PRINTERS, testIdGenerator);
      const original = manager.getById('printer-ender3-pro');
      const copy = manager.duplicate('printer-ender3-pro');

      expect(copy.id).not.toBe(original.id);
      expect(copy.name).toBe('Creality Ender 3 Pro (copia)');
      expect(copy.model).toBe(original.model);
      expect(copy.powerConsumptionW).toBe(original.powerConsumptionW);
      expect(manager.count).toBe(DEFAULT_PRINTERS.length + 1);
    });

    it('permite especificar un nombre personalizado', () => {
      const manager = new ProfileManager<PrinterProfile>(DEFAULT_PRINTERS, testIdGenerator);
      const copy = manager.duplicate('printer-ender3-pro', 'Ender del taller');

      expect(copy.name).toBe('Ender del taller');
    });

    it('lanza error si el perfil original no existe', () => {
      const manager = new ProfileManager<PrinterProfile>();
      expect(() => manager.duplicate('no-existe')).toThrow('Perfil no encontrado');
    });
  });

  // --------------------------------------------------------------------------
  // Serialización
  // --------------------------------------------------------------------------
  describe('serialización', () => {
    it('toJSON exporta todos los perfiles', () => {
      const manager = new ProfileManager<MaterialProfile>(DEFAULT_MATERIALS);
      const json = manager.toJSON();
      expect(json).toHaveLength(DEFAULT_MATERIALS.length);
      expect(json[0].name).toBe(DEFAULT_MATERIALS[0].name);
    });

    it('loadFromJSON reemplaza todos los perfiles', () => {
      const manager = new ProfileManager<MaterialProfile>(DEFAULT_MATERIALS);
      const customData: MaterialProfile[] = [
        {
          id: 'custom-1', type: 'material', name: 'Nylon',
          pricePerKg: 120000, density: 1.14,
          createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      manager.loadFromJSON(customData);
      expect(manager.count).toBe(1);
      expect(manager.getById('custom-1').name).toBe('Nylon');
    });
  });
});
