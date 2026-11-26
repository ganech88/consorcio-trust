// ¿Hay novedades (reclamos, pagos, reservas) posteriores a la última vez que el
// usuario abrió la campanita? Evita el punto rojo permanente.

interface Dated { created_at?: string | null; updated_at?: string | null }

export function hasUnseenNotifications(lists: Array<Dated[] | null | undefined>, seenAt: number): boolean {
  for (const list of lists) {
    for (const item of list ?? []) {
      const stamp = Date.parse(item.updated_at || item.created_at || '');
      if (!Number.isNaN(stamp) && stamp > seenAt) return true;
    }
  }
  return false;
}
