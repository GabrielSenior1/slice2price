# Slice2Price

Calculadora de costos para piezas de impresión 3D. Calcula automáticamente el precio de una pieza según tus parámetros (material, impresora, energía, márgenes) al laminar en tu slicer favorito.

**Moneda:** Pesos Colombianos (COP)  
**Idioma:** Español

---

## Estructura del proyecto

```
Slice2Price/
├── packages/
│   ├── core/         ← Núcleo: fórmulas, perfiles, parsers (etapa actual)
│   └── desktop/      ← App de escritorio: Electron + React + Vite (etapa 2)
├── plugins/
│   └── cura/         ← Plugin de Cura en Python (etapa 4)
└── data/             ← Datos del usuario (JSON)
```

## Etapa 1 — Núcleo (`packages/core`)

El paquete `@slice2price/core` contiene:

- **Motor de cálculo** (`calc/engine.ts`) — Implementa las fórmulas de costo con desglose completo.
- **Perfiles** (`profiles/`) — CRUD para 4 tipos: Impresora, Material, Cliente, General.
- **Defaults** (`profiles/defaults.ts`) — Lista inicial de impresoras, materiales y tarifas.
- **Formateo** (`format/currency.ts`) — Formateo a pesos colombianos ($12.500).
- **Parsers** (`parsers/types.ts`) — Interfaz para parsers de slicer (implementación en etapa 3).

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
