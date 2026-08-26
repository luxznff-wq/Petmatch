import { env } from '../config/env.js';
import { AGE_GROUPS, PET_STATUSES, SEXES, SIZES, SORTS, SPECIES } from '../validators/pet.schema.js';
import {
  HOUSING_TYPES,
  INTERVIEW_MODALITIES,
  INTERVIEW_RESULTS,
  REQUEST_STATUSES
} from '../validators/adoption.schema.js';
import { SHELTER_STATUSES } from '../validators/shelter.schema.js';
import { USER_ROLES, USER_STATUSES } from '../validators/user.schema.js';

/**
 * Especificación OpenAPI 3.0.3 servida en `/api/docs` (§33 de los issues, §94).
 *
 * Se escribe a mano en lugar de generarse para que los enums provengan de los
 * mismos validadores que usa la API: si un estado cambia, la documentación
 * cambia con él.
 */

const bearer = [{ bearerAuth: [] }];
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

const jsonBody = (schema, required = true) => ({
  required,
  content: { 'application/json': { schema } }
});

const jsonResponse = (description, schema) => ({
  description,
  content: { 'application/json': { schema } }
});

/** Envoltorio `{ success, data }` de las respuestas correctas (§68). */
const envelope = (dataSchema) => ({
  type: 'object',
  properties: { success: { type: 'boolean', example: true }, data: dataSchema }
});

/** Envoltorio con paginación (§69). */
const pagedEnvelope = (itemSchema) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: { type: 'array', items: itemSchema },
    pagination: ref('Pagination')
  }
});

const errorResponses = {
  400: jsonResponse('Solicitud inválida', ref('Error')),
  401: jsonResponse('No autenticado', ref('Error')),
  403: jsonResponse('Sin permisos', ref('Error')),
  404: jsonResponse('No encontrado', ref('Error')),
  409: jsonResponse('Conflicto con el estado actual', ref('Error')),
  422: jsonResponse('Datos inválidos', ref('ValidationError'))
};

const pick = (...codes) => Object.fromEntries(codes.map((code) => [code, errorResponses[code]]));

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer', minimum: 1 }
};

const queryParam = (name, schema, description) => ({ name, in: 'query', schema, description });
const enumParam = (name, values, description) =>
  queryParam(name, { type: 'string', enum: values }, description);
