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

      // Descomprimir el ZIP del paquete 3MF
      const unzipped = unzipSync(u8);
      let detectedText = '';
      let slicerName = '3MF Laminado';

      // 1. Buscar archivos de configuración y metadatos dentro del ZIP
      for (const [entryPath, entryData] of Object.entries(unzipped)) {
        const lowerPath = entryPath.toLowerCase();

        // slice_info.config / model_settings.config (XML y texto de Bambu Studio y OrcaSlicer)
        if (lowerPath.endsWith('slice_info.config') || lowerPath.endsWith('model_settings.config')) {
          const text = strFromU8(entryData);
          detectedText += '\n' + text;
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

      // ── Extracción de Tiempo ───────────────────────────────────────────────
      let printTimeHours = 0;

      // Formato XML de Bambu Studio / OrcaSlicer: <header_item key="prediction" value="8135"/> (en segundos)
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

      // ── Extracción de Filamento ────────────────────────────────────────────
      let filamentGrams = 0;

      // Formato XML de Bambu Studio / OrcaSlicer: <header_item key="weight" value="42.6"/> (en gramos)
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
