/**
 * Envuelve un controlador asíncrono para que cualquier promesa rechazada
 * llegue al manejador central de errores en lugar de quedar sin capturar.
 */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
