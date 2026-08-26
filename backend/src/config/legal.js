/**
 * Versión vigente de los documentos legales.
 *
 * El registro guarda esta cadena junto a la fecha de aceptación, de modo que
 * siempre se sepa a qué texto concreto se comprometió cada persona. Al
 * publicar un cambio sustancial hay que subir la versión: el consentimiento
 * anterior no cubre el texto nuevo.
 */
export const LEGAL_VERSION = '1.0';

/** Fecha de la última revisión, mostrada en ambos documentos. */
export const LEGAL_UPDATED_AT = '2026-08-25';

/**
 * Datos del responsable del tratamiento.
 *
 * ATENCIÓN: son marcadores de posición. Antes de publicar la plataforma hay
 * que sustituirlos por los datos reales de la organización responsable; sin
 * ellos los documentos no cumplen la Ley 29733.
 */
export const LEGAL_CONTACT = {
  organization: process.env.LEGAL_ORGANIZATION || 'PetMatch (proyecto académico)',
  email: process.env.LEGAL_CONTACT_EMAIL || 'privacidad@petmatch.example',
  address: process.env.LEGAL_ADDRESS || 'Dirección pendiente de completar',
  country: process.env.LEGAL_COUNTRY || 'Perú'
};
