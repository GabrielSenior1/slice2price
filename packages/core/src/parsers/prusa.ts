import { SlicerParser, SliceResult, filamentLengthToGrams, volumeToGrams } from './types.js';
import { parseTimeString } from './orca.js';

export class PrusaParser implements SlicerParser {
  readonly slicerId = 'prusa';
  readonly displayName = 'PrusaSlicer';

  canParse(content: string): boolean {
    const sample = (content.slice(0, 50000) + (content.length > 100000 ? content.slice(-50000) : '')).toLowerCase();
    return sample.includes('prusaslicer') || sample.includes('slic3r');
  }

  parse(content: string, filename?: string): SliceResult | null {
    const sample = content.length > 400000 ? content.slice(0, 200000) + '\n' + content.slice(-200000) : content;

    let printTimeHours = 0;
    const timeMatch = sample.match(/estimated printing time[^\r\n=]*=\s*([^\r\n;]+)/i);
    if (timeMatch && timeMatch[1]) {
      printTimeHours = parseTimeString(timeMatch[1]);
    }

    let filamentGrams = 0;
    const gMatch = sample.match(/filament used \[g\]\s*=\s*([0-9.]+)/i);
    if (gMatch && gMatch[1]) {
      filamentGrams = parseFloat(gMatch[1]);
    } else {
      const cm3Match = sample.match(/filament used \[cm3\]\s*=\s*([0-9.]+)/i);
      if (cm3Match && cm3Match[1]) {
        filamentGrams = volumeToGrams(parseFloat(cm3Match[1]), 1.24);
      } else {
        const mmMatch = sample.match(/filament used \[mm\]\s*=\s*([0-9.]+)/i);
        if (mmMatch && mmMatch[1]) {
          filamentGrams = filamentLengthToGrams(parseFloat(mmMatch[1]), 1.24);
        }
      }
    }

    if (printTimeHours <= 0 && filamentGrams <= 0) {
      return null;
    }

    return {
      printTimeHours: Math.round(printTimeHours * 100) / 100,
      filamentGrams: Math.round(filamentGrams * 10) / 10,
      slicerName: 'PrusaSlicer',
      sourceFile: filename,
    };
  }
}
