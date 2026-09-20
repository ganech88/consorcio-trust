// Interés por mora sobre expensas vencidas.
// Fórmula única (la misma viven en las edge functions y en la función SQL
// public.late_interest): interés simple prorrateado por día:
//   interés = capital * (tasaMensual/100) * (díasDeAtraso / 30)
// donde díasDeAtraso cuenta desde (vencimiento + díasDeGracia).

export interface LateInterestConfig {
  late_interest_monthly_pct?: number | string | null;
  late_interest_grace_days?: number | string | null;
}

function toDateOnly(d: string | Date): Date {
  if (d instanceof Date) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // 'YYYY-MM-DD' -> local midnight (evita el corrimiento UTC de new Date('YYYY-MM-DD'))
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}

/** Días de atraso (>= 0) descontando los días de gracia. */
export function daysOverdue(dueDate: string | Date | null | undefined, graceDays = 0, asOf: string | Date = new Date()): number {
  if (!dueDate) return 0;
  const due = toDateOnly(dueDate);
  due.setDate(due.getDate() + (Number(graceDays) || 0));
  const days = Math.floor((toDateOnly(asOf).getTime() - due.getTime()) / 86400000);
  return days > 0 ? days : 0;
}

/** Interés por mora en pesos, redondeado a centavos. */
export function computeLateInterest(
  amount: number | string,
  dueDate: string | Date | null | undefined,
  config: LateInterestConfig | null | undefined,
  asOf: string | Date = new Date(),
): number {
  const capital = Number(amount) || 0;
  const pct = Number(config?.late_interest_monthly_pct) || 0;
  if (capital <= 0 || pct <= 0) return 0;
  const days = daysOverdue(dueDate, Number(config?.late_interest_grace_days) || 0, asOf);
  if (days <= 0) return 0;
  return Math.round(capital * (pct / 100) * (days / 30) * 100) / 100;
}

/** Capital + interés. */
export function amountWithInterest(
  amount: number | string,
  dueDate: string | Date | null | undefined,
  config: LateInterestConfig | null | undefined,
  asOf: string | Date = new Date(),
): { base: number; interest: number; total: number; days: number } {
  const base = Number(amount) || 0;
  const interest = computeLateInterest(base, dueDate, config, asOf);
  const days = daysOverdue(dueDate, Number(config?.late_interest_grace_days) || 0, asOf);
  return { base, interest, total: Math.round((base + interest) * 100) / 100, days };
}
