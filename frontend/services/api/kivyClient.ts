import { api } from '@/services/api/client';
import { API } from '@/constants';
import type { VerificationStatus, VerificationRecord, Product } from '@/types';

export interface AdminMetrics {
  pending: number;
  verifiedCount: number;
  rejectedCount: number;
}

export interface AdminVerificationRecord {
  id: string;
  seller_id: string;
  seller_email: string;
  document_url: string;
  status: VerificationStatus;
  created_at: string;
}

export interface VerificationEventRecord {
  from_status: VerificationStatus | null;
  to_status: VerificationStatus;
  actor_type: string;
  actor_id: string | null;
  actor_email: string | null;
  reason: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'SELLER' | 'ADMIN';
}

/**
 * KivyClient is a stateless HTTP client.
 * The access token is stored in an HttpOnly cookie by the backend on login
 * and forwarded automatically by the browser on every request — the client
 * no longer holds or passes any token strings.
 */
export class KivyClient {
  auth = {
    login: async (credentials: { email: string; password: string }) => {
      const { user } = await api.post<{ user: UserProfile }>(API.LOGIN, credentials);
      return user;
    },

    register: async (data: { email: string; password: string; role: 'SELLER' | 'ADMIN' }) => {
      const { user } = await api.post<{ user: UserProfile }>(API.REGISTER, data);
      return user;
    },

    me: async (): Promise<UserProfile> => {
      const { user } = await api.get<{ user: UserProfile }>(API.ME);
      return user;
    },

    logout: async () => {
      await api.post<{ success: boolean }>(API.LOGOUT, {}).then(res => res);
    },
  };

  seller = {
    getVerificationStatus: () =>
      api.get<VerificationRecord>(API.VERIFICATION_STATUS),

    uploadVerificationDocument: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.postForm<VerificationRecord>(API.VERIFICATION_DOCUMENT, formData);
    },

    getProducts: () =>
      api.get<Product[]>(API.PRODUCTS),

    createProduct: (data: { name: string; description?: string; price: number }) =>
      api.post<Product>(API.PRODUCTS, data),
  };

  admin = {
    getMetrics: () =>
      api.get<AdminMetrics>(API.ADMIN_METRICS),

    listVerifications: async (status?: string) => {
      if (status === 'VERIFIED_APPROVED') {
        const data = await api.get<AdminVerificationRecord[]>(API.ADMIN_VERIFICATIONS);
        return data.filter(
          (v) => v.status === 'VERIFIED' || v.status === 'APPROVED',
        );
      }

      const url = status
        ? `${API.ADMIN_VERIFICATIONS}?status=${status}`
        : API.ADMIN_VERIFICATIONS;
      return api.get<AdminVerificationRecord[]>(url);
    },

    makeDecision: (id: string, status: 'APPROVED' | 'REJECTED', reason: string) =>
      api.post<{ success: boolean; new_status: VerificationStatus }>(
        API.ADMIN_DECIDE(id),
        { status, reason },
      ).then(res => res), // full object returned

    getVerificationHistory: (id: string) =>
      api.get<VerificationEventRecord[]>(API.ADMIN_HISTORY(id)),
  };
}
