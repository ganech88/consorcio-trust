// Prorrateo de una liquidación entre unidades según su coeficiente de
// copropiedad (% sobre 100). Lógica pura, sin Supabase, para poder testearla.

export interface UnitLike {
  id: string;
  name: string;
  coefficient?: number | string | null;
  owner_id?: string | null;
  tenant_id?: string | null;
}

export interface DistributedRow {
  unit_uuid: string;
  unit_id: string;      // nombre visible de la unidad (columna legacy)
  user_id: string | null;
  amount: number;
}

export interface DistributionResult {
  rows: DistributedRow[];
  excluded: UnitLike[];   // sin coeficiente o coeficiente 0
  sumCoefficient: number; // suma de coeficientes de las unidades facturadas
  coefficientOk: boolean; // |suma - 100| < 0.5
  distributed: number;    // suma de importes asignados
  undistributed: number;  // total - distributed (>= 0)
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Reparte `total` según coeficiente. Redondea a centavos y corrige el
 * desvío de redondeo (si es < $1) en la última unidad, así la suma cierra
 * exactamente con el total cuando los coeficientes suman 100.
 */
export function distributeByCoefficient(total: number | string, units: UnitLike[]): DistributionResult {
  const t = Number(total) || 0;
  const withCoef = units.filter(u => u.coefficient != null && Number(u.coefficient) > 0);
  const excluded = units.filter(u => u.coefficient == null || Number(u.coefficient) <= 0);
  const rows: DistributedRow[] = withCoef.map(u => ({
    unit_uuid: u.id,
    unit_id: u.name,
    user_id: u.owner_id || u.tenant_id || null,
    amount: round2(t * Number(u.coefficient) / 100),
  }));
  const sumCoefficient = round2(withCoef.reduce((s, u) => s + Number(u.coefficient), 0));
  const coefficientOk = Math.abs(sumCoefficient - 100) < 0.5;
  if (rows.length > 0 && coefficientOk) {
    const sumAmt = rows.reduce((s, r) => s + r.amount, 0);
    const drift = round2(t - sumAmt);
    if (drift !== 0 && Math.abs(drift) < 1) rows[rows.length - 1].amount = round2(rows[rows.length - 1].amount + drift);
  }
  const distributed = round2(rows.reduce((s, r) => s + r.amount, 0));
  return { rows, excluded, sumCoefficient, coefficientOk, distributed, undistributed: Math.max(0, round2(t - distributed)) };
}
