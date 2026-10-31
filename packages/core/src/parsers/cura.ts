import { SlicerParser, SliceResult, filamentLengthToGrams } from './types.js';

export class CuraParser implements SlicerParser {
  readonly slicerId = 'cura';
  readonly displayName = 'UltiMaker Cura';

  canParse(content: string): boolean {
    const sample = (content.slice(0, 100000) + (content.length > 200000 ? content.slice(-50000) : '')).toLowerCase();
    return sample.includes('cura') || sample.includes('cura_steamengine');
  }

  parse(content: string, filename?: string): SliceResult | null {
    const sample = content.length > 200000 ? content.slice(0, 100000) + '\n' + content.slice(-50000) : content;

    let printTimeHours = 0;
    const timeMatch = sample.match(/;TIME:(\d+)/i);
    if (timeMatch && timeMatch[1]) {
      printTimeHours = parseInt(timeMatch[1], 10) / 3600;
    }

    let filamentGrams = 0;
    const filGramsMatch = sample.match(/;Filament used:\s*([0-9.]+)\s*g/i) || sample.match(/;filament used \[g\]\s*=\s*([0-9.]+)/i);
    if (filGramsMatch && filGramsMatch[1]) {
      filamentGrams = parseFloat(filGramsMatch[1]);
    } else {
      // (mm|m) en ese orden específico para evitar que "mm" coincida parcialmente con "m"
      const filMatch = sample.match(/;Filament used:\s*([0-9.]+)\s*(mm|m)/i);
      if (filMatch && filMatch[1]) {
        const val = parseFloat(filMatch[1]);
        const lengthMm = filMatch[2].toLowerCase() === 'm' ? val * 1000 : val;
        filamentGrams = filamentLengthToGrams(lengthMm, 1.24);
      }
    }

    if (printTimeHours <= 0 && filamentGrams <= 0) {
      return null;
    }

    return {
      printTimeHours: Math.round(printTimeHours * 100) / 100,
      filamentGrams: Math.round(filamentGrams * 10) / 10,
      slicerName: 'UltiMaker Cura',
      sourceFile: filename,
    };
  }
}
