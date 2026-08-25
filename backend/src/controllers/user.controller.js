import { asyncHandler } from '../utils/async-handler.js';
import { noContent, ok, paginated } from '../utils/http.js';
import * as userService from '../services/user.service.js';
import * as favoriteService from '../services/favorite.service.js';
import * as notificationService from '../services/notification.service.js';
import * as dashboardService from '../services/dashboard.service.js';

/* -------------------------------------------------------------- Usuarios */

export const list = asyncHandler(async (req, res) => {
  const result = await userService.list(req.validatedQuery);
  return paginated(res, result);
});

export const detail = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.user, req.validatedParams.id);
  return ok(res, user);
});

export const update = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user, req.validatedParams.id, req.body);
  return ok(res, user);
});

export const changeStatus = asyncHandler(async (req, res) => {
  const user = await userService.setStatus(req.user, req.validatedParams.id, req.body.status);
  return ok(res, user);
});

export const remove = asyncHandler(async (req, res) => {
  await userService.remove(req.user, req.validatedParams.id);
  return noContent(res);
});

/* ------------------------------------------------------------- Favoritos */

export const listFavorites = asyncHandler(async (req, res) =>
  ok(res, await favoriteService.list(req.user))
);

export const listFavoriteIds = asyncHandler(async (req, res) =>
  ok(res, await favoriteService.listIds(req.user))
);

export const addFavorite = asyncHandler(async (req, res) => {
  const result = await favoriteService.add(req.user, req.params.petId);
  return res.status(201).json({ success: true, data: result });
});

export const removeFavorite = asyncHandler(async (req, res) => {
  await favoriteService.remove(req.user, req.params.petId);
  return noContent(res);
});

/* --------------------------------------------------------- Notificaciones */

export const listNotifications = asyncHandler(async (req, res) => {
  const [items, unread] = await Promise.all([
    notificationService.list(req.user.id),
    notificationService.countUnread(req.user.id)
  ]);
  return ok(res, { items, unread });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(req.user.id, req.validatedParams.id);
  if (!notification) return res.status(404).json({ success: false, message: 'La notificación no existe' });
  return ok(res, notification);
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user.id);
  return ok(res, { read: true });
});

/* ------------------------------------------------------------- Workspace */

export const workspace = asyncHandler(async (req, res) =>
  ok(res, await dashboardService.build(req.user))
);
