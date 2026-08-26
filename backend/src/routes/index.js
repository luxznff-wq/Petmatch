import { Router } from 'express';
import { isPostgres } from '../config/database.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ok } from '../utils/http.js';
import * as reportController from '../controllers/report.controller.js';
import * as accountController from '../controllers/account.controller.js';

import authRoutes from './auth.routes.js';
import accountRoutes from './account.routes.js';
import petRoutes from './pet.routes.js';
import shelterRoutes from './shelter.routes.js';
import favoriteRoutes from './favorite.routes.js';
import adoptionRoutes from './adoption.routes.js';
import interviewRoutes from './interview.routes.js';
import notificationRoutes from './notification.routes.js';
import userRoutes from './user.routes.js';
import reportRoutes from './report.routes.js';
import adminRoutes from './admin.routes.js';
import workspaceRoutes from './workspace.routes.js';

/** Monta la API REST completa bajo `/api` (§55-§67). */
const router = Router();

router.get(
  '/health',
  asyncHandler(async (_req, res) =>
    ok(res, {
      status: 'ok',
      version: process.env.npm_package_version ?? '1.0.0',
      database: isPostgres ? 'postgresql' : 'memory',
      timestamp: new Date().toISOString()
    })
  )
);

// Estadísticas de la portada: públicas y sin sesión (§10).
router.get('/stats', reportController.publicStats);

// Versión vigente de los documentos legales y datos del responsable.
router.get('/legal', accountController.legalInfo);

router.use('/auth', authRoutes);
router.use('/account', accountRoutes);
router.use('/users', userRoutes);
router.use('/pets', petRoutes);
router.use('/shelters', shelterRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/adoptions', adoptionRoutes);
router.use('/interviews', interviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/admin', adminRoutes);
router.use('/workspace', workspaceRoutes);

export default router;
