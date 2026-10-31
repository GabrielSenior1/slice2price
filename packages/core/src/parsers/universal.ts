import { SlicerParser, SliceResult, ParserOptions, filamentLengthToGrams } from './types.js';
import { OrcaSlicerParser, parseTimeString } from './orca.js';
import { CuraParser } from './cura.js';
import { PrusaParser } from './prusa.js';
import { CrealityParser } from './creality.js';
import { ThreeMfParser } from './threeMf.js';

export const KNOWN_PARSERS: SlicerParser[] = [
  new ThreeMfParser(),
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
export function parseSlicerFile(content: string | Uint8Array, filename?: string, options?: ParserOptions): SliceResult | null {
  if (!content) return null;

  // 1. Probar primero si es un archivo .3MF o ZIP binario (ThreeMfParser)
  const threeMfParser = KNOWN_PARSERS[0];
  if (threeMfParser.canParse(content)) {
    const result = threeMfParser.parse(content, filename, options);
    if (result) return result;
  }

  // Si era un archivo con extensión .3mf y no se extrajeron métricas, no evaluar como texto G-Code
  if (filename?.toLowerCase().endsWith('.3mf')) {
    return null;
  }

  // Para G-Code convencional de texto: asegurar que sea string
  let textContent = '';
  if (typeof content === 'string') {
    textContent = content;
  } else {
    try {
      textContent = new TextDecoder('utf-8').decode(content);
    } catch {
      return null;
    }
  }

  // 0. Si contiene metadatos directos generados por plugins/scripts Slice2Price
  const jsonMatch = textContent.match(/;Slice2Price_JSON:\s*(\{.+?\})/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      const time = Number(data.printTimeHours) || 0;
      const grams = Number(data.filamentGrams) || 0;
      // Solo aceptar si contiene métricas reales mayores a 0 (E2b)
      if (time > 0 || grams > 0) {
        return {
          printTimeHours: time,
          filamentGrams: grams,
          slicerName: data.slicerName || 'Plugin Slice2Price',
          sourceFile: data.pieceName || filename,
        };
      }
    } catch {
      // Ignorar error y continuar con parsers convencionales
    }
  }

  // 2. Probar parser específico coincidente con canParse
  for (const parser of KNOWN_PARSERS.slice(1)) {
    if (parser.canParse(textContent)) {
      const result = parser.parse(textContent, filename, options);
      if (result) return result;
    }
  }

  // 3. Extracción genérica (detecta tanto formato TIME en segundos como estimated time)
  const genericResult = parseGenericGCode(textContent, filename, options);
  if (genericResult) {
    return genericResult;
  }

  // 4. Fallback a parsers individuales
  for (const parser of KNOWN_PARSERS.slice(1)) {
    const result = parser.parse(textContent, filename, options);
    if (result) return result;
  }

  return null;
}

export function parseGenericGCode(content: string, filename?: string, options?: ParserOptions): SliceResult | null {
  const sample = content.slice(0, 150000) + '\n' + (content.length > 200000 ? content.slice(-50000) : '');

  let printTimeHours = 0;
  let filamentGrams = 0;

  // Tiempo: buscar TIME en segundos o estimated printing time
  const timeSec = sample.match(/;TIME:(\d+)/i);
  if (timeSec && timeSec[1]) {
    printTimeHours = parseInt(timeSec[1], 10) / 3600;
  } else {
    const timeMatch = sample.match(/(?:total )?estimated (?:printing )?time[^\r\n:=]*[:=]\s*([^\r\n;]+)/i);
    if (timeMatch && timeMatch[1]) {
      printTimeHours = parseTimeString(timeMatch[1]);
    }
  }

  // Filamento en gramos
  const gMatch = sample.match(/(?:total )?filament (?:used|weight) \[g\]\s*[:=]\s*([0-9.]+)/i);
  if (gMatch && gMatch[1]) {
    filamentGrams = parseFloat(gMatch[1]);
  } else {
    // Filamento en metros/milímetros ((mm|m) para no confundir mm con m)
    const mMatch = sample.match(/;Filament used:\s*([0-9.]+)\s*(mm|m)/i);
    if (mMatch && mMatch[1]) {
      const val = parseFloat(mMatch[1]);
      const lengthMm = mMatch[2].toLowerCase() === 'm' ? val * 1000 : val;
      filamentGrams = filamentLengthToGrams(lengthMm, options?.density ?? 1.24, options?.diameter ?? 1.75);
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
