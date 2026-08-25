/**
 * Catálogos compartidos por formularios y filtros.
 * Reflejan exactamente los valores que acepta la API (§15, §21, §33, §36).
 */

export const SPECIES = ['Perro', 'Gato', 'Conejo', 'Ave', 'Roedor', 'Otro'];
export const SEXES = ['Macho', 'Hembra'];
export const SIZES = ['Pequeño', 'Mediano', 'Grande'];
export const AGE_GROUPS = ['Cachorro', 'Joven', 'Adulto', 'Senior'];

export const PET_STATUSES = ['DISPONIBLE', 'EN_PROCESO', 'ADOPTADA', 'NO_DISPONIBLE'];
export const SHELTER_STATUSES = ['PENDIENTE', 'VERIFICADO', 'SUSPENDIDO'];
export const USER_STATUSES = ['ACTIVO', 'SUSPENDIDO'];
export const USER_ROLES = ['ADOPTANTE', 'REFUGIO', 'ADMINISTRADOR'];

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

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'name-asc', label: 'Nombre A-Z' },
  { value: 'name-desc', label: 'Nombre Z-A' }
];

/** Características y compatibilidad de la mascota (§19, §20). */
export const PET_ATTRIBUTES = [
  { key: 'vaccinated', label: 'Vacunado' },
  { key: 'sterilized', label: 'Esterilizado' },
  { key: 'dewormed', label: 'Desparasitado' },
  { key: 'goodWithChildren', label: 'Compatible con niños' },
  { key: 'goodWithDogs', label: 'Compatible con perros' },
  { key: 'goodWithCats', label: 'Compatible con gatos' },
  { key: 'sociable', label: 'Sociable' },
  { key: 'specialCare', label: 'Requiere cuidados especiales' }
];

/** Etiquetas legibles de los estados usados en la interfaz. */
export const STATUS_LABELS = {
  DISPONIBLE: 'Disponible',
  EN_PROCESO: 'En proceso',
  ADOPTADA: 'Adoptada',
  NO_DISPONIBLE: 'No disponible',
  PENDIENTE: 'Pendiente',
  EN_REVISION: 'En revisión',
  ENTREVISTA: 'Entrevista',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
  ADOPCION_COMPLETADA: 'Adopción completada',
  VERIFICADO: 'Verificado',
  SUSPENDIDO: 'Suspendido',
  ACTIVO: 'Activo'
};

/** Tono visual de cada estado, usado por el componente Badge. */
export const STATUS_TONES = {
  DISPONIBLE: 'success',
  ACTIVO: 'success',
  VERIFICADO: 'success',
  APROBADA: 'success',
  ADOPCION_COMPLETADA: 'success',
  ADOPTADA: 'info',
  EN_PROCESO: 'warning',
  EN_REVISION: 'warning',
  ENTREVISTA: 'warning',
  PENDIENTE: 'neutral',
  NO_DISPONIBLE: 'neutral',
  CANCELADA: 'neutral',
  RECHAZADA: 'danger',
  SUSPENDIDO: 'danger'
};

/** Pasos del proceso de adopción mostrados en la portada (§12). */
export const HOW_IT_WORKS = [
  { step: '01', title: 'Encuentra', text: 'Busca una mascota que se adapte a tu vida y a tu hogar.' },
  { step: '02', title: 'Conoce', text: 'Consulta su información, su historia y contacta al refugio.' },
  { step: '03', title: 'Solicita', text: 'Completa el formulario de adopción responsable.' },
  { step: '04', title: 'Adopta', text: 'Finaliza el proceso con el refugio y empieza una nueva historia.' }
];
