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
 * Se toman de las variables `LEGAL_*` del entorno. Los valores por defecto son
 * marcadores de posición: si la plataforma se publica de verdad hay que
 * definir las variables con los datos de la organización responsable, porque
 * sin un responsable identificable los documentos no cumplen la Ley 29733.
 */
export const LEGAL_CONTACT = {
  organization: process.env.LEGAL_ORGANIZATION || 'PetMatch (proyecto académico)',
  email: process.env.LEGAL_CONTACT_EMAIL || 'privacidad@petmatch.example',
  address: process.env.LEGAL_ADDRESS || 'Dirección pendiente de completar',
  country: process.env.LEGAL_COUNTRY || 'Perú'
};
