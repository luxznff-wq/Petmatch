/**
 * Derivación del grupo etario (§15) y de la etiqueta legible (§11).
 *
 * Cuando el refugio conoce la fecha de nacimiento, ambos valores se calculan;
 * si no, se respeta lo que el refugio haya declarado manualmente.
 */

export const AGE_GROUPS = ['Cachorro', 'Joven', 'Adulto', 'Senior'];

/** Meses cumplidos entre `birthDate` y hoy. */
export function monthsSince(birthDate, now = new Date()) {
  const birth = birthDate instanceof Date ? birthDate : new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return null;

  let months =
    (now.getUTCFullYear() - birth.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - birth.getUTCMonth());
  if (now.getUTCDate() < birth.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export function ageGroupFromMonths(months) {
  if (months == null) return null;
  if (months < 12) return 'Cachorro';
  if (months < 36) return 'Joven';
  if (months < 96) return 'Adulto';
  return 'Senior';
}

export function ageLabelFromMonths(months) {
  if (months == null) return null;
  if (months < 1) return 'Recién nacido';
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'año' : 'años'}`;
}

/**
 * Completa `ageGroup` y `ageLabel` a partir de `birthDate` cuando esté presente.
 * Devuelve un objeto nuevo; no muta la entrada.
 */
export function resolveAge({ birthDate, ageGroup, ageLabel }, now = new Date()) {
  const months = birthDate ? monthsSince(birthDate, now) : null;
  return {
    ageGroup: months != null ? ageGroupFromMonths(months) : (ageGroup ?? null),
    ageLabel: months != null ? ageLabelFromMonths(months) : (ageLabel ?? null)
  };
}
