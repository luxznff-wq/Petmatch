import { z } from 'zod';
import { optionalText, paginationQuery, phone, text, url } from './common.schema.js';

export const SHELTER_STATUSES = ['PENDIENTE', 'VERIFICADO', 'SUSPENDIDO'];

/** Perfil del refugio (§39). */
export const shelterSchema = z.object({
  name: text(3, 160, 'El nombre del refugio'),
  logoUrl: url,
  description: optionalText(3000, 'La descripción'),
  address: optionalText(300, 'La dirección'),
  city: text(2, 100, 'La ciudad'),
  region: optionalText(100, 'La región'),
  phone,
  email: z
    .string()
    .trim()
    .email('Ingresa un correo válido')
    .max(180)
    .optional()
    .transform((value) => (value === '' ? undefined : value?.toLowerCase())),
  website: url,
  social: z
    .object({
      facebook: url,
      instagram: url,
      tiktok: url,
      whatsapp: optionalText(40, 'El WhatsApp')
    })
    .partial()
    .default({}),
  hours: optionalText(300, 'Los horarios')
});

export const shelterStatusSchema = z.object({
  status: z.enum(SHELTER_STATUSES, { message: 'Estado de refugio inválido' })
});

export const shelterQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  city: z.string().trim().max(100).optional(),
  status: z.enum(SHELTER_STATUSES).optional(),
  ...paginationQuery
});
