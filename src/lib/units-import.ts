// Importar unidades pegando filas copiadas de Excel / Google Sheets (o un CSV).
// Columnas esperadas, en orden: Unidad · Piso · Depto · Coeficiente.
// Solo "Unidad" es obligatoria. También se acepta "Unidad · Coeficiente".

export interface ParsedUnit {
  name: string;
  floor: string | null;
  apartment: string | null;
  coefficient: number | null;
}

export interface UnitsParseResult {
  units: ParsedUnit[];
  errors: string[];
  coefficientSum: number;
}

const HEADER_WORDS = /^(unidad|uf|u\.f\.|nombre|departamento|depto|dpto|piso|coef|coeficiente|porcentaje|%)/i;
export const MAX_IMPORT_ROWS = 500;

/** "4,25" · "4.25" · "4,25 %" · "1.234,5" → número. Devuelve null si está vacío, NaN si no es un número. */
export function parseCoefficient(raw: string): number | null {
  const s = raw.replace(/%/g, '').replace(/\s/g, '');
  if (!s) return null;
  let normalized = s;
  if (s.includes(',') && s.includes('.')) {
    // El último separador es el decimal.
    normalized = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    normalized = s.replace(',', '.');
  }
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return NaN;
  return Number(normalized);
}

function splitRow(line: string): string[] {
  const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : line.includes('|') ? '|' : null;
  if (sep) return line.split(sep).map(c => c.trim());
  // Con coma como separador no podemos distinguir el decimal: solo "Unidad, Coeficiente con punto".
  if (line.includes(',')) {
    const i = line.indexOf(',');
    return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
  }
  return [line.trim()];
}

export function parseUnitsPaste(text: string, existingNames: string[] = []): UnitsParseResult {
  const errors: string[] = [];
  const units: ParsedUnit[] = [];
  const seen = new Set(existingNames.map(n => n.trim().toLowerCase()));
  const lines = (text || '').split(/\r?\n/).map(l => l.replace(/ /g, ' ')).filter(l => l.trim() !== '');

  if (lines.length > MAX_IMPORT_ROWS) {
    return { units: [], errors: [`Son demasiadas filas (${lines.length}). El máximo por vez es ${MAX_IMPORT_ROWS}.`], coefficientSum: 0 };
  }

  lines.forEach((line, idx) => {
    const cells = splitRow(line);
    const rowNo = idx + 1;
    if (idx === 0 && HEADER_WORDS.test(cells[0] || '')) return; // fila de encabezados

    const name = (cells[0] || '').trim();
    if (!name) { errors.push(`Fila ${rowNo}: falta el nombre de la unidad.`); return; }
    if (name.length > 40) { errors.push(`Fila ${rowNo}: el nombre "${name.slice(0, 20)}…" es demasiado largo.`); return; }

    let floor: string | null = null;
    let apartment: string | null = null;
    let coefRaw = '';
    if (cells.length === 2) {
      coefRaw = cells[1];
    } else if (cells.length === 3) {
      floor = cells[1] || null;
      coefRaw = cells[2];
    } else if (cells.length >= 4) {
      floor = cells[1] || null;
      apartment = cells[2] || null;
      coefRaw = cells[3];
    }

    const coefficient = parseCoefficient(coefRaw || '');
    if (coefficient !== null && (Number.isNaN(coefficient) || coefficient < 0 || coefficient > 100)) {
      errors.push(`Fila ${rowNo} (${name}): el coeficiente "${coefRaw}" no es válido. Usá un porcentaje entre 0 y 100.`);
      return;
    }

    const key = name.toLowerCase();
    if (seen.has(key)) { errors.push(`Fila ${rowNo}: la unidad "${name}" ya existe o está repetida.`); return; }
    seen.add(key);
    units.push({ name, floor, apartment, coefficient });
  });

  const coefficientSum = Math.round(units.reduce((s, u) => s + (u.coefficient ?? 0), 0) * 1000) / 1000;
  return { units, errors, coefficientSum };
}
