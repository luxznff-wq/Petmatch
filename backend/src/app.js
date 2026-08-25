import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { openapi } from './docs/openapi.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

export const app = express();

// Detrás de Render/Vercel la IP real llega en X-Forwarded-For; sin esto el
// rate limit contaría todas las peticiones como si vinieran del proxy.
app.set('trust proxy', 1);

app.use(
  helmet({
    // Swagger UI carga sus propios estilos; CSP estricta rompería /api/docs.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Sólo el frontend configurado puede consumir la API con credenciales (§73).
const allowedOrigins = new Set([env.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173']);
app.use(
  cors({
    origin(origin, callback) {
      // Sin cabecera Origin: peticiones del propio servidor, curl o Swagger UI.
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error('Origen no permitido por CORS'));
    }
  })
);

app.use(express.json({ limit: '1mb' }));

// Limita los intentos de registro/login para frenar la fuerza bruta.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos. Inténtalo nuevamente más tarde.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Documentación interactiva de la API (§94).
app.get('/api/docs/openapi.json', (_req, res) => res.json(openapi));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'PetMatch API' }));

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
