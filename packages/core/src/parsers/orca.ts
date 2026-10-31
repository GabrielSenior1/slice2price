import { SlicerParser, SliceResult, ParserOptions, filamentLengthToGrams } from './types.js';

export function parseTimeString(timeStr: string): number {
  let totalHours = 0;
  const dMatch = timeStr.match(/(\d+)\s*d/i);
  const hMatch = timeStr.match(/(\d+)\s*h/i);
  const mMatch = timeStr.match(/(\d+)\s*m/i);
  const sMatch = timeStr.match(/(\d+)\s*s/i);

  if (dMatch) totalHours += parseInt(dMatch[1], 10) * 24;
  if (hMatch) totalHours += parseInt(hMatch[1], 10);
  if (mMatch) totalHours += parseInt(mMatch[1], 10) / 60;
  if (sMatch) totalHours += parseInt(sMatch[1], 10) / 3600;

  return totalHours;
}

export class OrcaSlicerParser implements SlicerParser {
  readonly slicerId = 'orcaslicer';
  readonly displayName = 'OrcaSlicer / Bambu Studio';

  canParse(content: string): boolean {
    const sample = (content.slice(0, 100000) + (content.length > 200000 ? content.slice(-50000) : '')).toLowerCase();
    return (
      sample.includes('orcaslicer') ||
      sample.includes('bambustudio') ||
      sample.includes('bambu studio')
    );
  }

  parse(content: string, filename?: string, options?: ParserOptions): SliceResult | null {
    const header = content.slice(0, 150000);
    const trailer = content.length > 200000 ? content.slice(-50000) : '';
    const sample = header + '\n' + trailer;

    let slicerName = 'OrcaSlicer';
    if (/bambustudio|bambu studio/i.test(sample)) {
      slicerName = 'Bambu Studio';
    }

    let printTimeHours = 0;
    // Soporta tanto OrcaSlicer (=) como Bambu Studio (: o =)
    const timeMatch = sample.match(/(?:total )?estimated (?:printing )?time[^\r\n:=]*[:=]\s*([^\r\n;]+)/i);
    if (timeMatch && timeMatch[1]) {
      printTimeHours = parseTimeString(timeMatch[1]);
    } else {
      const modelTimeMatch = sample.match(/(?:total )?model (?:printing )?time[^\r\n:=]*[:=]\s*([^\r\n;]+)/i);
      if (modelTimeMatch && modelTimeMatch[1]) {
        printTimeHours = parseTimeString(modelTimeMatch[1]);
      }
    }

    let filamentGrams = 0;
    // Soporta tanto OrcaSlicer (filament used [g] =) como Bambu Studio (total filament weight [g] :)
    const gramsMatch = sample.match(/(?:total )?filament (?:used|weight) \[g\]\s*[:=]\s*([0-9.]+)/i);
    if (gramsMatch && gramsMatch[1]) {
      filamentGrams = parseFloat(gramsMatch[1]);
    } else {
      const mmMatch = sample.match(/(?:total )?filament (?:used|length) \[mm\]\s*[:=]\s*([0-9.]+)/i);
      if (mmMatch && mmMatch[1]) {
        filamentGrams = filamentLengthToGrams(parseFloat(mmMatch[1]), options?.density ?? 1.24, options?.diameter ?? 1.75);
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
  }
}
