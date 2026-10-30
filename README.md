# Slice2Price

Calculadora de costos para piezas de impresión 3D. Calcula automáticamente el precio de una pieza según tus parámetros (material, impresora, energía, márgenes) al laminar en tu slicer favorito.

**Moneda:** Pesos Colombianos (COP)  
**Idioma:** Español

---

## Estructura del proyecto

```
Slice2Price/
├── packages/
│   ├── core/           ← Núcleo: fórmulas, perfiles, parsers (Etapa 1)
│   └── desktop/        ← App de escritorio: Electron + React + Vite + Mini Overlay (Etapas 2 y 4)
├── plugins/
│   ├── cura/           ← Plugin para UltiMaker Cura en Python (Etapa 4)
│   ├── prusa/          ← Script de post-procesamiento para PrusaSlicer (Etapa 4)
│   └── orca_bambu/     ← Script de post-procesamiento para OrcaSlicer y Bambu Studio (Etapa 4)
└── data/               ← Datos del usuario y copias de seguridad (JSON)
```

## Etapas del Desarrollo

- **✅ Etapa 1 — Núcleo (`@slice2price/core`):** Motor de cálculo con fórmulas exactas en pesos colombianos (COP), CRUD de perfiles (impresoras, materiales, clientes, tarifas CREG), formateo y suite de 69 tests unitarios.
- **✅ Etapa 2 — App de Escritorio (`@slice2price/desktop`):** Interfaz completa con Electron 33 + React 18 + Vite 6 + TypeScript. Cotizador en tiempo real con chips de estratos de energía, gestión visual de perfiles, historial y exportación (PDF/Texto/Portapapeles).
- **✅ Etapa 3 — Vigilante de Slicers en Tiempo Real:** Monitoreo en segundo plano de carpetas de laminadores en Windows (%APPDATA% de Orca, Bambu, Cura, Prusa, Creality, Descargas y Escritorio). Parsers automáticos de G-code y .3MF.
- **🚀 Etapa 4 — Plugins y Mini Overlay Flotante:**
  - **Mini Overlay Flotante Always-on-Top:** Widget compacto que permanece siempre en primer plano sobre tu slicer, mostrando precio en tiempo real con atajo **F10** o botón en cabecera.
  - **Notificaciones nativas:** Alertas visuales del sistema en Windows al detectar un archivo laminado.
  - **Plugins dedicados:** Integración directa para Cura (`plugins/cura/`), PrusaSlicer (`plugins/prusa/`) y OrcaSlicer/Bambu Studio (`plugins/orca_bambu/`).

### Fórmulas

```
costo_filamento = (gramos / 1000) × precio_kg
costo_energia   = (consumo_W / 1000) × horas × precio_kwh
costo_desgaste  = horas × depreciación_por_hora
subtotal        = costo_filamento + costo_energia + costo_desgaste + insumos_extra
con_error       = subtotal × (1 + margen_error/100) × (1 + riesgo_fallo/100)
total           = con_error × (1 + margen_ganancia/100)
```

### Requisitos

- Node.js 20 o superior
- npm 10 o superior

### Instalación

```bash
# Desde la raíz del proyecto:
npm install
```

### Ejecutar pruebas

```bash
# Todas las pruebas:
npm test

# En modo watch (se re-ejecuta al guardar):
npm run test:watch

# Con cobertura:
cd packages/core
npx vitest run --coverage
```

### Ejemplo numérico (verificable a mano)

| Parámetro | Valor |
|---|---|
| Material | PLA — $65.000/kg |
| Impresora | Ender 3 Pro — 270W — $500/h depreciación |
| kWh | $800 |
| Margen de error | 5% |
| Riesgo de fallo | 3% |
| Margen de ganancia | 40% |
| Tiempo | 4 horas |
| Filamento | 50 gramos |
| Insumos extra | $5.000 |
| Cantidad | 1 unidad |

**Cálculo:**

| Línea | Fórmula | Resultado |
|---|---|---|
| Filamento | (50 / 1000) × 65.000 | $3.250 |
| Energía | (270 / 1000) × 4 × 800 | $864 |
| Desgaste | 4 × 500 | $2.000 |
| Insumos extra | — | $5.000 |
| **Subtotal** | 3.250 + 864 + 2.000 + 5.000 | **$11.114** |
| + Error 5% | 11.114 × 0,05 | +$555,70 |
| + Riesgo 3% | 11.669,70 × 0,03 | +$350,09 |
| Subtotal ajustado | | $12.019,79 |
| + Ganancia 40% | 12.019,79 × 0,40 | +$4.807,92 |
| **TOTAL** | | **$16.827,71** |

## Impresoras incluidas por defecto

| Impresora | Consumo (W) | Depreciación (COP/h) |
|---|---|---|
| FlashForge Creator 5 | 400 | $1.300 |
| Creality Ender 3 Pro | 270 | $300 |
| Bambu Lab A1 Mini | 120 | $350 |
| Bambu Lab A1 | 150 | $450 |
| Bambu Lab P1S | 220 | $900 |
| Bambu Lab X1 Carbon | 220 | $1.200 |
| Prusa MK4S | 150 | $700 |
| Creality Ender 3 V3 | 270 | $400 |
| Artillery Sidewinder X2 | 350 | $500 |
| Anycubic Kobra 3 | 150 | $350 |

> Todos los valores son editables desde la gestión de perfiles.

## Licencia

Proyecto privado.
