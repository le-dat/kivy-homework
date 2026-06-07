import { Hono } from 'hono';
import { store, webhooksEnabled, pickOutcome, pickReason } from '../store.js';
import { checkRateLimit } from '../rate-limiter.js';

const verifications = new Hono();

// ─── POST /v1/verifications — Submit document ─────────────────────────────────

verifications.post('/verifications', async (c) => {
  // 1. Rate limit check
  if (!checkRateLimit()) {
    return c.json(
      { error: 'Rate limit exceeded. Maximum 100 requests per minute.' },
      429,
    );
  }

  // 2. Parse and validate body
  const body = await c.req.json<{ document_url?: string; callback_url?: string; verification_id?: string }>();
  const { document_url, callback_url, verification_id } = body;

  if (!document_url || !callback_url) {
    return c.json(
      { error: 'Both document_url and callback_url are required.' },
      400,
    );
  }

  // 3. Use the verification_id from backend, or generate if not provided
  const id = verification_id || crypto.randomUUID();
  store.set(id, {
    id,
    status: 'PROCESSING',
    documentUrl: document_url,
    callbackUrl: callback_url,
  });

  console.log(`[mock] Accepted verification ${id} — will callback in 1-5s`);

  // 4. Respond immediately with 202
  // 5. Fire-and-forget async task — simulates external service processing time
  const delay = 1000 + Math.random() * 4000; // 1–5 seconds

  setTimeout(() => {
    void processVerification(id, callback_url);
  }, delay);

  return c.json({ verification_id: id, status: 'PROCESSING' }, 202);
});

// ─── GET /v1/verifications/:id — Reconciliation polling ──────────────────────

verifications.get('/verifications/:id', (c) => {
  const { id } = c.req.param();
  const record = store.get(id);

  if (!record) {
    return c.json({ error: 'Verification not found.' }, 404);
  }

  return c.json({
    id: record.id,
    status: record.status,
    documentUrl: record.documentUrl,
  });
});

// ─── Internal: async processing + webhook ────────────────────────────────────

async function processVerification(id: string, callbackUrl: string): Promise<void> {
  const record = store.get(id);
  if (!record) return;

  const outcome = pickOutcome();
  const reason = pickReason(outcome);

  // Update in-memory state
  record.status = outcome;
  console.log(`[mock] Verification ${id} resolved → ${outcome}`);

  if (!webhooksEnabled) {
    console.log(`[mock] Webhooks disabled — skipping callback for ${id}`);
    return;
  }

  // Send webhook callback to backend
  try {
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verification_id: id,
        status: outcome,
        reason,
      }),
    });

    if (!response.ok) {
      console.error(
        `[mock] Webhook delivery failed for ${id}: HTTP ${response.status}`,
      );
    } else {
      console.log(`[mock] Webhook delivered for ${id} → ${callbackUrl}`);
    }
  } catch (err) {
    // Graceful failure — backend reconciliation cron will catch this
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[mock] Webhook error for ${id}: ${msg}`);
  }
}

export default verifications;
