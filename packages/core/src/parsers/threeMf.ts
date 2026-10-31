import { unzipSync, strFromU8 } from 'fflate';
import { SlicerParser, SliceResult, ParserOptions, filamentLengthToGrams } from './types.js';
import { parseTimeString } from './orca.js';

export class ThreeMfParser implements SlicerParser {
  readonly slicerId = 'threemf';
  readonly displayName = 'Archivo 3MF Laminado';

  canParse(content: string | Uint8Array): boolean {
    if (!content) return false;
    if (content instanceof Uint8Array) {
      if (content.length < 4) return false;
      return content[0] === 0x50 && content[1] === 0x4b && content[2] === 0x03 && content[3] === 0x04;
    }
    if (typeof content === 'string') {
      return content.startsWith('PK\x03\x04') || content.slice(0, 20).includes('PK\x03\x04');
    }
    return false;
  }

  parse(content: string | Uint8Array, filename?: string, options?: ParserOptions): SliceResult | null {
    try {
      let u8: Uint8Array;
      if (content instanceof Uint8Array) {
        u8 = content;
      } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(content)) {
        u8 = new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
      } else if (typeof content === 'string') {
        u8 = new Uint8Array(content.length);
        for (let i = 0; i < content.length; i++) {
          u8[i] = content.charCodeAt(i) & 0xff;
        }
      } else {
        return null;
      }

      // Descomprimir solo metadatos y configuraciones del ZIP 3MF, omitiendo modelos 3D pesados (S3)
      const unzipped = unzipSync(u8, {
        filter(file) {
          const lower = file.name.toLowerCase();
          return (
            lower.startsWith('metadata/') ||
            lower.endsWith('.config') ||
            lower.endsWith('.gcode') ||
            lower.endsWith('.xml')
          );
        },
      });

      let detectedText = '';
      let sliceInfoConfigText = '';
      let slicerName = '3MF Laminado';

      // 1. Buscar archivos de configuración y metadatos dentro del ZIP
      for (const [entryPath, entryData] of Object.entries(unzipped)) {
        const lowerPath = entryPath.toLowerCase();

        // slice_info.config / model_settings.config (XML y texto de Bambu Studio y OrcaSlicer)
        if (lowerPath.endsWith('slice_info.config') || lowerPath.endsWith('model_settings.config')) {
          const text = strFromU8(entryData);
          detectedText += '\n' + text;
          if (lowerPath.endsWith('slice_info.config')) {
            sliceInfoConfigText += '\n' + text;
          }
          if (text.toLowerCase().includes('bambustudio') || lowerPath.includes('bambu')) {
            slicerName = 'Bambu Studio (3MF)';
          } else if (text.toLowerCase().includes('orcaslicer') || lowerPath.includes('orca')) {
            slicerName = 'OrcaSlicer (3MF)';
          }
        }

        // Si incluye gcode laminado dentro del paquete (ej. Metadata/plate_1.gcode)
        if (lowerPath.endsWith('.gcode')) {
          const gcodeText = strFromU8(entryData.slice(0, 150000)) + '\n' + (entryData.length > 200000 ? strFromU8(entryData.slice(-50000)) : '');
          detectedText += '\n' + gcodeText;
        }

        // PrusaSlicer config
        if (lowerPath.endsWith('slic3r_pe.config') || lowerPath.endsWith('prusaslicer.config')) {
          detectedText += '\n' + strFromU8(entryData);
          slicerName = 'PrusaSlicer (3MF)';
        }
      }

      if (!detectedText) {
        return null; // 3MF sin laminar (modelo CAD o geometría pura sin gcode/slice_info)
      }

      let printTimeHours = 0;
      let filamentGrams = 0;

      // ── Extracción Multi-Placa (S1) ──────────────────────────────────────────
      // En Bambu Studio / OrcaSlicer slice_info.config, cada placa está estructurada en <plate>...</plate>
      const xmlToScanForPlates = sliceInfoConfigText || detectedText;
      const plateBlocks = Array.from(xmlToScanForPlates.matchAll(/<plate[^>]*>([\s\S]*?)<\/plate>/gi));

      if (plateBlocks.length > 0) {
        let totalSeconds = 0;
        let totalPlateGrams = 0;
        let multiPlateCount = 0;

        for (const plateMatch of plateBlocks) {
          const plateContent = plateMatch[1];
          let plateSec = 0;
          let plateG = 0;

          // Tiempo en la placa
          const plateSecMatch = plateContent.match(/key=["'](?:prediction|time|estimated_time)["'][^>]*value=["']([0-9.]+)["']/i) ||
                                plateContent.match(/value=["']([0-9.]+)["'][^>]*key=["'](?:prediction|time|estimated_time)["']/i);
          if (plateSecMatch && plateSecMatch[1]) {
            plateSec = parseFloat(plateSecMatch[1]);
          } else {
            const timeStrMatch = plateContent.match(/(?:total )?estimated (?:printing )?time[^\r\n:=]*[:=]\s*([^\r\n;<\"]+)/i);
            if (timeStrMatch && timeStrMatch[1]) {
              plateSec = parseTimeString(timeStrMatch[1]) * 3600;
            }
          }

          // Filamento en la placa
          const plateWeightMatch = plateContent.match(/key=["'](?:weight|filament_used_g|total_filament_weight)["'][^>]*value=["']([0-9.]+)["']/i) ||
                                   plateContent.match(/value=["']([0-9.]+)["'][^>]*key=["'](?:weight|filament_used_g|total_filament_weight)["']/i);
          if (plateWeightMatch && plateWeightMatch[1]) {
            plateG = parseFloat(plateWeightMatch[1]);
          } else {
            // Filamentos múltiples en la misma placa (multicolor AMS)
            const filamentUsedG = Array.from(plateContent.matchAll(/used_g=["']([0-9.]+)["']/gi));
            if (filamentUsedG.length > 0) {
              for (const m of filamentUsedG) {
                plateG += parseFloat(m[1]);
              }
            } else {
              const filamentUsedM = Array.from(plateContent.matchAll(/used_m=["']([0-9.]+)["']/gi));
              if (filamentUsedM.length > 0) {
                for (const m of filamentUsedM) {
                  plateG += filamentLengthToGrams(parseFloat(m[1]) * 1000, options?.density ?? 1.24, options?.diameter ?? 1.75);
                }
              } else {
                const gMatch = plateContent.match(/(?:total )?filament (?:used|weight) \[g\]\s*[:=]\s*([0-9.]+)/i);
                if (gMatch && gMatch[1]) {
                  plateG = parseFloat(gMatch[1]);
                } else {
                  const mmMatch = plateContent.match(/(?:total )?filament (?:used|length) \[mm\]\s*[:=]\s*([0-9.]+)/i) ||
                                  plateContent.match(/key=["'](?:filament_used_mm|length_mm)["'][^>]*value=["']([0-9.]+)["']/i);
                  if (mmMatch && mmMatch[1]) {
                    plateG = filamentLengthToGrams(parseFloat(mmMatch[1]), options?.density ?? 1.24, options?.diameter ?? 1.75);
                  }
                }
              }
            }
          }

          if (plateSec > 0 || plateG > 0) {
            totalSeconds += plateSec;
            totalPlateGrams += plateG;
            multiPlateCount++;
          }
        }

        if (totalSeconds > 0 || totalPlateGrams > 0) {
          printTimeHours = totalSeconds / 3600;
          filamentGrams = totalPlateGrams;
          if (multiPlateCount > 1) {
            slicerName = `${slicerName} (${multiPlateCount} placas)`;
          }
        }
      }

      // Si no se encontraron placas o no arrojaron tiempo/peso, extraer globalmente
      if (printTimeHours <= 0 && filamentGrams <= 0) {
        // ── Extracción de Tiempo Global ────────────────────────────────────────
        const xmlSecMatch = detectedText.match(/key=["'](?:prediction|time|estimated_time)["'][^>]*value=["']([0-9.]+)["']/i) ||
                            detectedText.match(/value=["']([0-9.]+)["'][^>]*key=["'](?:prediction|time|estimated_time)["']/i);
        if (xmlSecMatch && xmlSecMatch[1]) {
          printTimeHours = parseFloat(xmlSecMatch[1]) / 3600;
        } else {
          // Formato texto o comentarios: estimated printing time = 1h 25m o total estimated time: 1h 25m
          const timeStrMatch = detectedText.match(/(?:total )?estimated (?:printing )?time[^\r\n:=]*[:=]\s*([^\r\n;<\"]+)/i);
          if (timeStrMatch && timeStrMatch[1]) {
            printTimeHours = parseTimeString(timeStrMatch[1]);
          } else {
            // TIME en segundos
            const timeSecMatch = detectedText.match(/;TIME:(\d+)/i) || detectedText.match(/(?:prediction|time_s)\s*[:=]\s*([0-9.]+)/i);
            if (timeSecMatch && timeSecMatch[1]) {
              printTimeHours = parseFloat(timeSecMatch[1]) / 3600;
            }
          }
        }

        // ── Extracción de Filamento Global ─────────────────────────────────────
        const xmlWeightMatch = detectedText.match(/key=["'](?:weight|filament_used_g|total_filament_weight)["'][^>]*value=["']([0-9.]+)["']/i) ||
                              detectedText.match(/value=["']([0-9.]+)["'][^>]*key=["'](?:weight|filament_used_g|total_filament_weight)["']/i);
        if (xmlWeightMatch && xmlWeightMatch[1]) {
          filamentGrams = parseFloat(xmlWeightMatch[1]);
        } else {
          // Formato texto o comentarios: total filament weight [g] : 42.6 o filament used [g] = 42.6
          const gMatch = detectedText.match(/(?:total )?filament (?:used|weight) \[g\]\s*[:=]\s*([0-9.]+)/i);
          if (gMatch && gMatch[1]) {
            filamentGrams = parseFloat(gMatch[1]);
          } else {
            // Filamento en mm o metros
            const mmMatch = detectedText.match(/(?:total )?filament (?:used|length) \[mm\]\s*[:=]\s*([0-9.]+)/i);
            if (mmMatch && mmMatch[1]) {
              filamentGrams = filamentLengthToGrams(parseFloat(mmMatch[1]), options?.density ?? 1.24, options?.diameter ?? 1.75);
            } else {
              const xmlMmMatch = detectedText.match(/key=["'](?:filament_used_mm|length_mm)["'][^>]*value=["']([0-9.]+)["']/i);
              if (xmlMmMatch && xmlMmMatch[1]) {
                filamentGrams = filamentLengthToGrams(parseFloat(xmlMmMatch[1]), options?.density ?? 1.24, options?.diameter ?? 1.75);
              }
            }
          }
        }
      }

      if (printTimeHours <= 0 && filamentGrams <= 0) {
        return null;
      }

      return {
        printTimeHours: Math.round(printTimeHours * 100) / 100,
        filamentGrams: Math.round(filamentGrams * 10) / 10,
        slicerName,
        sourceFile: filename,
      };
    } catch {
      return null;
    }
  }
}
