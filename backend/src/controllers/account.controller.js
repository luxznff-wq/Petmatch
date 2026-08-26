import { asyncHandler } from '../utils/async-handler.js';
import { noContent, ok } from '../utils/http.js';
import { LEGAL_CONTACT, LEGAL_UPDATED_AT, LEGAL_VERSION } from '../config/legal.js';
import * as accountService from '../services/account.service.js';
import { toPublicUser } from '../services/auth.service.js';

/* ----------------------------------------------- Verificación de correo */

export const requestVerification = asyncHandler(async (req, res) => {
  await accountService.sendVerification(req.user);
  return ok(res, { sent: true });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await accountService.verifyEmail(req.body.token);
  return ok(res, toPublicUser(user));
});

/* ------------------------------------------- Recuperación de contraseña */

/**
 * Siempre responde 200, exista o no la cuenta: distinguir ambos casos
 * permitiría averiguar qué correos están registrados.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  await accountService.requestPasswordReset(req.body.email);
  return ok(res, {
    sent: true,
    message: 'Si el correo corresponde a una cuenta, recibirás un enlace en unos minutos.'
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await accountService.resetPassword(req.body);
  return ok(res, { updated: true });
});

/* -------------------------------------------------- Derechos sobre datos */

/** Descarga de los datos personales (derecho de acceso y portabilidad). */
export const exportData = asyncHandler(async (req, res) => {
  const data = await accountService.exportPersonalData(req.user);
  const filename = `petmatch-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(JSON.stringify(data, null, 2));
});

/** Baja voluntaria (derecho de cancelación). */
export const deleteOwnAccount = asyncHandler(async (req, res) => {
  await accountService.deleteOwnAccount(req.user, req.body.password);
  return noContent(res);
});

/* ------------------------------------------------------ Documentos legales */

/**
 * Versión vigente y datos del responsable. El frontend los consulta para no
 * duplicar la información de contacto en los dos documentos.
 */
export const legalInfo = asyncHandler(async (_req, res) =>
  ok(res, {
    version: LEGAL_VERSION,
    updatedAt: LEGAL_UPDATED_AT,
    contact: LEGAL_CONTACT,
    documents: {
      terms: '/terminos',
      privacy: '/privacidad'
    }
  })
);
