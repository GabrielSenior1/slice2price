import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  ProfileManager,
  DEFAULT_PRINTERS,
  DEFAULT_MATERIALS,
  DEFAULT_CLIENTS,
  DEFAULT_GENERALS,
  type PrinterProfile,
  type MaterialProfile,
  type ClientProfile,
  type GeneralProfile,
} from '@slice2price/core';
import type { SavedQuote, ActiveTab } from '../types/index.js';

interface AppContextValue {
  // Tabs
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Perfiles
  printers: PrinterProfile[];
  materials: MaterialProfile[];
  clients: ClientProfile[];
  generals: GeneralProfile[];

  // Selección actual
  selectedPrinter: PrinterProfile;
  selectedMaterial: MaterialProfile;
  selectedClient: ClientProfile;
  selectedGeneral: GeneralProfile;
  setSelectedPrinterId: (id: string) => void;
  setSelectedMaterialId: (id: string) => void;
  setSelectedClientId: (id: string) => void;
  setSelectedGeneralId: (id: string) => void;

  // Gestión de perfiles
  addPrinter: (data: Omit<PrinterProfile, 'id' | 'type' | 'createdAt' | 'updatedAt'>) => void;
  updatePrinter: (id: string, data: Partial<PrinterProfile>) => void;
  deletePrinter: (id: string) => void;

  addMaterial: (data: Omit<MaterialProfile, 'id' | 'type' | 'createdAt' | 'updatedAt'>) => void;
  updateMaterial: (id: string, data: Partial<MaterialProfile>) => void;
  deleteMaterial: (id: string) => void;

  addClient: (data: Omit<ClientProfile, 'id' | 'type' | 'createdAt' | 'updatedAt'>) => void;
  updateClient: (id: string, data: Partial<ClientProfile>) => void;
  deleteClient: (id: string) => void;

  updateGeneral: (id: string, data: Partial<GeneralProfile>) => void;
  resetToDefaults: () => void;
  importBackupData: (jsonStr: string) => boolean;

  // Historial de cotizaciones
  savedQuotes: SavedQuote[];
  saveQuote: (quote: Omit<SavedQuote, 'id' | 'timestamp'>) => void;
  deleteQuote: (id: string) => void;
  clearHistory: () => void;

  // Cotización activa para reabrir
  loadedQuote: SavedQuote | null;
  setLoadedQuote: (quote: SavedQuote | null) => void;

  // Toast
  toast: import('../types/index.js').ToastData | null;
  toastMessage: string | null;
  showToast: (msg: string, type?: import('../types/index.js').ToastType) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_PROFILES_KEY = 'slice2price_profiles_v1';
const STORAGE_SELECTION_KEY = 'slice2price_selection_v1';
const STORAGE_HISTORY_KEY = 'slice2price_history_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('cotizador');
  const [loadedQuote, setLoadedQuote] = useState<SavedQuote | null>(null);

