import { useMemo } from 'react';
import { KivyClient } from '@/services/api/kivyClient';

/** Returns a singleton KivyClient instance. No token required — the browser
 *  automatically sends the HttpOnly session cookie on every request. */
export function useApiClient() {
  return useMemo(() => new KivyClient(), []);
}
