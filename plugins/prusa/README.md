# Integración de PrusaSlicer — Slice2Price

Este script transmite automáticamente los datos de tiempo de impresión y peso de filamento calculados en **PrusaSlicer** hacia **Slice2Price** cada vez que exportas un archivo G-Code.

---

## Configuración en PrusaSlicer (Paso a paso)

1. Abre **PrusaSlicer**.
2. Ve a la pestaña **Configuración de impresión** (*Print Settings*).
3. Asegúrate de estar en modo **Experto** o **Avanzado** (esquina superior derecha).
4. En el menú lateral izquierdo, haz clic en **Opciones de salida** (*Output options*).
5. En el campo **Scripts de post-procesamiento** (*Post-processing scripts*), agrega la ruta completa al script:
   ```
   "C:\ruta\a\Slice2Price\plugins\prusa\slice2price_prusa.bat";
   ```
   *(o si tienes Python en tu PATH de Windows):*
   ```
   python "C:\ruta\a\Slice2Price\plugins\prusa\slice2price_prusa.py";
   ```
   *(Nota: Recuerda incluir el punto y coma final `;` si agregas más de un script).*
6. Guarda el perfil de impresión.
7. ¡Listo! Cada vez que presiones **Exportar G-code**, Slice2Price detectará el archivo de inmediato y actualizará la cotización.
