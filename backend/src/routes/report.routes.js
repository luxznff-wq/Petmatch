import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import * as controller from '../controllers/report.controller.js';

/**
 * Reportes (§67).
 *
 * El refugio ve los suyos (§44: "consultar estadísticas") y el administrador
 * los globales; el propio servicio acota los datos según el rol. El reporte
 * de refugios es sólo para el administrador porque es una vista de plataforma.
 */
const router = Router();
router.use(authenticate);

const analyst = authorize('REFUGIO', 'ADMINISTRADOR');

router.get('/adoptions', analyst, controller.adoptionsReport);
router.get('/pets', analyst, controller.petsReport);
router.get('/requests', analyst, controller.requestsReport);
router.get('/shelters', authorize('ADMINISTRADOR'), controller.sheltersReport);

export default router;
