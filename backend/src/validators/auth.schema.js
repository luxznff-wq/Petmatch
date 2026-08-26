import { z } from 'zod';
import { email, optionalText, password, phone, text } from './common.schema.js';

/**
 * Registro público (§24).
 *
 * Sólo se permite crear cuentas ADOPTANTE o REFUGIO: el rol ADMINISTRADOR
 * se otorga desde el seed o desde otra cuenta administrativa, nunca por
 * autoservicio (§88.10).
 */
export const registerSchema = z.object({
  firstName: text(2, 80, 'El nombre'),
  lastName: text(2, 80, 'Los apellidos'),
  email,
  password,
  phone,
  address: optionalText(300, 'La dirección'),
  city: text(2, 100, 'La ciudad'),
  role: z.enum(['ADOPTANTE', 'REFUGIO']).default('ADOPTANTE'),

  // §32 aplicado al registro: la aceptación debe ser un acto afirmativo y
  // explícito, no una casilla premarcada ni un consentimiento tácito.
  acceptedTerms: z.literal(true, {
    message: 'Debes aceptar los términos y condiciones para crear una cuenta'
  }),
  acceptedPrivacy: z.literal(true, {
    message: 'Debes aceptar la política de privacidad para crear una cuenta'
  })
});

export const loginSchema = z.object({
  email,
  password: z.string({ message: 'La contraseña es obligatoria' }).min(1, 'Ingresa tu contraseña')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
  newPassword: password
});
