export const PAGE_SIZE = 20;

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Agrega .range() a un query builder de Supabase y devuelve resultados paginados.
 * El builder de postgrest no se tipa bien de forma estructural, por eso usamos any
 * para el query (el resto de la firma sí queda tipado).
 */
export async function paginateQuery<T = unknown>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  page = 0,
  pageSize = PAGE_SIZE,
): Promise<Paginated<T>> {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  const total: number = count ?? data?.length ?? 0;
  return { data: (data || []) as T[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
