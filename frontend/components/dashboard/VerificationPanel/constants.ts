import type { VerificationStatus } from '@/types';

export const MAX_FILE_SIZE = 2 * 1024 * 1024;
export const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

export const STATUS_CONFIG: Record<
  VerificationStatus,
  { label: string; badgeClass: string; description: string }
> = {
  UNSUBMITTED: {
    label: 'Unsubmitted',
    badgeClass: 'bg-white/20 text-white/70',
    description: 'Please upload a verification document to begin.',
  },
  PENDING: {
    label: 'Processing',
    badgeClass: 'bg-warning text-white',
    description: 'Your profile is being processed...',
  },
  PROCESSING: {
    label: 'Processing',
    badgeClass: 'bg-warning text-white',
    description: 'Your profile is being processed...',
  },
  VERIFIED: {
    label: 'Verified',
    badgeClass: 'bg-success text-white',
    description: 'Your account has been verified successfully.',
  },
  APPROVED: {
    label: 'Verified',
    badgeClass: 'bg-success text-white',
    description: 'Your account has been verified successfully.',
  },
  REJECTED: {
    label: 'Rejected',
    badgeClass: 'bg-danger text-white',
    description: 'Verification request was rejected.',
  },
  INCONCLUSIVE: {
    label: 'Manual Approval',
    badgeClass: 'bg-warning text-white',
    description: 'Please wait for an administrator to review your request manually.',
  },
  SYSTEM_ERROR: {
    label: 'System Error',
    badgeClass: 'bg-danger text-white',
    description: 'An error occurred. Please try again.',
  },
};
