import { z } from 'zod';
import {
  email,
  id,
  optionalText,
  paginationQuery,
  requiredPhone,
  text
} from './common.schema.js';

export const REQUEST_STATUSES = [
  'PENDIENTE',
  'EN_REVISION',
  'ENTREVISTA',
  'APROBADA',
  'RECHAZADA',
  'CANCELADA',
  'ADOPCION_COMPLETADA'
];
export const HOUSING_TYPES = ['Casa', 'Departamento', 'Otro'];
export const INTERVIEW_MODALITIES = ['Presencial', 'Videollamada', 'Telefónica'];
export const INTERVIEW_RESULTS = ['Pendiente', 'Aprobada', 'No aprobada'];

/**
 * Formulario completo de solicitud (§28-§32).
 *
 * `superRefine` implementa la regla condicional de §30: quien declara haber
 * tenido mascotas antes debe describir su experiencia.
 */
export const adoptionRequestSchema = z
  .object({
    petId: id,
    applicant: z.object({
      name: text(5, 160, 'El nombre completo'),
      age: z.coerce
        .number()
        .int('La edad debe ser un número entero')
        .min(18, 'Debes ser mayor de edad para adoptar')
        .max(120, 'Ingresa una edad válida'),
      phone: requiredPhone,
      email,
      address: text(5, 300, 'La dirección'),
      city: text(2, 100, 'La ciudad')
    }),
    housing: z.object({
      type: z.enum(HOUSING_TYPES, { message: 'Selecciona el tipo de vivienda' }),
      hasYard: z.boolean(),
      livesAlone: z.boolean(),
      hasOtherPets: z.boolean(),
      hasChildren: z.boolean()
    }),
    hadPetsBefore: z.boolean().default(false),
    experience: optionalText(2000, 'La experiencia'),
    motivation: text(20, 3000, 'La motivación'),
    declarationAccepted: z.literal(true, {
      message: 'Debes declarar que la información proporcionada es verdadera'
    })
  })
  .superRefine((value, context) => {
    if (value.hadPetsBefore && !value.experience) {
      context.addIssue({
        code: 'custom',
        path: ['experience'],
        message: 'Cuéntanos sobre tu experiencia con mascotas'
      });
    }
  });

export const requestStatusSchema = z.object({
  status: z.enum(REQUEST_STATUSES, { message: 'Estado de solicitud inválido' }),
  reviewNotes: optionalText(2000, 'Las observaciones')
});

export const requestQuerySchema = z.object({
  status: z.enum(REQUEST_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
  ...paginationQuery
});

/** Programación de entrevista (§36). */
export const interviewSchema = z.object({
  scheduledAt: z
    .string({ message: 'La fecha y hora son obligatorias' })
    .datetime({ offset: true, message: 'Usa una fecha ISO 8601 con zona horaria' }),
  modality: z.enum(INTERVIEW_MODALITIES, { message: 'Selecciona una modalidad' }),
  notes: optionalText(2000, 'Las observaciones')
});

export const interviewUpdateSchema = z
  .object({
    scheduledAt: z.string().datetime({ offset: true }).optional(),
    modality: z.enum(INTERVIEW_MODALITIES).optional(),
    notes: optionalText(2000, 'Las observaciones'),
    result: z.enum(INTERVIEW_RESULTS).optional()
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    'Envía al menos un campo para actualizar'
  );

export const adoptionSchema = z.object({
  requestId: id,
  notes: optionalText(2000, 'Las observaciones')
});
