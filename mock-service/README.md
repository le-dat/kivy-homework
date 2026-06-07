# Mock Verification Service

Standalone Hono server that simulates an external document verification API. Designed to be defensible in a live interview as a deliberate design decision.

## What it does

- `POST /v1/verifications` — Accepts a document submission, responds **immediately** with `202 Accepted`, then fires a webhook callback after a **1–5 second random delay** (simulating real async processing)
- `GET /v1/verifications/:id` — Returns current in-memory status (for backend reconciliation cron polling)
- `POST /v1/toggle-webhook` — Disables/enables webhook delivery (for testing reconciliation without killing the process)
- `GET /` — Health check + endpoint listing

## Design decisions

| Decision | Rationale |
|----------|-----------|
| **Fixed-window rate limiting** (100 req/min) | Simple and sufficient for a mock. A sliding window prevents burst at window edges — a production concern, not relevant here. |
| **1–5s random delay** | Real async services don't respond instantly. Tests webhook-dependent backend code. |
| **In-memory Map** | No persistence needed — restart = clean state = good for isolated testing. |
| **Toggle webhook endpoint** | Allows automated tests to verify backend reconciliation (cron recovery) without process restarts. |

## Outcomes

60% VERIFIED · 20% REJECTED · 20% INCONCLUSIVE

## Run

```bash
pnpm dev          # Development (tsx watch, port 3001)
pnpm build        # Compile TypeScript
pnpm start        # Run compiled output
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Listen port |
