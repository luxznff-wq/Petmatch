import 'dotenv/config';

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
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@petmatch.com',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin123',
    demoPassword: process.env.SEED_DEMO_PASSWORD || 'Demo1234'
  }
};
