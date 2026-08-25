import { z } from 'zod';

/** Cadena obligatoria, recortada, con longitud mínima y máxima. */
export const text = (min, max, label = 'Este campo') =>
  z
    .string({ message: `${label} es obligatorio` })
    .trim()
    .min(min, `${label} debe tener al menos ${min} caracteres`)
    .max(max, `${label} no puede superar los ${max} caracteres`);

/** Cadena opcional: '' se normaliza a `undefined` para no guardar vacíos. */
export const optionalText = (max, label = 'Este campo') =>
  z
    .string()
    .trim()
    .max(max, `${label} no puede superar los ${max} caracteres`)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

export const email = z
  .string({ message: 'El correo es obligatorio' })
  .trim()
  .email('Ingresa un correo electrónico válido')
  .max(180)
  .transform((value) => value.toLowerCase());

/** Teléfono internacional flexible: dígitos, espacios, guiones y paréntesis. */
export const phone = z
  .string()
  .trim()
  .regex(/^[+]?[\d\s()-]{6,30}$/, 'Ingresa un teléfono válido')
  .optional()
  .transform((value) => (value === '' ? undefined : value));

export const requiredPhone = z
  .string({ message: 'El teléfono es obligatorio' })
  .trim()
  .regex(/^[+]?[\d\s()-]{6,30}$/, 'Ingresa un teléfono válido');

/**
 * Contraseña segura (§72): mínimo 8 caracteres con mayúscula, minúscula
 * y número. Se exige en el registro, no en el login.
 */
export const password = z
  .string({ message: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede superar los 72 caracteres')
  .regex(/[a-z]/, 'Incluye al menos una minúscula')
  .regex(/[A-Z]/, 'Incluye al menos una mayúscula')
  .regex(/\d/, 'Incluye al menos un número');

export const url = z
  .string()
  .trim()
  .url('Ingresa una URL válida')
  .max(600)
  .optional()
  .transform((value) => (value === '' ? undefined : value));

/** Identificador numérico positivo procedente de la ruta o del cuerpo. */
export const id = z.coerce
  .number()
  .int('El identificador debe ser un número entero')
  .positive('El identificador debe ser positivo');

export const idParams = z.object({ id });

/** Query string de paginación (§59). */
export const paginationQuery = {
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional()
};

/**
 * Convierte 'true'/'false'/'1'/'0' de la query string en booleano.
 * Cualquier otro valor deja el filtro sin aplicar.
 */
export const booleanQuery = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === 'true' || value === '1'));
