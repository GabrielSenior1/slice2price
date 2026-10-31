import { unzipSync, strFromU8, zipSync, strToU8 } from 'fflate';
import { SlicerParser, SliceResult, ParserOptions } from './types.js';
import { parseTimeString } from './orca.js';

export class ThreeMfParser implements SlicerParser {
  readonly slicerId = 'threemf';
  readonly displayName = 'Archivo 3MF Laminado';

  canParse(content: string): boolean {
    if (typeof content !== 'string' || content.length < 4) return false;
    return content.startsWith('PK\x03\x04') || content.slice(0, 20).includes('PK\x03\x04');
  }

  parse(content: string, filename?: string, options?: ParserOptions): SliceResult | null {
    try {
      // Convertir content string a Uint8Array si vino como string
      const u8 = new Uint8Array(content.length);
      for (let i = 0; i < content.length; i++) {
        u8[i] = content.charCodeAt(i) & 0xff;
      }

      const unzipped = unzipSync(u8);
      let detectedText = '';
      let slicerName = '3MF Laminado';

      // 1. Buscar metadatos de laminación de Bambu Studio / OrcaSlicer
      for (const [entryPath, entryData] of Object.entries(unzipped)) {
        const lowerPath = entryPath.toLowerCase();

        // slice_info.config contiene los parámetros directos de Bambu/Orca
        if (lowerPath.endsWith('slice_info.config') || lowerPath.endsWith('model_settings.config')) {
          const text = strFromU8(entryData);
          detectedText += '\n' + text;
          if (text.toLowerCase().includes('bambustudio')) slicerName = 'Bambu Studio (3MF)';
          else if (text.toLowerCase().includes('orcaslicer')) slicerName = 'OrcaSlicer (3MF)';
        }

        // Si incluye gcode laminado dentro del paquete (ej. plate_1.gcode)
        if (lowerPath.endsWith('.gcode')) {
          const gcodeText = strFromU8(entryData.slice(0, 100000));
          detectedText += '\n' + gcodeText;
        }

        // PrusaSlicer config
        if (lowerPath.endsWith('slic3r_pe.config') || lowerPath.endsWith('prusaslicer.config')) {
          detectedText += '\n' + strFromU8(entryData);
          slicerName = 'PrusaSlicer (3MF)';
        }
      }

      if (!detectedText) {
        return null; // 3MF sin laminar (CAD / 3D puro)
      }

      // Extraer tiempo
      let printTimeHours = 0;
      const timeMatch = detectedText.match(/(?:total )?estimated (?:printing )?time[^\r\n:=]*[:=]\s*([^\r\n;<\"]+)/i);
      if (timeMatch && timeMatch[1]) {
        printTimeHours = parseTimeString(timeMatch[1]);
      } else {
        const secMatch = detectedText.match(/(?:prediction|time_s|estimated_time)\s*[:=]\s*([0-9.]+)/i);
        if (secMatch && secMatch[1]) {
          printTimeHours = parseFloat(secMatch[1]) / 3600;
        }
      }

      // Extraer filamento
      let filamentGrams = 0;
      const gMatch = detectedText.match(/(?:total )?filament (?:used|weight) \[g\]\s*[:=]\s*([0-9.]+)/i);
      if (gMatch && gMatch[1]) {
        filamentGrams = parseFloat(gMatch[1]);
      } else {
        const altWeightMatch = detectedText.match(/(?:weight|filament_used_g)\s*[:=]\s*([0-9.]+)/i);
        if (altWeightMatch && altWeightMatch[1]) {
          filamentGrams = parseFloat(altWeightMatch[1]);
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
    } catch (err) {
      // Si el buffer no es un zip válido o está corrupto
      return null;
    }
  }
}