  // Inicializar managers de perfiles
  const [managers] = useState(() => {
    let pList = DEFAULT_PRINTERS;
    let mList = DEFAULT_MATERIALS;
    let cList = DEFAULT_CLIENTS;
    let gList = DEFAULT_GENERALS;

    try {
      const saved = localStorage.getItem(STORAGE_PROFILES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.printers) pList = parsed.printers;
        if (parsed.materials) mList = parsed.materials;
        if (parsed.clients) cList = parsed.clients;
        if (parsed.generals) gList = parsed.generals;
      }
    } catch (e) {
      console.warn('Error leyendo perfiles guardados, usando defaults:', e);
    }

    return {
      printers: new ProfileManager<PrinterProfile>(pList),
      materials: new ProfileManager<MaterialProfile>(mList),
      clients: new ProfileManager<ClientProfile>(cList),
      generals: new ProfileManager<GeneralProfile>(gList),
    };
  });

  const [version, setVersion] = useState(0);
  const bumpVersion = () => setVersion((v) => v + 1);

  // Guardar en localStorage
  useEffect(() => {
    try {
      const data = {
        printers: managers.printers.getAll(),
        materials: managers.materials.getAll(),
        clients: managers.clients.getAll(),
        generals: managers.generals.getAll(),
      };
      localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error guardando perfiles:', e);
    }
  }, [version, managers]);

  // Listas de perfiles
  const printers = useMemo(() => managers.printers.getAll(), [managers, version]);
  const materials = useMemo(() => managers.materials.getAll(), [managers, version]);
  const clients = useMemo(() => managers.clients.getAll(), [managers, version]);
  const generals = useMemo(() => managers.generals.getAll(), [managers, version]);

  // Selección actual de perfiles
  const [selectedIds, setSelectedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SELECTION_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      printerId: printers[0]?.id || 'printer-flashforge-creator5',
      materialId: materials[0]?.id || 'material-pla',
      clientId: clients[1]?.id || 'client-regular',
      generalId: generals[0]?.id || 'general-default',
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_SELECTION_KEY, JSON.stringify(selectedIds));
  }, [selectedIds]);

  const selectedPrinter = useMemo(() => {
    return managers.printers.findById(selectedIds.printerId) || printers[0] || DEFAULT_PRINTERS[0];
  }, [managers, selectedIds.printerId, printers]);

  const selectedMaterial = useMemo(() => {
    return managers.materials.findById(selectedIds.materialId) || materials[0] || DEFAULT_MATERIALS[0];
  }, [managers, selectedIds.materialId, materials]);

  const selectedClient = useMemo(() => {
    return managers.clients.findById(selectedIds.clientId) || clients[0] || DEFAULT_CLIENTS[0];
  }, [managers, selectedIds.clientId, clients]);

  const selectedGeneral = useMemo(() => {
    return managers.generals.findById(selectedIds.generalId) || generals[0] || DEFAULT_GENERALS[0];
  }, [managers, selectedIds.generalId, generals]);

  const setSelectedPrinterId = (id: string) => setSelectedIds((s: any) => ({ ...s, printerId: id }));
  const setSelectedMaterialId = (id: string) => setSelectedIds((s: any) => ({ ...s, materialId: id }));
  const setSelectedClientId = (id: string) => setSelectedIds((s: any) => ({ ...s, clientId: id }));
  const setSelectedGeneralId = (id: string) => setSelectedIds((s: any) => ({ ...s, generalId: id }));

  // Operaciones de perfiles
  const addPrinter = (data: any) => {
    managers.printers.create({ ...data, type: 'printer' });
    bumpVersion();
  };
  const updatePrinter = (id: string, data: any) => {
    managers.printers.update(id, data);
    bumpVersion();
  };
  const deletePrinter = (id: string) => {
    managers.printers.delete(id);
    bumpVersion();
  };

  const addMaterial = (data: any) => {
    managers.materials.create({ ...data, type: 'material' });
    bumpVersion();
  };
  const updateMaterial = (id: string, data: any) => {
    managers.materials.update(id, data);
    bumpVersion();
  };
  const deleteMaterial = (id: string) => {
    managers.materials.delete(id);
    bumpVersion();
  };

  const addClient = (data: any) => {
    managers.clients.create({ ...data, type: 'client' });
    bumpVersion();
  };
  const updateClient = (id: string, data: any) => {
    managers.clients.update(id, data);
    bumpVersion();
  };
  const deleteClient = (id: string) => {
    managers.clients.delete(id);
    bumpVersion();
  };

  const updateGeneral = (id: string, data: any) => {
    managers.generals.update(id, data);
    bumpVersion();
  };

  const [toast, setToast] = useState<import('../types/index.js').ToastData | null>(null);

  const resetToDefaults = () => {
    managers.printers.loadFromJSON(DEFAULT_PRINTERS);
    managers.materials.loadFromJSON(DEFAULT_MATERIALS);
    managers.clients.loadFromJSON(DEFAULT_CLIENTS);
    managers.generals.loadFromJSON(DEFAULT_GENERALS);
    bumpVersion();
    showToast('Perfiles restaurados a valores predeterminados', 'info');
  };

  const importBackupData = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || typeof data !== 'object') {
        showToast('El archivo no tiene formato JSON válido', 'error');
        return false;
      }
      if (Array.isArray(data.printers)) managers.printers.loadFromJSON(data.printers);
      if (Array.isArray(data.materials)) managers.materials.loadFromJSON(data.materials);
      if (Array.isArray(data.clients)) managers.clients.loadFromJSON(data.clients);
      if (Array.isArray(data.generals)) managers.generals.loadFromJSON(data.generals);
      if (Array.isArray(data.savedQuotes)) {
        setSavedQuotes(data.savedQuotes);
      }
      bumpVersion();
      showToast('¡Copia de seguridad restaurada correctamente!', 'success');
      return true;
    } catch (err) {
      console.error('Error importando respaldo:', err);
      showToast('Error al leer el archivo JSON de respaldo', 'error');
      return false;
    }
  };

  // Historial de cotizaciones
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(savedQuotes));
  }, [savedQuotes]);

  const saveQuote = (quoteData: Omit<SavedQuote, 'id' | 'timestamp'>) => {
    const newQuote: SavedQuote = {
      ...quoteData,
      id: 'quote_' + Date.now(),
      timestamp: new Date().toISOString(),
    };
    setSavedQuotes((prev) => [newQuote, ...prev]);
    showToast('Cotización guardada en el historial', 'success');
  };

  const deleteQuote = (id: string) => {
    setSavedQuotes((prev) => prev.filter((q) => q.id !== id));
    showToast('Cotización eliminada', 'info');
  };

  const clearHistory = () => {
    setSavedQuotes([]);
    showToast('Historial limpiado', 'info');
  };

  const showToast = (msg: string, type: import('../types/index.js').ToastType = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => {
      setToast((current) => (current?.message === msg ? null : current));
    }, 4000);
  };

  // Escuchar eventos automáticos de laminación desde Electron (Fase 3)
  useEffect(() => {
    if (!window.electronAPI?.onSlicerEvent) return;

    const cleanup = window.electronAPI.onSlicerEvent((payload) => {
      const pieceCleanName = payload.fileName.replace(/\.[^/.]+$/, '');
      setLoadedQuote({
        id: 'auto_' + Date.now(),
        pieceName: pieceCleanName,
        timestamp: payload.timestamp,
        printTimeHours: payload.sliceResult.printTimeHours,
        filamentGrams: payload.sliceResult.filamentGrams,
        extraCosts: 0,
        quantity: 1,
        profiles: {
          printerName: selectedPrinter?.name || '',
          materialName: selectedMaterial?.name || '',
          clientName: selectedClient?.name || '',
          printerId: selectedPrinter?.id || '',
          materialId: selectedMaterial?.id || '',
          clientId: selectedClient?.id || '',
          generalId: selectedGeneral?.id || '',
        },
        breakdown: {} as any,
      });

      showToast(`¡Laminado detectado de ${payload.sliceResult.slicerName}! "${pieceCleanName}" cargada.`);
      setActiveTab('cotizador');
    });

    return () => {
      cleanup();
    };
  }, [selectedPrinter, selectedMaterial, selectedClient, selectedGeneral]);


  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        printers,
        materials,
        clients,
        generals,
        selectedPrinter,
        selectedMaterial,
        selectedClient,
        selectedGeneral,
        setSelectedPrinterId,
        setSelectedMaterialId,
        setSelectedClientId,
        setSelectedGeneralId,
        addPrinter,
        updatePrinter,
        deletePrinter,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        addClient,
        updateClient,
        deleteClient,
        updateGeneral,
        resetToDefaults,
        importBackupData,
        savedQuotes,
        saveQuote,
        deleteQuote,
        clearHistory,
        loadedQuote,
        setLoadedQuote,
        toast,
        toastMessage: toast?.message || null,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
