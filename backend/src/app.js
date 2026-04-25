import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { query } from './db/pool.js';
import { openApiSpec } from './docs/openapi.js';
import { errorHandler } from './middleware/errorHandler.js';
import { asyncHandler } from './utils/asyncHandler.js';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import candidateRoutes from './routes/candidate.routes.js';
import hrRoutes from './routes/hr.routes.js';

const app = express();

const corsOptions = env.corsOrigins.length
  ? {
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('Origin not allowed'));
      },
    }
  : { origin: true };

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

app.get(
  '/health',
  asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT NOW() AS now');

    res.json({
      ok: true,
      timestamp: rows[0].now,
    });
  }),
);

app.get('/', (req, res) => {
  res.json({
    name: 'EthicFlow Backend',
    version: '1.0.0',
    health: '/health',
    docs: '/docs',
    openApi: '/docs.json',
  });
});

app.get('/docs.json', (req, res) => {
  res.json(openApiSpec);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use('/api/auth', authRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

export default app;
