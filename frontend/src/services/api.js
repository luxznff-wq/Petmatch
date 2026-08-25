/**
 * Cliente HTTP de la API de PetMatch.
 *
 * Centraliza la URL base, el token JWT y el desempaquetado del sobre
 * `{ success, data }` para que las páginas trabajen con datos, no con
 * respuestas HTTP.
 */

// En desarrollo el proxy de Vite reenvía `/api` al backend, así que la ruta
// relativa funciona sin configurar nada. En producción se define VITE_API_URL.
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export const TOKEN_KEY = 'petmatch_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Modo privado o almacenamiento bloqueado: la sesión durará lo que la pestaña.
  }
}

/** Error de API con el código HTTP y los detalles de validación. */
export class ApiError extends Error {
  constructor(message, { status, errors } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors ?? [];
  }

  /** Mensaje asociado a un campo concreto del formulario. */
  fieldError(field) {
    return this.errors.find((issue) => issue.field === field)?.message;
  }
}

/** Suscriptores que reaccionan a un 401 (sesión expirada). */
const unauthorizedHandlers = new Set();

export function onUnauthorized(handler) {
  unauthorizedHandlers.add(handler);
  return () => unauthorizedHandlers.delete(handler);
}

async function request(path, { method = 'GET', body, signal, raw = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('No pudimos conectar con el servidor. Revisa tu conexión.', { status: 0 });
  }

  if (response.status === 204) return null;

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (response.status === 401) unauthorizedHandlers.forEach((handler) => handler());
    throw new ApiError(payload?.message ?? 'No se pudo completar la operación', {
      status: response.status,
      errors: payload?.errors
    });
  }

  // `raw` conserva el sobre completo cuando hace falta la paginación.
  return raw ? payload : payload?.data;
}

/** Serializa filtros a query string omitiendo valores vacíos. */
export function toQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

/* ------------------------------------------------------------------ API */

export const authApi = {
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  changePassword: (data) => request('/auth/password', { method: 'PATCH', body: data })
};

export const petsApi = {
  list: (filters, signal) => request(`/pets${toQuery(filters)}`, { raw: true, signal }),
  get: (id) => request(`/pets/${id}`),
  create: (data) => request('/pets', { method: 'POST', body: data }),
  update: (id, data) => request(`/pets/${id}`, { method: 'PUT', body: data }),
  setStatus: (id, status) => request(`/pets/${id}/status`, { method: 'PATCH', body: { status } }),
  remove: (id) => request(`/pets/${id}`, { method: 'DELETE' }),
  images: (id) => request(`/pets/${id}/images`),
  addImage: (id, data) => request(`/pets/${id}/images`, { method: 'POST', body: data }),
  removeImage: (id, imageId) => request(`/pets/${id}/images/${imageId}`, { method: 'DELETE' })
};

export const sheltersApi = {
  list: (filters) => request(`/shelters${toQuery(filters)}`, { raw: true }),
  get: (id) => request(`/shelters/${id}`),
  pets: (id, filters) => request(`/shelters/${id}/pets${toQuery(filters)}`, { raw: true }),
  mine: () => request('/shelters/me'),
  create: (data) => request('/shelters', { method: 'POST', body: data }),
  update: (id, data) => request(`/shelters/${id}`, { method: 'PUT', body: data }),
  setStatus: (id, status) =>
    request(`/shelters/${id}/status`, { method: 'PATCH', body: { status } })
};

export const favoritesApi = {
  list: () => request('/favorites'),
  ids: () => request('/favorites/ids'),
  add: (petId) => request(`/favorites/${petId}`, { method: 'POST' }),
  remove: (petId) => request(`/favorites/${petId}`, { method: 'DELETE' })
};

export const requestsApi = {
  list: (filters) => request(`/adoptions/requests${toQuery(filters)}`, { raw: true }),
  get: (id) => request(`/adoptions/requests/${id}`),
  create: (data) => request('/adoptions/requests', { method: 'POST', body: data }),
  setStatus: (id, body) =>
    request(`/adoptions/requests/${id}/status`, { method: 'PATCH', body }),
  cancel: (id) => request(`/adoptions/requests/${id}`, { method: 'DELETE' }),
  interviews: (id) => request(`/adoptions/requests/${id}/interviews`),
  scheduleInterview: (id, data) =>
    request(`/adoptions/requests/${id}/interviews`, { method: 'POST', body: data })
};

export const interviewsApi = {
  mine: () => request('/interviews'),
  update: (id, data) => request(`/interviews/${id}`, { method: 'PUT', body: data })
};

export const adoptionsApi = {
  list: (filters) => request(`/adoptions${toQuery(filters)}`, { raw: true }),
  get: (id) => request(`/adoptions/${id}`),
  create: (data) => request('/adoptions', { method: 'POST', body: data })
};

export const usersApi = {
  list: (filters) => request(`/users${toQuery(filters)}`, { raw: true }),
  get: (id) => request(`/users/${id}`),
  update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: data }),
  setStatus: (id, status) => request(`/users/${id}/status`, { method: 'PATCH', body: { status } }),
  remove: (id) => request(`/users/${id}`, { method: 'DELETE' })
};

export const notificationsApi = {
  list: () => request('/notifications'),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request('/notifications/read-all', { method: 'PATCH' })
};

export const reportsApi = {
  adoptions: () => request('/reports/adoptions'),
  pets: () => request('/reports/pets'),
  requests: () => request('/reports/requests'),
  shelters: () => request('/reports/shelters')
};

export const adminApi = {
  dashboard: () => request('/admin/dashboard'),
  audit: (filters) => request(`/admin/audit${toQuery(filters)}`, { raw: true })
};

export const statsApi = {
  public: () => request('/stats')
};

export const workspaceApi = {
  get: () => request('/workspace')
};
