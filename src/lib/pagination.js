export const PAGE_SIZE = 20;

/**
 * Adds .range() to a Supabase query builder and returns paginated results with total count.
 * @param {object} query - Supabase query builder (must NOT have been awaited yet)
 * @param {number} page - 0-based page index
 * @param {number} [pageSize=PAGE_SIZE]
 * @returns {Promise<{ data: any[], total: number, page: number, pageSize: number, totalPages: number }>}
 */
export async function paginateQuery(query, page = 0, pageSize = PAGE_SIZE) {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .range(from, to);

  if (error) throw error;

  const total = count ?? data?.length ?? 0;

  return {
    data: data || [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
