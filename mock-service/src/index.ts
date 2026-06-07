import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import verificationRoutes from './routes/verifications.js';
import toggleRoutes from './routes/toggle.js';

const app = new Hono();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use('*', logger());

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/', (c) => {
  return c.json({
    service: 'mock-verification-service',
    status: 'ok',
    endpoints: [
      'POST /v1/verifications',
      'GET  /v1/verifications/:id',
      'POST /v1/toggle-webhook',
    ],
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.route('/v1', verificationRoutes);
app.route('/v1', toggleRoutes);

// ─── Server ───────────────────────────────────────────────────────────────────

const port = parseInt(process.env.PORT ?? '3001', 10);

serve(
  { fetch: app.fetch, port },
  (info) => {
    console.log(`[mock] Mock Verification Service running on http://localhost:${info.port}`);
    console.log(`[mock] POST http://localhost:${info.port}/v1/verifications`);
    console.log(`[mock] GET  http://localhost:${info.port}/v1/verifications/:id`);
  },
);
