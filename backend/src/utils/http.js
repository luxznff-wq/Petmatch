/**
 * Formato único de respuesta de la API (§68, §69, §70).
 */

export function ok(res, data) {
  return res.status(200).json({ success: true, data });
}

export function created(res, data) {
  return res.status(201).json({ success: true, data });
}

export function noContent(res) {
  return res.status(204).end();
}

export function paginated(res, { data, page, limit, total }) {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0
    }
  });
}
