import React, { useRef } from 'react';
import { useApp } from '../context/AppContext.js';

export const SettingsView: React.FC = () => {
  const { resetToDefaults, showToast, importBackupData, printers, materials, clients, generals, savedQuotes } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Exportar configuración completa a archivo JSON
  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      printers,
      materials,
      clients,
      generals,
      savedQuotes,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Slice2Price_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('Copia de seguridad descargada en JSON', 'success');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importBackupData(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex-col gap-md" style={{ maxWidth: '800px' }}>
      <div>
        <h2 className="text-headline-md" style={{ color: 'var(--on-surface)' }}>
          Ajustes del Taller y Slice2Price
        </h2>
        <p className="text-body-sm color-outline">
          Preferencias del sistema, respaldo de tarifas e información técnica
        </p>
      </div>

      {/* Tarjeta 1: Moneda e Idioma */}
      <div className="card">
        <div className="card__header">
          <div className="card__header-title">
            <span className="material-symbols-outlined icon-md color-primary">payments</span>
            <span className="text-title-sm">Región y Moneda</span>
          </div>
          <span className="badge badge--primary">COP</span>
        </div>

        <div className="grid-2">
          <div className="surface-box">
            <span className="text-label-caption color-outline">Moneda de Cálculo</span>
            <div className="font-bold text-title-sm" style={{ marginTop: '4px' }}>
              Pesos Colombianos (COP)
            </div>
            <p className="text-body-sm color-outline" style={{ marginTop: '4px' }}>
              Formato estándar con separador de miles ($ 25.000 COP).
            </p>
          </div>

          <div className="surface-box">
            <span className="text-label-caption color-outline">Idioma de Interfaz</span>
            <div className="font-bold text-title-sm" style={{ marginTop: '4px' }}>
              Español (Latinoamérica)
            </div>
            <p className="text-body-sm color-outline" style={{ marginTop: '4px' }}>
              Textos de cotización adaptados para clientes en Colombia.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjeta 2: Respaldo de datos */}
      <div className="card">
        <div className="card__header">
          <div className="card__header-title">
            <span className="material-symbols-outlined icon-md color-secondary">cloud_download</span>
            <span className="text-title-sm">Copia de Seguridad y Exportación</span>
          </div>
        </div>

        <p className="text-body-sm" style={{ color: 'var(--on-surface-variant)', marginBottom: '12px' }}>
          Guarda tus perfiles de impresoras, tarifas de materiales y cotizaciones en un archivo JSON seguro para llevar a otro equipo o restaurar:
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn--secondary btn--sm" onClick={handleExportBackup}>
            <span className="material-symbols-outlined icon-xs">download</span>
            Exportar Copia (.json)
          </button>

          <button
            className="btn btn--secondary btn--sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="material-symbols-outlined icon-xs">upload</span>
            Importar Copia (.json)
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </div>
      </div>

      {/* Tarjeta 3: Restaurar / Mantenimiento */}
      <div className="card">
        <div className="card__header">
          <div className="card__header-title">
            <span className="material-symbols-outlined icon-md color-error">settings_backup_restore</span>
            <span className="text-title-sm">Restablecer Valores</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="font-semibold text-body-sm">Restaurar perfiles de fábrica</div>
            <div className="text-body-sm color-outline">
              Vuelve a cargar las impresoras (Creator 5, Ender 3, Bambu), materiales y tarifas iniciales.
            </div>
          </div>
          <button
            className="btn btn--danger btn--sm"
            onClick={() => {
              if (window.confirm('¿Deseas restaurar todos los perfiles a valores de fábrica?')) {
                resetToDefaults();
              }
            }}
          >
            Restaurar Valores Iniciales
          </button>
        </div>
      </div>

      {/* Tarjeta 4: Acerca de Slice2Price */}
      <div className="card">
        <div className="card__header">
          <div className="card__header-title">
            <span className="material-symbols-outlined icon-md color-tertiary">info</span>
            <span className="text-title-sm">Acerca de Slice2Price</span>
          </div>
          <span className="badge badge--surface">v0.1.0</span>
        </div>

        <div className="flex-col gap-xs text-body-sm" style={{ color: 'var(--on-surface-variant)' }}>
          <div><strong>Aplicación:</strong> Slice2Price Desktop (Electron 33 + React 18 + Vite 6 + TypeScript)</div>
          <div><strong>Motor de cálculo:</strong> @slice2price/core (Fórmulas precisas en COP)</div>
          <div><strong>Etapas del desarrollo:</strong></div>
          <ul style={{ paddingLeft: '20px', margin: '4px 0', lineHeight: '22px' }}>
            <li>✅ <strong>Etapa 1:</strong> Motor de cálculo, perfiles predeterminados y pruebas unitarias (Completada).</li>
            <li>🚀 <strong>Etapa 2:</strong> Interfaz de escritorio, cotizador interactivo y sistema de perfiles (Activa).</li>
            <li>⏳ <strong>Etapa 3:</strong> Vigilante de archivos en segundo plano para OrcaSlicer, BambuStudio y Cura.</li>
            <li>⏳ <strong>Etapa 4:</strong> Notificaciones del sistema y overlay flotante.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
