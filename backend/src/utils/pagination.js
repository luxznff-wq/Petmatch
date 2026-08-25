export const DEFAULT_PAGE_SIZE = 12; // §17: 12 mascotas por página.
export const MAX_PAGE_SIZE = 50;

/** Normaliza `page`/`limit` de la query string a enteros seguros. */
export function resolvePagination({ page, limit } = {}) {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);

  const safePage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  return { page: safePage, limit: safeLimit, offset: (safePage - 1) * safeLimit };
}

/** Pagina un arreglo ya materializado (modo memoria). */
export function paginateArray(items, { page, limit }) {
  const offset = (page - 1) * limit;
  return { data: items.slice(offset, offset + limit), total: items.length };
}
