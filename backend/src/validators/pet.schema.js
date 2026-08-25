import { z } from 'zod';
import { booleanQuery, id, optionalText, paginationQuery, text, url } from './common.schema.js';

export const SPECIES = ['Perro', 'Gato', 'Conejo', 'Ave', 'Roedor', 'Otro'];
export const SEXES = ['Macho', 'Hembra'];
export const SIZES = ['Pequeño', 'Mediano', 'Grande'];
export const AGE_GROUPS = ['Cachorro', 'Joven', 'Adulto', 'Senior'];
export const PET_STATUSES = ['DISPONIBLE', 'EN_PROCESO', 'ADOPTADA', 'NO_DISPONIBLE'];
export const SORTS = ['recent', 'oldest', 'name-asc', 'name-desc'];

/** Características y compatibilidad de la mascota (§19, §20). */
const attributesSchema = z
  .object({
    vaccinated: z.boolean(),
    sterilized: z.boolean(),
    dewormed: z.boolean(),
    goodWithChildren: z.boolean(),
    goodWithDogs: z.boolean(),
    goodWithCats: z.boolean(),
    sociable: z.boolean(),
    specialCare: z.boolean()
  })
  .partial()
  .optional();

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Fecha inválida')
  .refine(
    (value) => new Date(`${value}T00:00:00Z`) <= new Date(),
    'La fecha de nacimiento no puede estar en el futuro'
  )
  .optional();

export const petSchema = z.object({
  // Sólo lo usa el administrador para publicar en nombre de un refugio; el
  // refugio siempre publica en el suyo y el servicio ignora este campo.
  shelterId: id.optional(),
  name: text(2, 100, 'El nombre'),
  species: z.enum(SPECIES, { message: 'Selecciona una especie válida' }),
  breed: optionalText(100, 'La raza'),
  sex: z.enum(SEXES, { message: 'Selecciona el sexo' }),
  size: z.enum(SIZES).optional(),
  // Si se envía `birthDate`, el modelo recalcula el grupo etario y la etiqueta.
  ageGroup: z.enum(AGE_GROUPS).optional(),
  ageLabel: optionalText(40, 'La edad'),
  birthDate: isoDate,
  color: optionalText(80, 'El color'),
  weightKg: z.coerce.number().positive('El peso debe ser mayor que cero').max(200).optional(),
  description: optionalText(3000, 'La descripción'),
  story: optionalText(5000, 'La historia'),
  address: optionalText(300, 'La ubicación'),
  city: text(2, 100, 'La ciudad'),
  region: optionalText(100, 'La región'),
  image: url,
  attributes: attributesSchema,
  status: z.enum(PET_STATUSES).default('DISPONIBLE')
});

export const petStatusSchema = z.object({
  status: z.enum(PET_STATUSES, { message: 'Estado de mascota inválido' })
});

export const petImageSchema = z.object({
  url: z
    .string({ message: 'La URL de la fotografía es obligatoria' })
    .trim()
    .url('Ingresa una URL válida')
    .max(600),
  isPrimary: z.boolean().default(false)
});

/** Filtros de la exploración pública (§14-§17, §58). */
export const petQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  species: z.enum(SPECIES).optional(),
  sex: z.enum(SEXES).optional(),
  size: z.enum(SIZES).optional(),
  ageGroup: z.enum(AGE_GROUPS).optional(),
  status: z.enum(PET_STATUSES).optional(),
  city: z.string().trim().max(100).optional(),
  region: z.string().trim().max(100).optional(),
  shelterId: id.optional(),
  vaccinated: booleanQuery,
  sterilized: booleanQuery,
  dewormed: booleanQuery,
  goodWithChildren: booleanQuery,
  goodWithDogs: booleanQuery,
  goodWithCats: booleanQuery,
  sociable: booleanQuery,
  specialCare: booleanQuery,
  sort: z.enum(SORTS).default('recent'),
  ...paginationQuery
});
