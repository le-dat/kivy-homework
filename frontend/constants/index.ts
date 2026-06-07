export const ROUTES = {
  LOGIN: '/seller/login',
  SELLER_DASHBOARD: '/seller/dashboard',
  SELLER_PRODUCTS: '/seller/products',
  SELLER_LOGIN: '/seller/login',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_DASHBOARD: '/admin/dashboard',
} as const;

// API endpoints - directly call NestJS backend via NEXT_PUBLIC_API_URL
export const API = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  ME: '/auth/me',
  LOGOUT: '/auth/logout',
  VERIFICATION_STATUS: '/seller/verification/status',
  VERIFICATION_DOCUMENT: '/seller/documents',
  PRODUCTS: '/seller/products',
  ADMIN_METRICS: '/admin/metrics',
  ADMIN_VERIFICATIONS: '/admin/verifications',
  ADMIN_DECIDE: (id: string) => `/admin/verifications/${id}/decide`,
  ADMIN_HISTORY: (id: string) => `/admin/verifications/${id}/history`,
  NOTIFICATIONS: '/seller/notifications',
  NOTIFICATION_READ: (id: string) => `/seller/notifications/${id}/read`,
  NOTIFICATIONS_READ_ALL: '/seller/notifications/read-all',
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];