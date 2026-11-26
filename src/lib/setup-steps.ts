// Primeros pasos del administrador: qué le falta configurar a un consorcio nuevo
// para poder liquidar y cobrar su primera expensa. Lógica pura (testeable).

export interface SetupInput {
  unitsCount: number;
  /** Suma de coeficientes de las unidades (en %). */
  coefficientSum: number;
  hasPaymentMethod: boolean;
  /** Miembros del consorcio sin contar al administrador. */
  residentsCount: number;
  invitesCount: number;
  periodsCount: number;
}

export interface SetupStep {
  id: 'units' | 'coefficients' | 'payment' | 'invite' | 'period';
  title: string;
  description: string;
  /** Sección del panel admin a la que lleva el botón. */
  tab: string;
  action: string;
  done: boolean;
}

export const COEFFICIENT_TOLERANCE = 0.5;

export function buildSetupSteps(input: SetupInput): SetupStep[] {
  const hasUnits = input.unitsCount > 0;
  const coefOk = hasUnits && Math.abs(input.coefficientSum - 100) < COEFFICIENT_TOLERANCE;
  return [
    {
      id: 'units',
      title: 'Cargá las unidades del edificio',
      description: 'Una por una o pegándolas desde Excel. Ej: 1A, 1B, PB Local.',
      tab: 'unidades',
      action: 'Cargar unidades',
      done: hasUnits,
    },
    {
      id: 'coefficients',
      title: 'Completá los coeficientes',
      description: hasUnits && !coefOk
        ? `Hoy suman ${formatPct(input.coefficientSum)}%. Tienen que sumar 100% para repartir la expensa.`
        : 'El porcentaje de cada unidad según el reglamento. Tienen que sumar 100%.',
      tab: 'unidades',
      action: 'Revisar coeficientes',
      done: coefOk,
    },
    {
      id: 'payment',
      title: 'Indicá cómo te pagan',
      description: 'CBU o alias de la cuenta del consorcio. Los vecinos lo ven al pagar.',
      tab: 'consorcio',
      action: 'Cargar medios de pago',
      done: input.hasPaymentMethod,
    },
    {
      id: 'invite',
      title: 'Invitá a los vecinos',
      description: 'Generá un código por unidad y compartilo por WhatsApp o mail.',
      tab: 'usuarios',
      action: 'Generar invitaciones',
      done: input.residentsCount > 0 || input.invitesCount > 0,
    },
    {
      id: 'period',
      title: 'Publicá tu primera liquidación',
      description: 'Cargás el total del mes y la app reparte según el coeficiente.',
      tab: 'liquidacion',
      action: 'Crear liquidación',
      done: input.periodsCount > 0,
    },
  ];
}

export function setupProgress(steps: SetupStep[]): { done: number; total: number; complete: boolean; next: SetupStep | null } {
  const done = steps.filter(s => s.done).length;
  return { done, total: steps.length, complete: done === steps.length, next: steps.find(s => !s.done) ?? null };
}

function formatPct(n: number): string {
  return (Math.round(n * 100) / 100).toLocaleString('es-AR');
}
