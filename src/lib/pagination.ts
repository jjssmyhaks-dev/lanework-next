/**
 * Reusable pagination for list API endpoints.
 *
 * Usage:
 *   const { limit, offset, page } = parsePagination(request);
 *   const rows = await sql`SELECT * FROM items LIMIT ${limit} OFFSET ${offset}`;
 *   const [countResult] = await sql`SELECT COUNT(*)::int AS count FROM items`;
 *   return NextResponse.json(paginate(rows, countResult.count, { limit, offset, page }));
 */

export interface PaginationParams {
  limit: number;
  offset: number;
  page: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

/**
 * Parse pagination params from URL search params.
 * Accepts ?page=1&limit=20 or ?offset=0&limit=20
 */
export function parsePagination(request: Request): PaginationParams {
  const { searchParams } = new URL(request.url);

  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
    MAX_LIMIT
  );

  // Support both ?page= and ?offset= styles
  const pageParam = searchParams.get("page");
  const offsetParam = searchParams.get("offset");

  let page = 1;
  let offset = 0;

  if (offsetParam !== null) {
    offset = Math.max(0, parseInt(offsetParam, 10) || 0);
    page = Math.floor(offset / limit) + 1;
  } else if (pageParam !== null) {
    page = Math.max(1, parseInt(pageParam, 10) || 1);
    offset = (page - 1) * limit;
  }

  return { limit, offset, page };
}

/**
 * Wrap query results in a paginated response shape.
 */
export function paginate<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}
