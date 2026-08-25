import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { openapi } from './docs/openapi.js';
import {
  adoptionRequestLimiter,
  authLimiter,
  generalLimiter,
  limitWrites
} from './middleware/rate-limit.js';
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

// Documentación interactiva de la API (§94). Va antes de los límites: es
// una página estática y consultarla no debe consumir la cuota del visitante.
app.get('/api/docs/openapi.json', (_req, res) => res.json(openapi));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'PetMatch API' }));

// Límites por IP, del más específico al más general (§73).
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/adoptions/requests', adoptionRequestLimiter);
app.use('/api', limitWrites);
app.use('/api', generalLimiter);

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
