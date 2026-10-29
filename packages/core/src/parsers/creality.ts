import { SlicerParser, SliceResult, filamentLengthToGrams } from './types.js';
import { parseTimeString } from './orca.js';

export class CrealityParser implements SlicerParser {
  readonly slicerId = 'creality';
  readonly displayName = 'Creality Print';

  canParse(content: string): boolean {
    const sample = (content.slice(0, 100000) + (content.length > 200000 ? content.slice(-50000) : '')).toLowerCase();
    return sample.includes('creality') || sample.includes('crealityprint');
  }

  parse(content: string, filename?: string): SliceResult | null {
    const header = content.slice(0, 150000);
    const trailer = content.length > 200000 ? content.slice(-50000) : '';
    const sample = header + '\n' + trailer;

    let printTimeHours = 0;
    const timeSecMatch = sample.match(/;TIME:(\d+)/i);
    if (timeSecMatch && timeSecMatch[1]) {
      printTimeHours = parseInt(timeSecMatch[1], 10) / 3600;
    } else {
      const timeStrMatch = sample.match(/estimated printing time[^\r\n=]*=\s*([^\r\n;]+)/i);
      if (timeStrMatch && timeStrMatch[1]) {
        printTimeHours = parseTimeString(timeStrMatch[1]);
      }
    }

    let filamentGrams = 0;
    const gMatch = sample.match(/(?:total )?filament used \[g\]\s*=\s*([0-9.]+)/i);
    if (gMatch && gMatch[1]) {
      filamentGrams = parseFloat(gMatch[1]);
    } else {
      const filMatch = sample.match(/;Filament used:\s*([0-9.]+)\s*(m|mm)/i);
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
      slicerName: 'Creality Print',
      sourceFile: filename,
    };
  }
}
