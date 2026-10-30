import { SlicerParser, SliceResult, filamentLengthToGrams } from './types.js';
import { OrcaSlicerParser, parseTimeString } from './orca.js';
import { CuraParser } from './cura.js';
import { PrusaParser } from './prusa.js';
import { CrealityParser } from './creality.js';

export const KNOWN_PARSERS: SlicerParser[] = [
  new OrcaSlicerParser(),
  new CuraParser(),
  new PrusaParser(),
  new CrealityParser(),
];

/**
 * Intenta parsear un contenido de G-code o archivo 3D usando todos los parsers disponibles.
 * 1. Primero busca el parser que reclame el archivo mediante `canParse`.
 * 2. Si no fue identificado explícitamente por un slicer conocido, realiza una extracción genérica.
 * 3. Como último recurso, prueba los parsers individuales.
 */
export function parseSlicerFile(content: string, filename?: string): SliceResult | null {
  if (!content || typeof content !== 'string') return null;

  // 0. Si contiene metadatos directos generados por plugins/scripts Slice2Price
  const jsonMatch = content.match(/;Slice2Price_JSON:\s*(\{.+?\})/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      if (typeof data.printTimeHours === 'number' || typeof data.filamentGrams === 'number') {
        return {
          printTimeHours: Number(data.printTimeHours) || 0,
          filamentGrams: Number(data.filamentGrams) || 0,
          slicerName: data.slicerName || 'Plugin Slice2Price',
          sourceFile: data.pieceName || filename,
        };
      }
    } catch {
      // Ignorar error y continuar con parsers convencionales
    }
  }

  // 1. Probar parser específico coincidente con canParse
  for (const parser of KNOWN_PARSERS) {
    if (parser.canParse(content)) {
      const result = parser.parse(content, filename);
      if (result) return result;
    }
  }

  // 2. Extracción genérica (detecta tanto formato TIME en segundos como estimated time)
  const genericResult = parseGenericGCode(content, filename);
  if (genericResult) {
    return genericResult;
  }

  // 3. Fallback a parsers individuales
  for (const parser of KNOWN_PARSERS) {
    const result = parser.parse(content, filename);
    if (result) return result;
  }

  return null;
}

export function parseGenericGCode(content: string, filename?: string): SliceResult | null {
  const sample = content.slice(0, 150000) + '\n' + (content.length > 200000 ? content.slice(-50000) : '');

  let printTimeHours = 0;
  let filamentGrams = 0;

  // Tiempo: buscar TIME en segundos o estimated printing time
  const timeSec = sample.match(/;TIME:(\d+)/i);
  if (timeSec && timeSec[1]) {
    printTimeHours = parseInt(timeSec[1], 10) / 3600;
  } else {
    const timeMatch = sample.match(/estimated printing time[^\r\n=]*=\s*([^\r\n;]+)/i);
    if (timeMatch && timeMatch[1]) {
      printTimeHours = parseTimeString(timeMatch[1]);
    }
  }

  // Filamento en gramos
  const gMatch = sample.match(/(?:total )?filament used \[g\]\s*=\s*([0-9.]+)/i);
  if (gMatch && gMatch[1]) {
    filamentGrams = parseFloat(gMatch[1]);
  } else {
    // Filamento en metros
    const mMatch = sample.match(/;Filament used:\s*([0-9.]+)\s*(m|mm)/i);
    if (mMatch && mMatch[1]) {
      const val = parseFloat(mMatch[1]);
      const lengthMm = mMatch[2].toLowerCase() === 'm' ? val * 1000 : val;
      filamentGrams = filamentLengthToGrams(lengthMm, 1.24);
    }
  }

  if (printTimeHours <= 0 && filamentGrams <= 0) {
    return null;
  }

  return {
    printTimeHours: Math.round(printTimeHours * 100) / 100,
    filamentGrams: Math.round(filamentGrams * 10) / 10,
    slicerName: 'G-Code Estándar',
    sourceFile: filename,
  };
}
