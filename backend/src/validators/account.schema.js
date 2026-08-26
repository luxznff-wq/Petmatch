import { z } from 'zod';
import { email, password } from './common.schema.js';

/** Solicitud de enlace de recuperación (§25 ampliado). */
export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string({ message: 'Falta el enlace de recuperación' }).min(20, 'Enlace inválido'),
  newPassword: password
});

export const verifyEmailSchema = z.object({
  token: z.string({ message: 'Falta el enlace de verificación' }).min(20, 'Enlace inválido')
});

/** Baja voluntaria: se confirma con la contraseña por ser irreversible. */
export const deleteAccountSchema = z.object({
  password: z.string({ message: 'Confirma tu contraseña' }).min(1, 'Confirma tu contraseña'),
  confirmation: z.literal('ELIMINAR', {
    message: 'Escribe ELIMINAR para confirmar la baja'
  })
});
