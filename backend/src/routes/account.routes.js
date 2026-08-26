import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rate-limit.js';
import {
  deleteAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema
} from '../validators/account.schema.js';
import * as controller from '../controllers/account.controller.js';

/**
 * Cuenta: verificación de correo, recuperación de contraseña y derechos
 * sobre los datos personales (Ley 29733).
 */
const router = Router();

// Enlaces por correo. Comparten el límite de autenticación porque son la
// misma superficie de abuso: adivinar correos o inundar buzones ajenos.
router.post(
  '/forgot-password',
  authLimiter,
  validateBody(forgotPasswordSchema),
  controller.forgotPassword
);
router.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), controller.resetPassword);
router.post('/verify-email', validateBody(verifyEmailSchema), controller.verifyEmail);
router.post('/verify-email/resend', authenticate, authLimiter, controller.requestVerification);

// Derechos sobre los datos: siempre sobre la cuenta en sesión.
router.get('/me/export', authenticate, controller.exportData);
router.delete('/me', authenticate, validateBody(deleteAccountSchema), controller.deleteOwnAccount);

export default router;
