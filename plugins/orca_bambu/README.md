# Integración de OrcaSlicer y Bambu Studio — Slice2Price

Este script transmite automáticamente los datos de tiempo de impresión y peso de filamento calculados en **OrcaSlicer** o **Bambu Studio** hacia **Slice2Price** cada vez que exportas o laminas un archivo G-Code.

---

## Configuración en OrcaSlicer / Bambu Studio (Paso a paso)

1. Abre **OrcaSlicer** o **Bambu Studio**.
2. Ve a los ajustes del proyecto o proceso de impresión (**Process / Print Settings**).
3. Asegúrate de activar el modo **Avanzado** (toggle en la esquina superior de la barra de configuración).
4. Selecciona la pestaña **Otros** (*Others*).
5. Desplázate hacia abajo hasta la sección **Opciones especiales** o **Scripts de post-procesamiento** (*Post-processing scripts*).
6. Añade la ruta completa hacia el script:
   ```
   "C:\ruta\a\Slice2Price\plugins\orca_bambu\slice2price_orca.bat";
   ```
   *(o ejecutando directamente con Python si está en tu PATH):*
   ```
   python "C:\ruta\a\Slice2Price\plugins\orca_bambu\slice2price_orca.py";
   ```
   *(Nota: Recuerda incluir las comillas dobles y el punto y coma final `;`).*
7. Guarda el preset.
8. ¡Listo! Cada vez que exportes tu G-Code, Slice2Price lo detectará al instante y actualizará el precio automáticamente en el Cotizador y en el Mini Overlay Flotante.

