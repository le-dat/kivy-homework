export type VerificationStatus =
  | 'UNSUBMITTED'
  | 'PENDING'
  | 'PROCESSING'
  | 'VERIFIED'
  | 'APPROVED'
  | 'REJECTED'
  | 'INCONCLUSIVE'
  | 'SYSTEM_ERROR';

export interface VerificationRecord {
  id: string;
  status: VerificationStatus;
  rejectionReason?: string | null;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  isVisible: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  role: 'SELLER' | 'ADMIN';
}
