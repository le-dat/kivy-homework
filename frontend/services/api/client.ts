const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) =>
    apiRequest<{ data: T }>(path, { method: 'GET' }).then(res => res.data),

  post: <T>(path: string, body: unknown) =>
    apiRequest<{ data: T }>(path, { method: 'POST', body: JSON.stringify(body) }).then(res => res.data),

  postForm: <T>(path: string, formData: FormData) =>
    apiRequest<{ data: T }>(path, { method: 'POST', body: formData }).then(res => res.data),
};
