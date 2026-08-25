/**
 * Error de negocio con código HTTP. El manejador central de errores
 * (§77) confía en `isOperational` para decidir si el mensaje puede
 * mostrarse al usuario o si debe ocultarse tras un 500 genérico.
 */
export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(message = 'Solicitud inválida', details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Debes iniciar sesión') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'No tienes permisos para realizar esta acción') {
    return new ApiError(403, message);
  }

  static notFound(message = 'El recurso solicitado no existe') {
    return new ApiError(404, message);
  }

  static conflict(message = 'La operación entra en conflicto con el estado actual') {
    return new ApiError(409, message);
  }

  static unprocessable(message = 'Datos inválidos', details) {
    return new ApiError(422, message, details);
  }
}
