// ─── Types ───────────────────────────────────────────────────────────────────

export type VerificationStatus =
  | 'PROCESSING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'INCONCLUSIVE';

export interface VerificationRecord {
  id: string;
  status: VerificationStatus;
  documentUrl: string;
  callbackUrl: string;
}

// ─── In-memory store ─────────────────────────────────────────────────────────

export const store = new Map<string, VerificationRecord>();

// ─── Webhook toggle (for testing reconciliation) ──────────────────────────────

export let webhooksEnabled = true;

export function setWebhooksEnabled(value: boolean): void {
  webhooksEnabled = value;
}

// ─── Outcome probabilities ────────────────────────────────────────────────────

/** 60% VERIFIED, 20% REJECTED, 20% INCONCLUSIVE */
export function pickOutcome(): VerificationStatus {
  const roll = Math.random();
  if (roll < 0.6) return 'VERIFIED';
  if (roll < 0.8) return 'REJECTED';
  return 'INCONCLUSIVE';
}

/** Rejection/inconclusive reasons by outcome */
export function pickReason(status: VerificationStatus): string | null {
  if (status === 'VERIFIED') return null;
  if (status === 'REJECTED') {
    const reasons = [
      'Document is expired',
      'Business registration number is invalid',
      'Image quality too low to verify',
    ];
    return reasons[Math.floor(Math.random() * reasons.length)] ?? null;
  }
  // INCONCLUSIVE
  return 'Document requires manual review by an admin';
}
