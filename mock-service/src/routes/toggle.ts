import { Hono } from 'hono';
import { webhooksEnabled, setWebhooksEnabled } from '../store.js';

const toggle = new Hono();

/**
 * POST /v1/toggle-webhook
 *
 * Testing support endpoint — disabling webhooks lets automated tests
 * verify that the backend's reconciliation cron correctly recovers
 * verifications that never received a webhook callback.
 */
toggle.post('/toggle-webhook', async (c) => {
  const body = await c.req.json<{ enabled?: boolean }>();

  if (typeof body.enabled !== 'boolean') {
    return c.json({ error: '"enabled" must be a boolean.' }, 400);
  }

  setWebhooksEnabled(body.enabled);
  console.log(`[mock] Webhooks ${body.enabled ? 'ENABLED' : 'DISABLED'}`);

  return c.json({ webhooks_enabled: webhooksEnabled });
});

export default toggle;
