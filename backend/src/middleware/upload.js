import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';

/**
 * Subida de fotografías de mascotas (§60).
 *
 * Los archivos se guardan en disco local. Para un despliegue real conviene
 * un almacenamiento de objetos (S3, Cloudinary) o un disco persistente: el
 * sistema de archivos de plataformas como Render es efímero y se pierde en
 * cada redespliegue. `UPLOAD_DIR` permite apuntar a un volumen montado.
 */

export const uploadDir = resolve(process.cwd(), env.uploads.dir);

if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif'
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    // Nombre generado, nunca el que envía el cliente: un nombre controlado
    // por el usuario abre la puerta a recorridos de ruta y colisiones.
    const extension = EXTENSIONS[file.mimetype] ?? extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  }
});

const fileFilter = (_req, file, callback) => {
  if (!env.uploads.allowedTypes.includes(file.mimetype)) {
    return callback(
      ApiError.unprocessable(
        `Formato no admitido. Usa ${env.uploads.allowedTypes
          .map((type) => type.replace('image/', '').toUpperCase())
          .join(', ')}.`
      )
    );
  }
  callback(null, true);
};

const multerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.uploads.maxBytes, files: 1 }
});

/**
 * Recibe un único archivo en el campo `image` y traduce los errores de
 * multer al formato de error de la API.
 */
export const uploadPetImage = (req, res, next) =>
  multerUpload.single('image')(req, res, (error) => {
    if (!error) return next();

    if (error.code === 'LIMIT_FILE_SIZE') {
      const megabytes = Math.round(env.uploads.maxBytes / (1024 * 1024));
      return next(ApiError.unprocessable(`La imagen supera el máximo de ${megabytes} MB`));
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(ApiError.badRequest('Envía la imagen en el campo "image"'));
    }
    return next(error);
  });
