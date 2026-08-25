import { STATUS_LABELS, STATUS_TONES } from './constants.js';

/** Traduce un estado de la API a su etiqueta en español. */
export const statusLabel = (status) => STATUS_LABELS[status] ?? status ?? '—';

/** Tono visual asociado a un estado. */
export const statusTone = (status) => STATUS_TONES[status] ?? 'neutral';

const dateFormatter = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

/** Convierte 'YYYY-MM-DD' o un ISO completo en una fecha válida. */
function toDate(value) {
  if (!value) return null;
  // Una fecha sin hora se interpreta en UTC; se ancla al mediodía para que el
  // cambio de zona horaria no la desplace un día.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : '—';
}

export function formatDateTime(value) {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : '—';
}

/** Distancia relativa en palabras: "hace 3 días". */
export function formatRelative(value) {
  const date = toDate(value);
  if (!date) return '—';

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3600],
    ['minute', 60]
  ];
  const formatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

  for (const [unit, secondsInUnit] of units) {
    if (Math.abs(seconds) >= secondsInUnit) {
      return formatter.format(Math.round(seconds / secondsInUnit), unit);
    }
  }
  return formatter.format(seconds, 'second');
}

/** Separador de miles para las estadísticas de la portada (§10). */
export const formatNumber = (value) => new Intl.NumberFormat('es-PE').format(value ?? 0);

/** Resumen de una línea con especie, sexo y edad. */
export function petSummary(pet) {
  return [pet.species, pet.sex, pet.ageLabel].filter(Boolean).join(' · ');
}

export const fullName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '—';

/** Iniciales para el avatar del panel. */
export function initials(user) {
  const letters = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;
  return letters.toUpperCase() || '?';
}

/** Convierte un ISO a `YYYY-MM-DDTHH:mm` para <input type="datetime-local">. */
export function toDateTimeLocal(value) {
  const date = toDate(value);
  if (!date) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
