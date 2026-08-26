import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = dirname(fileURLToPath(import.meta.url));

// Las pruebas nunca heredan el `.env` del desarrollador: si lo hicieran,
// `npm test` se conectaría a la base de datos de desarrollo y la vaciaría al
// limpiar entre casos. En modo test sólo cuentan las variables que se pasen
// explícitamente por la línea de comandos.
if (process.env.NODE_ENV !== 'test') {
  // El archivo se busca a partir de la ubicación de este módulo y no del
  // directorio de trabajo: los scripts del workspace se ejecutan desde
  // `backend/`, pero el `.env` documentado vive en la raíz del monorepo.
  // `backend/.env` tiene prioridad por si se quiere un entorno propio.
  dotenv.config({
    path: [resolve(here, '../../.env'), resolve(here, '../../../.env')],
    quiet: true
  });
}

const REQUIRED_IN_PRODUCTION = ['DATABASE_URL', 'JWT_SECRET'];

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

if (isProduction) {
  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias en producción: ${missing.join(', ')}`
    );
  }
}

export const env = {
  nodeEnv,
  isProduction,
  isTest,
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL || null,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || `http://localhost:${Number(process.env.PORT) || 4000}/api`,
  jwt: {
    // El fallback sólo existe para desarrollo local; en producción la
    // comprobación de arriba impide arrancar sin un secreto real.
    secret: process.env.JWT_SECRET || 'petmatch-development-secret-do-not-use-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  },
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || (isTest ? 4 : 12),

  /**
   * Correo transaccional. Sin `SMTP_HOST` los mensajes se escriben en la
   * consola en lugar de enviarse: la recuperación de contraseña funciona en
   * local sin contratar ningún proveedor.
   */
  smtp: {
    host: process.env.SMTP_HOST || null,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || null,
    password: process.env.SMTP_PASSWORD || null,
    from: process.env.SMTP_FROM || 'PetMatch <no-reply@petmatch.example>'
  },

  /** Subida de fotografías (§60). */
  uploads: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxBytes: Number(process.env.UPLOAD_MAX_BYTES) || 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  },

  /**
   * Almacén compartido para los límites de peticiones. Sin Redis, cada
   * instancia lleva su propia cuenta y el límite deja de ser fiable en
   * cuanto haya más de una.
   */
  redisUrl: process.env.REDIS_URL || null,
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@petmatch.com',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin123',
    demoPassword: process.env.SEED_DEMO_PASSWORD || 'Demo1234'
  }
};
