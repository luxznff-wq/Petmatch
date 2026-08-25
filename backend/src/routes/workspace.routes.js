import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import * as controller from '../controllers/user.controller.js';

/**
 * Datos completos del panel del usuario en sesión.
 *
 * No aparece en la especificación como endpoint obligatorio: existe para que
 * cada panel (§8) se pinte con una sola petición en lugar de seis.
 */
const router = Router();
router.get('/', authenticate, controller.workspace);

export default router;