const boolParam = (name, description) =>
  queryParam(name, { type: 'boolean' }, description);

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'PetMatch API',
    version: '1.1.0',
    description:
      'API REST de PetMatch: gestión y adopción responsable de mascotas.\n\n' +
      'Autenticación por JWT (`Authorization: Bearer <token>`) y autorización por rol ' +
      '(ADOPTANTE, REFUGIO, ADMINISTRADOR). Todas las respuestas siguen el formato ' +
      '`{ success, data }` y los errores `{ success: false, message }`.',
    license: { name: 'MIT' }
  },
  servers: [
    { url: env.apiUrl, description: 'Servidor actual' },
    { url: 'http://localhost:4000/api', description: 'Desarrollo local' }
  ],
  tags: [
    { name: 'Autenticación', description: 'Registro, sesión y perfil propio' },
    { name: 'Mascotas', description: 'Exploración, CRUD y galería' },
    { name: 'Refugios', description: 'Perfiles y verificación' },
    { name: 'Favoritos', description: 'Mascotas guardadas por el adoptante' },
    { name: 'Solicitudes', description: 'Solicitudes de adopción y su flujo de estados' },
    { name: 'Entrevistas', description: 'Programación y resultados' },
    { name: 'Adopciones', description: 'Cierre del proceso e historial' },
    { name: 'Usuarios', description: 'Perfiles y administración de cuentas' },
    { name: 'Notificaciones', description: 'Avisos internos' },
    { name: 'Reportes', description: 'Estadísticas agregadas' },
    { name: 'Administración', description: 'Panel global y auditoría' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'La mascota no existe' }
        }
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Datos inválidos' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: { field: { type: 'string' }, message: { type: 'string' } }
            }
          }
        }
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 12 },
          total: { type: 'integer', example: 124 },
          totalPages: { type: 'integer', example: 11 }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          city: { type: 'string', nullable: true },
          role: { type: 'string', enum: USER_ROLES },
          status: { type: 'string', enum: USER_STATUSES },
          emailVerifiedAt: { type: 'string', format: 'date-time', nullable: true },
          termsAcceptedAt: { type: 'string', format: 'date-time', nullable: true },
          privacyAcceptedAt: { type: 'string', format: 'date-time', nullable: true },
          legalVersion: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      AuthSession: {
        type: 'object',
        properties: { user: ref('User'), token: { type: 'string' } }
      },
      PetAttributes: {
        type: 'object',
        description: 'Información médica y de compatibilidad (§19, §20)',
        properties: {
          vaccinated: { type: 'boolean' },
          sterilized: { type: 'boolean' },
          dewormed: { type: 'boolean' },
          goodWithChildren: { type: 'boolean' },
          goodWithDogs: { type: 'boolean' },
          goodWithCats: { type: 'boolean' },
          sociable: { type: 'boolean' },
          specialCare: { type: 'boolean' }
        }
      },
      Pet: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          shelterId: { type: 'integer' },
          shelterName: { type: 'string', nullable: true },
          name: { type: 'string' },
          species: { type: 'string', enum: SPECIES },
          breed: { type: 'string', nullable: true },
          sex: { type: 'string', enum: SEXES },
          size: { type: 'string', enum: SIZES, nullable: true },
          ageGroup: { type: 'string', enum: AGE_GROUPS, nullable: true },
          ageLabel: { type: 'string', nullable: true },
          birthDate: { type: 'string', format: 'date', nullable: true },
          color: { type: 'string', nullable: true },
          weightKg: { type: 'number', nullable: true },
          description: { type: 'string', nullable: true },
          story: { type: 'string', nullable: true },
          city: { type: 'string' },
          region: { type: 'string', nullable: true },
          status: { type: 'string', enum: PET_STATUSES },
          admittedAt: { type: 'string', format: 'date' },
          image: { type: 'string', nullable: true },
          attributes: ref('PetAttributes'),
          tags: { type: 'array', items: { type: 'string' } }
        }
      },
      PetInput: {
        type: 'object',
        required: ['name', 'species', 'sex', 'city'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          species: { type: 'string', enum: SPECIES },
          breed: { type: 'string' },
          sex: { type: 'string', enum: SEXES },
          size: { type: 'string', enum: SIZES },
          ageGroup: { type: 'string', enum: AGE_GROUPS },
          ageLabel: { type: 'string' },
          birthDate: { type: 'string', format: 'date' },
          color: { type: 'string' },
          weightKg: { type: 'number', exclusiveMinimum: 0 },
          description: { type: 'string' },
          story: { type: 'string' },
          city: { type: 'string' },
          region: { type: 'string' },
          image: { type: 'string', format: 'uri' },
          attributes: ref('PetAttributes'),
          status: { type: 'string', enum: PET_STATUSES, default: 'DISPONIBLE' }
        }
      },
      PetImage: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          petId: { type: 'integer' },
          url: { type: 'string', format: 'uri' },
          isPrimary: { type: 'boolean' },
          storageKey: { type: 'string', nullable: true, description: 'Presente sólo si el archivo se subió a PetMatch' },
          mimeType: { type: 'string', nullable: true },
          sizeBytes: { type: 'integer', nullable: true }
        }
      },
      Shelter: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          ownerId: { type: 'integer' },
          name: { type: 'string' },
          logoUrl: { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          city: { type: 'string' },
          region: { type: 'string', nullable: true },
          phone: { type: 'string', nullable: true },
          email: { type: 'string', nullable: true },
          website: { type: 'string', nullable: true },
          social: { type: 'object', additionalProperties: { type: 'string' } },
          hours: { type: 'string', nullable: true },
          status: { type: 'string', enum: SHELTER_STATUSES },
          petCount: { type: 'integer' },
          availablePetCount: { type: 'integer' },
          adoptionCount: { type: 'integer' }
        }
      },
      AdoptionRequest: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'integer' },
          petId: { type: 'integer' },
          petName: { type: 'string' },
          shelterId: { type: 'integer' },
          shelterName: { type: 'string' },
          adopterName: { type: 'string' },
          status: { type: 'string', enum: REQUEST_STATUSES },
          applicant: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'integer' },
              phone: { type: 'string' },
              email: { type: 'string' },
              address: { type: 'string' },
              city: { type: 'string' }
            }
          },
          housing: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: HOUSING_TYPES },
              hasYard: { type: 'boolean' },
              livesAlone: { type: 'boolean' },
              hasOtherPets: { type: 'boolean' },
              hasChildren: { type: 'boolean' }
            }
          },
          hadPetsBefore: { type: 'boolean' },
          experience: { type: 'string', nullable: true },
          motivation: { type: 'string' },
          reviewNotes: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      AdoptionRequestInput: {
        type: 'object',
        required: ['petId', 'applicant', 'housing', 'motivation', 'declarationAccepted'],
        properties: {
          petId: { type: 'integer' },
          applicant: {
            type: 'object',
            required: ['name', 'age', 'phone', 'email', 'address', 'city'],
            properties: {
              name: { type: 'string' },
              age: { type: 'integer', minimum: 18 },
              phone: { type: 'string' },
              email: { type: 'string', format: 'email' },
              address: { type: 'string' },
              city: { type: 'string' }
            }
          },
          housing: {
            type: 'object',
            required: ['type', 'hasYard', 'livesAlone', 'hasOtherPets', 'hasChildren'],
            properties: {
              type: { type: 'string', enum: HOUSING_TYPES },
              hasYard: { type: 'boolean' },
              livesAlone: { type: 'boolean' },
              hasOtherPets: { type: 'boolean' },
              hasChildren: { type: 'boolean' }
            }
          },
          hadPetsBefore: { type: 'boolean', default: false },
          experience: { type: 'string', description: 'Obligatorio si hadPetsBefore es true' },
          motivation: { type: 'string', minLength: 20 },
          declarationAccepted: { type: 'boolean', enum: [true] }
        }
      },
      Interview: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          requestId: { type: 'integer' },
          scheduledAt: { type: 'string', format: 'date-time' },
          modality: { type: 'string', enum: INTERVIEW_MODALITIES },
          notes: { type: 'string', nullable: true },
          result: { type: 'string', enum: INTERVIEW_RESULTS },
          petName: { type: 'string' },
          adopterName: { type: 'string' }
        }
      },
      Adoption: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          code: { type: 'string', example: 'ADP-00042' },
          requestId: { type: 'integer' },
          petId: { type: 'integer' },
          petName: { type: 'string' },
          adopterName: { type: 'string' },
          shelterName: { type: 'string' },
          adoptedAt: { type: 'string', format: 'date' },
          notes: { type: 'string', nullable: true }
        }
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          message: { type: 'string' },
          link: { type: 'string', nullable: true },
          read: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      AuditLog: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userEmail: { type: 'string', nullable: true },
          action: { type: 'string' },
          entityType: { type: 'string', nullable: true },
          entityId: { type: 'integer', nullable: true },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      ReportBucket: {
        type: 'object',
        properties: { label: { type: 'string' }, total: { type: 'integer' } }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['Administración'],
        summary: 'Estado del servicio',
        responses: { 200: jsonResponse('Servicio operativo', envelope({ type: 'object' })) }
      }
    },
    '/stats': {
      get: {
        tags: ['Reportes'],
        summary: 'Estadísticas públicas de la portada',
        responses: {
          200: jsonResponse(
            'Totales de la plataforma',
            envelope({
              type: 'object',
              properties: {
                pets: { type: 'integer' },
                adoptions: { type: 'integer' },
                shelters: { type: 'integer' },
                cities: { type: 'integer' }
              }
            })
          )
        }
      }
    },


    '/legal': {
      get: {
        tags: ['Autenticación'],
        summary: 'Versión vigente de los documentos legales y datos del responsable',
        responses: { 200: jsonResponse('Información legal', envelope({ type: 'object' })) }
      }
    },
    '/account/forgot-password': {
      post: {
        tags: ['Autenticación'],
        summary: 'Solicitar un enlace para restablecer la contraseña',
        description:
          'Responde siempre 200, exista o no la cuenta: distinguir ambos casos ' +
          'permitiría averiguar qué correos están registrados.',
        requestBody: jsonBody({
          type: 'object',
          required: ['email'],
          properties: { email: { type: 'string', format: 'email' } }
        }),
        responses: { 200: jsonResponse('Solicitud registrada', envelope({ type: 'object' })), ...pick(422) }
      }
    },
    '/account/reset-password': {
      post: {
        tags: ['Autenticación'],
        summary: 'Establecer una contraseña nueva con el enlace recibido',
        description: 'El enlace caduca en una hora y sólo puede usarse una vez.',
        requestBody: jsonBody({
          type: 'object',
          required: ['token', 'newPassword'],
          properties: { token: { type: 'string' }, newPassword: { type: 'string', minLength: 8 } }
        }),
        responses: { 200: jsonResponse('Contraseña actualizada', envelope({ type: 'object' })), ...pick(400, 403, 422) }
      }
    },
    '/account/verify-email': {
      post: {
        tags: ['Autenticación'],
        summary: 'Confirmar la dirección de correo',
        requestBody: jsonBody({
          type: 'object',
          required: ['token'],
          properties: { token: { type: 'string' } }
        }),
        responses: { 200: jsonResponse('Correo verificado', envelope(ref('User'))), ...pick(400, 422) }
      }
    },
    '/account/verify-email/resend': {
      post: {
        tags: ['Autenticación'],
        summary: 'Reenviar el correo de confirmación',
        security: bearer,
        responses: { 200: jsonResponse('Correo enviado', envelope({ type: 'object' })), ...pick(401, 409) }
      }
    },
    '/account/me/export': {
      get: {
        tags: ['Usuarios'],
        summary: 'Descargar una copia de los datos personales',
        description: 'Derechos de acceso y portabilidad (Ley 29733). Devuelve un archivo JSON.',
        security: bearer,
        responses: {
          200: { description: 'Archivo con los datos de la cuenta' },
          ...pick(401)
        }
      }
    },
    '/account/me': {
      delete: {
        tags: ['Usuarios'],
        summary: 'Eliminar la propia cuenta',
        description:
          'Derecho de cancelación. Exige la contraseña y una confirmación explícita. ' +
          'Se rechaza si la cuenta tiene adopciones registradas.',
        security: bearer,
        requestBody: jsonBody({
          type: 'object',
          required: ['password', 'confirmation'],
          properties: {
            password: { type: 'string' },
            confirmation: { type: 'string', enum: ['ELIMINAR'] }
          }
        }),
        responses: { 204: { description: 'Cuenta eliminada' }, ...pick(401, 409, 422) }
      }
    },
    '/pets/{id}/images/upload': {
      post: {
        tags: ['Mascotas'],
        summary: 'Subir una fotografía como archivo',
        description: 'JPG, PNG, WEBP o AVIF, hasta 5 MB. El cuerpo es multipart/form-data.',
        security: bearer,
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: {
                  image: { type: 'string', format: 'binary' },
                  isPrimary: { type: 'boolean', default: false }
                }
              }
            }
          }
        },
        responses: { 201: jsonResponse('Fotografía subida', envelope(ref('PetImage'))), ...pick(400, 401, 403, 404, 422) }
      }
    },

    '/auth/register': {
      post: {
        tags: ['Autenticación'],
        summary: 'Registrar adoptante o refugio',
        requestBody: jsonBody({
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'password', 'city', 'acceptedTerms', 'acceptedPrivacy'],
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: {
              type: 'string',
              minLength: 8,
              description: 'Mínimo 8 caracteres con mayúscula, minúscula y número'
            },
            phone: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            role: { type: 'string', enum: ['ADOPTANTE', 'REFUGIO'], default: 'ADOPTANTE' },
            acceptedTerms: { type: 'boolean', enum: [true], description: 'Aceptación de los términos' },
            acceptedPrivacy: { type: 'boolean', enum: [true], description: 'Aceptación de la política de privacidad' }
          }
        }),
        responses: {
          201: jsonResponse('Cuenta creada', envelope(ref('AuthSession'))),
          ...pick(409, 422)
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión',
        requestBody: jsonBody({
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' }
          }
        }),
        responses: {
          200: jsonResponse('Sesión iniciada', envelope(ref('AuthSession'))),
          ...pick(401, 403, 422)
        }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Autenticación'],
        summary: 'Cerrar sesión',
        responses: { 200: jsonResponse('Sesión cerrada', envelope({ type: 'object' })) }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Autenticación'],
        summary: 'Perfil del usuario en sesión',
        security: bearer,
        responses: { 200: jsonResponse('Perfil', envelope(ref('User'))), ...pick(401, 403) }
      }
    },
    '/auth/password': {
      patch: {
        tags: ['Autenticación'],
        summary: 'Cambiar la contraseña',
        security: bearer,
        requestBody: jsonBody({
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 }
          }
        }),
        responses: { 200: jsonResponse('Contraseña actualizada', envelope({ type: 'object' })), ...pick(401, 422) }
      }
    },

    '/pets': {
      get: {
        tags: ['Mascotas'],
        summary: 'Buscar, filtrar, ordenar y paginar mascotas',
        parameters: [
          queryParam('search', { type: 'string' }, 'Nombre, raza, ciudad o refugio'),
          enumParam('species', SPECIES),
          enumParam('sex', SEXES),
          enumParam('size', SIZES),
          enumParam('ageGroup', AGE_GROUPS),
          enumParam('status', PET_STATUSES),
          queryParam('city', { type: 'string' }),
          queryParam('region', { type: 'string' }),
          queryParam('shelterId', { type: 'integer' }),
          boolParam('vaccinated'),
          boolParam('sterilized'),
          boolParam('dewormed'),
          boolParam('goodWithChildren'),
          boolParam('goodWithDogs'),
          boolParam('goodWithCats'),
          boolParam('sociable'),
          boolParam('specialCare'),
          enumParam('sort', SORTS),
          queryParam('page', { type: 'integer', minimum: 1, default: 1 }),
          queryParam('limit', { type: 'integer', minimum: 1, maximum: 50, default: 12 })
        ],
        responses: { 200: jsonResponse('Listado paginado', pagedEnvelope(ref('Pet'))), ...pick(422) }
      },
      post: {
        tags: ['Mascotas'],
        summary: 'Registrar mascota (refugio verificado o administrador)',
        security: bearer,
        requestBody: jsonBody(ref('PetInput')),
        responses: {
          201: jsonResponse('Mascota creada', envelope(ref('Pet'))),
          ...pick(401, 403, 409, 422)
        }
      }
    },
    '/pets/{id}': {
      get: {
        tags: ['Mascotas'],
        summary: 'Perfil completo de la mascota',
        parameters: [idParam],
        responses: { 200: jsonResponse('Mascota', envelope(ref('Pet'))), ...pick(404) }
      },
      put: {
        tags: ['Mascotas'],
        summary: 'Editar mascota',
        security: bearer,
        parameters: [idParam],
        requestBody: jsonBody(ref('PetInput')),
        responses: { 200: jsonResponse('Mascota actualizada', envelope(ref('Pet'))), ...pick(401, 403, 404, 422) }
      },
      delete: {
        tags: ['Mascotas'],
        summary: 'Eliminar mascota',
        security: bearer,
        parameters: [idParam],
        responses: { 204: { description: 'Eliminada' }, ...pick(401, 403, 404, 409) }
      }
    },
    '/pets/{id}/status': {
      patch: {
        tags: ['Mascotas'],
        summary: 'Cambiar el estado de la mascota',
        security: bearer,
        parameters: [idParam],
        requestBody: jsonBody({
          type: 'object',
          required: ['status'],
          properties: { status: { type: 'string', enum: PET_STATUSES } }
        }),
        responses: { 200: jsonResponse('Estado actualizado', envelope(ref('Pet'))), ...pick(401, 403, 404, 422) }
      }
    },
    '/pets/{id}/images': {
      get: {
        tags: ['Mascotas'],
        summary: 'Galería de la mascota',
        parameters: [idParam],
        responses: {
          200: jsonResponse('Fotografías', envelope({ type: 'array', items: ref('PetImage') })),
          ...pick(404)
        }
      },
      post: {
        tags: ['Mascotas'],
        summary: 'Agregar fotografía',
        security: bearer,
        parameters: [idParam],
        requestBody: jsonBody({
          type: 'object',
          required: ['url'],
          properties: {
            url: { type: 'string', format: 'uri' },
            isPrimary: { type: 'boolean', default: false }
          }
        }),
        responses: { 201: jsonResponse('Fotografía agregada', envelope(ref('PetImage'))), ...pick(401, 403, 404, 422) }
      }
    },
    '/pets/{id}/images/{imageId}': {
      delete: {
        tags: ['Mascotas'],
        summary: 'Eliminar fotografía',
        security: bearer,
        parameters: [idParam, { ...idParam, name: 'imageId' }],
        responses: { 204: { description: 'Eliminada' }, ...pick(401, 403, 404) }
      }
    },

    '/shelters': {
      get: {
        tags: ['Refugios'],
        summary: 'Refugios verificados (todos si eres administrador)',
        parameters: [
          queryParam('search', { type: 'string' }),
          queryParam('city', { type: 'string' }),
          enumParam('status', SHELTER_STATUSES, 'Sólo aplica para administradores'),
          queryParam('page', { type: 'integer' }),
          queryParam('limit', { type: 'integer' })
        ],
        responses: { 200: jsonResponse('Listado', pagedEnvelope(ref('Shelter'))) }
      },
      post: {
        tags: ['Refugios'],
        summary: 'Registrar el perfil del refugio',
        security: bearer,
        requestBody: jsonBody(ref('Shelter')),
        responses: { 201: jsonResponse('Refugio creado', envelope(ref('Shelter'))), ...pick(401, 403, 409, 422) }
      }
    },
    '/shelters/me': {
      get: {
        tags: ['Refugios'],
        summary: 'Refugio del usuario en sesión',
        security: bearer,
        responses: { 200: jsonResponse('Refugio propio', envelope(ref('Shelter'))), ...pick(401, 403) }
      }
    },
    '/shelters/{id}': {
      get: {
        tags: ['Refugios'],
        summary: 'Perfil público con contadores y mascotas disponibles',
        parameters: [idParam],
        responses: { 200: jsonResponse('Refugio', envelope(ref('Shelter'))), ...pick(404) }
      },
      put: {
        tags: ['Refugios'],
        summary: 'Editar el perfil del refugio',
        security: bearer,
        parameters: [idParam],
        requestBody: jsonBody(ref('Shelter')),
        responses: { 200: jsonResponse('Refugio actualizado', envelope(ref('Shelter'))), ...pick(401, 403, 404, 422) }
      }
    },
    '/shelters/{id}/pets': {
      get: {
        tags: ['Refugios'],
        summary: 'Mascotas del refugio',
        parameters: [idParam, queryParam('page', { type: 'integer' }), queryParam('limit', { type: 'integer' })],
        responses: { 200: jsonResponse('Listado paginado', pagedEnvelope(ref('Pet'))), ...pick(404) }
      }
    },
    '/shelters/{id}/status': {
      patch: {
        tags: ['Refugios'],
        summary: 'Verificar o suspender un refugio (administrador)',
        security: bearer,
        parameters: [idParam],
        requestBody: jsonBody({
          type: 'object',
          required: ['status'],
          properties: { status: { type: 'string', enum: SHELTER_STATUSES } }
        }),
        responses: { 200: jsonResponse('Estado actualizado', envelope(ref('Shelter'))), ...pick(401, 403, 404, 422) }
      }
    },

    '/favorites': {
      get: {
        tags: ['Favoritos'],
        summary: 'Mascotas guardadas como favoritas',
        security: bearer,
        responses: {
          200: jsonResponse('Favoritos', envelope({ type: 'array', items: ref('Pet') })),
          ...pick(401, 403)
        }
      }
    },
    '/favorites/ids': {
      get: {
        tags: ['Favoritos'],
        summary: 'Identificadores de las mascotas favoritas',
        security: bearer,
        responses: {
          200: jsonResponse('Identificadores', envelope({ type: 'array', items: { type: 'integer' } })),
          ...pick(401, 403)
        }
      }
    },
    '/favorites/{petId}': {
      post: {
        tags: ['Favoritos'],
        summary: 'Agregar a favoritos',
        security: bearer,
        parameters: [{ ...idParam, name: 'petId' }],
        responses: { 201: jsonResponse('Agregada', envelope({ type: 'object' })), ...pick(401, 403, 404) }
      },
      delete: {
        tags: ['Favoritos'],
        summary: 'Quitar de favoritos',
        security: bearer,
        parameters: [{ ...idParam, name: 'petId' }],
        responses: { 204: { description: 'Eliminada' }, ...pick(401, 403, 404) }
      }
    },

    '/adoptions/requests': {
      get: {
        tags: ['Solicitudes'],
        summary: 'Listar solicitudes según el rol',
        security: bearer,
        parameters: [
          enumParam('status', REQUEST_STATUSES),
          queryParam('search', { type: 'string' }),
          queryParam('page', { type: 'integer' }),
          queryParam('limit', { type: 'integer' })
        ],
        responses: { 200: jsonResponse('Listado paginado', pagedEnvelope(ref('AdoptionRequest'))), ...pick(401) }
      },
      post: {
        tags: ['Solicitudes'],
        summary: 'Enviar una solicitud de adopción',
        security: bearer,
        requestBody: jsonBody(ref('AdoptionRequestInput')),
        responses: {
          201: jsonResponse('Solicitud enviada', envelope(ref('AdoptionRequest'))),
          ...pick(401, 403, 404, 409, 422)
        }
      }
    },
    '/adoptions/requests/{id}': {
      get: {
        tags: ['Solicitudes'],
        summary: 'Detalle con mascota y entrevistas',
        security: bearer,
        parameters: [idParam],
        responses: { 200: jsonResponse('Solicitud', envelope(ref('AdoptionRequest'))), ...pick(401, 403, 404) }
      },
      delete: {
        tags: ['Solicitudes'],
        summary: 'Cancelar la propia solicitud',
        security: bearer,
        parameters: [idParam],
        responses: { 204: { description: 'Cancelada' }, ...pick(401, 403, 404, 409) }
      }
    },
    '/adoptions/requests/{id}/status': {
      patch: {
        tags: ['Solicitudes'],
        summary: 'Avanzar el flujo de la solicitud',
        description:
          'Transiciones permitidas: PENDIENTE → EN_REVISION/RECHAZADA · ' +
          'EN_REVISION → ENTREVISTA/APROBADA/RECHAZADA · ENTREVISTA → APROBADA/RECHAZADA.',
        security: bearer,
        parameters: [idParam],
        requestBody: jsonBody({
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: REQUEST_STATUSES },
            reviewNotes: { type: 'string' }
          }
        }),
        responses: { 200: jsonResponse('Estado actualizado', envelope(ref('AdoptionRequest'))), ...pick(401, 403, 404, 409, 422) }
      }
    },
    '/adoptions/requests/{id}/interviews': {
      get: {
        tags: ['Entrevistas'],
        summary: 'Entrevistas de la solicitud',
        security: bearer,
        parameters: [idParam],
        responses: {
          200: jsonResponse('Entrevistas', envelope({ type: 'array', items: ref('Interview') })),
          ...pick(401, 403, 404)
        }
      },
      post: {
        tags: ['Entrevistas'],
        summary: 'Programar entrevista',
        security: bearer,
        parameters: [idParam],
        requestBody: jsonBody({
          type: 'object',
          required: ['scheduledAt', 'modality'],
          properties: {
            scheduledAt: { type: 'string', format: 'date-time' },
            modality: { type: 'string', enum: INTERVIEW_MODALITIES },
            notes: { type: 'string' }
          }
        }),
        responses: { 201: jsonResponse('Entrevista programada', envelope(ref('Interview'))), ...pick(401, 403, 404, 409, 422) }
      }
    },
    '/interviews': {
      get: {
        tags: ['Entrevistas'],
        summary: 'Mis entrevistas',
        security: bearer,
        responses: {
          200: jsonResponse('Agenda', envelope({ type: 'array', items: ref('Interview') })),
          ...pick(401)
        }
      }
    },
    '/interviews/{id}': {
      put: {
        tags: ['Entrevistas'],
        summary: 'Actualizar entrevista y registrar el resultado',
        security: bearer,
        parameters: [idParam],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            scheduledAt: { type: 'string', format: 'date-time' },
            modality: { type: 'string', enum: INTERVIEW_MODALITIES },
            notes: { type: 'string' },
            result: { type: 'string', enum: INTERVIEW_RESULTS }
          }
        }),
        responses: { 200: jsonResponse('Entrevista actualizada', envelope(ref('Interview'))), ...pick(401, 403, 404, 422) }
      }
    },

    '/adoptions': {
      get: {
        tags: ['Adopciones'],
        summary: 'Historial de adopciones según el rol',
        security: bearer,
        parameters: [queryParam('page', { type: 'integer' }), queryParam('limit', { type: 'integer' })],
        responses: { 200: jsonResponse('Listado paginado', pagedEnvelope(ref('Adoption'))), ...pick(401) }
      },
      post: {
        tags: ['Adopciones'],
        summary: 'Registrar la adopción de una solicitud aprobada',
        security: bearer,
        requestBody: jsonBody({
          type: 'object',
          required: ['requestId'],
          properties: { requestId: { type: 'integer' }, notes: { type: 'string' } }
        }),
        responses: { 201: jsonResponse('Adopción registrada', envelope(ref('Adoption'))), ...pick(401, 403, 404, 409, 422) }
      }
    },
    '/adoptions/{id}': {
      get: {
        tags: ['Adopciones'],
        summary: 'Detalle de la adopción',
        security: bearer,
        parameters: [idParam],
        responses: { 200: jsonResponse('Adopción', envelope(ref('Adoption'))), ...pick(401, 403, 404) }
      }
    },

    '/users': {
      get: {
        tags: ['Usuarios'],
        summary: 'Listar usuarios (administrador)',
        security: bearer,
        parameters: [
          queryParam('search', { type: 'string' }),
          enumParam('role', USER_ROLES),
          enumParam('status', USER_STATUSES),
          queryParam('page', { type: 'integer' }),
          queryParam('limit', { type: 'integer' })
        ],
        responses: { 200: jsonResponse('Listado paginado', pagedEnvelope(ref('User'))), ...pick(401, 403) }
      }
    },
    '/users/{id}': {
      get: {
        tags: ['Usuarios'],
        summary: 'Consultar un perfil',
        security: bearer,
        parameters: [idParam],
        responses: { 200: jsonResponse('Perfil', envelope(ref('User'))), ...pick(401, 403, 404) }
      },
      put: {
        tags: ['Usuarios'],
        summary: 'Editar el perfil',
        security: bearer,
        parameters: [idParam],
        requestBody: jsonBody({
          type: 'object',
          required: ['firstName', 'lastName', 'city'],
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            avatarUrl: { type: 'string', format: 'uri' }
          }
        }),
        responses: { 200: jsonResponse('Perfil actualizado', envelope(ref('User'))), ...pick(401, 403, 404, 422) }
      },
      delete: {
        tags: ['Usuarios'],
        summary: 'Eliminar una cuenta (administrador)',
        security: bearer,
        parameters: [idParam],
        responses: { 204: { description: 'Eliminada' }, ...pick(401, 403, 404, 409) }
      }
    },
    '/users/{id}/status': {
      patch: {
        tags: ['Usuarios'],
        summary: 'Suspender o reactivar una cuenta',
        security: bearer,
        parameters: [idParam],
        requestBody: jsonBody({
          type: 'object',
          required: ['status'],
          properties: { status: { type: 'string', enum: USER_STATUSES } }
        }),
        responses: { 200: jsonResponse('Estado actualizado', envelope(ref('User'))), ...pick(401, 403, 404, 409, 422) }
      }
    },

    '/notifications': {
      get: {
        tags: ['Notificaciones'],
        summary: 'Notificaciones del usuario en sesión',
        security: bearer,
        responses: {
          200: jsonResponse(
            'Notificaciones y contador de no leídas',
            envelope({
              type: 'object',
              properties: {
                items: { type: 'array', items: ref('Notification') },
                unread: { type: 'integer' }
              }
            })
          ),
          ...pick(401)
        }
      }
    },
    '/notifications/read-all': {
      patch: {
        tags: ['Notificaciones'],
        summary: 'Marcar todas como leídas',
        security: bearer,
        responses: { 200: jsonResponse('Actualizadas', envelope({ type: 'object' })), ...pick(401) }
      }
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Notificaciones'],
        summary: 'Marcar una notificación como leída',
        security: bearer,
        parameters: [idParam],
        responses: { 200: jsonResponse('Actualizada', envelope(ref('Notification'))), ...pick(401, 404) }
      }
    },

    '/reports/adoptions': {
      get: {
        tags: ['Reportes'],
        summary: 'Adopciones por mes, ciudad y especie',
        security: bearer,
        responses: {
          200: jsonResponse(
            'Reporte',
            envelope({
              type: 'object',
              properties: {
                byMonth: { type: 'array', items: ref('ReportBucket') },
                byCity: { type: 'array', items: ref('ReportBucket') },
                bySpecies: { type: 'array', items: ref('ReportBucket') },
                total: { type: 'integer' }
              }
            })
          ),
          ...pick(401, 403)
        }
      }
    },
    '/reports/pets': {
      get: {
        tags: ['Reportes'],
        summary: 'Mascotas por especie, estado y ciudad',
        security: bearer,
        responses: { 200: jsonResponse('Reporte', envelope({ type: 'object' })), ...pick(401, 403) }
      }
    },
    '/reports/requests': {
      get: {
        tags: ['Reportes'],
        summary: 'Solicitudes por estado',
        security: bearer,
        responses: { 200: jsonResponse('Reporte', envelope({ type: 'object' })), ...pick(401, 403) }
      }
    },
    '/reports/shelters': {
      get: {
        tags: ['Reportes'],
        summary: 'Refugios por estado y ranking de adopciones',
        security: bearer,
        responses: { 200: jsonResponse('Reporte', envelope({ type: 'object' })), ...pick(401, 403) }
      }
    },

    '/admin/dashboard': {
      get: {
        tags: ['Administración'],
        summary: 'Resumen global de la plataforma',
        security: bearer,
        responses: { 200: jsonResponse('Resumen', envelope({ type: 'object' })), ...pick(401, 403) }
      }
    },
    '/admin/audit': {
      get: {
        tags: ['Administración'],
        summary: 'Registro de auditoría',
        security: bearer,
        parameters: [
          queryParam('entityType', { type: 'string' }),
          queryParam('page', { type: 'integer' }),
          queryParam('limit', { type: 'integer' })
        ],
        responses: { 200: jsonResponse('Listado paginado', pagedEnvelope(ref('AuditLog'))), ...pick(401, 403) }
      }
    },
    '/workspace': {
      get: {
        tags: ['Administración'],
        summary: 'Datos completos del panel según el rol',
        security: bearer,
        responses: { 200: jsonResponse('Panel', envelope({ type: 'object' })), ...pick(401) }
      }
    }
  }
};
