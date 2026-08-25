import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema
} from '../validators/auth.schema.js';
import * as controller from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', validateBody(registerSchema), controller.register);
router.post('/login', validateBody(loginSchema), controller.login);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.me);
router.patch(
  '/password',
  authenticate,
  validateBody(changePasswordSchema),
  controller.changePassword
);

export default router;
