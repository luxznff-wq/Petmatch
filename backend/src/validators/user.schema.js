import { z } from 'zod';
import { optionalText, paginationQuery, phone, text, url } from './common.schema.js';

export const USER_STATUSES = ['ACTIVO', 'SUSPENDIDO'];
export const USER_ROLES = ['ADOPTANTE', 'REFUGIO', 'ADMINISTRADOR'];

/** Edición del perfil (§26). El rol y el estado no se tocan aquí. */
export const userProfileSchema = z.object({
  firstName: text(2, 80, 'El nombre'),
  lastName: text(2, 80, 'Los apellidos'),
  phone,
  address: optionalText(300, 'La dirección'),
  city: text(2, 100, 'La ciudad'),
  avatarUrl: url
});

export const userStatusSchema = z.object({
  status: z.enum(USER_STATUSES, { message: 'Estado de usuario inválido' })
});

export const userQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  ...paginationQuery
});

export const auditQuerySchema = z.object({
  entityType: z.string().trim().max(80).optional(),
  ...paginationQuery
});
