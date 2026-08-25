import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import * as controller from '../controllers/user.controller.js';

/** Favoritos: exclusivos del adoptante (§5, §61). */
const router = Router();
router.use(authenticate, authorize('ADOPTANTE'));

router.get('/', controller.listFavorites);
// Sólo los identificadores: el listado de mascotas lo usa para pintar el
// corazón sin traerse las mascotas completas otra vez.
router.get('/ids', controller.listFavoriteIds);
router.post('/:petId', controller.addFavorite);
router.delete('/:petId', controller.removeFavorite);

export default router;
