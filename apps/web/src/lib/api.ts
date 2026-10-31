const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
const accessTokenStorageKey = 'neurolab_access_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(accessTokenStorageKey);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(accessTokenStorageKey, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(accessTokenStorageKey);
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const accessToken = getAccessToken();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(
      'No fue posible conectar con la API. Comprueba que el backend esté iniciado.',
      0,
    );
  }

  if (!response.ok) {
    let message = `La solicitud falló (${response.status}).`;
    try {
      const body = await response.json() as { detail?: unknown; message?: string };
      if (typeof body.detail === 'string') message = body.detail;
      else if (Array.isArray(body.detail)) {
        message = body.detail
          .map((item) => typeof item === 'object' && item !== null && 'msg' in item
            ? String(item.msg)
            : 'Revisa los datos enviados.')
          .join(' ');
      } else if (body.message) message = body.message;
    } catch {
      // Keep the HTTP status message if the server response is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}
