import { isDevAuthBypassEnabledOnClient } from '@/lib/dev-auth';
import { createBrowserSupabase } from '@/lib/supabase/client';

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

type ApiErrorResponse = {
  error?: string;
};

export async function getAccessTokenOrThrow() {
  if (isDevAuthBypassEnabledOnClient()) {
    return null;
  }

  const supabase = createBrowserSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new ApiRequestError('Oturum bulunamadı. Lütfen tekrar giriş yapın.', 401);
  }

  return session.access_token;
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  let payload: (T & ApiErrorResponse) | ApiErrorResponse = {};
  try {
    payload = (await response.json()) as (T & ApiErrorResponse) | ApiErrorResponse;
  } catch {
    if (!response.ok) {
      throw new ApiRequestError('Sunucudan geçersiz yanıt alındı.', response.status);
    }
  }

  if (!response.ok || payload.error) {
    throw new ApiRequestError(payload.error ?? 'Bir hata oluştu.', response.status);
  }

  return payload as T;
}

export async function postJsonWithSession<TResponse, TRequest extends object>(url: string, body: TRequest): Promise<TResponse> {
  const accessToken = await getAccessTokenOrThrow();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  return parseApiResponse<TResponse>(response);
}

export async function getJsonWithSession<TResponse>(url: string): Promise<TResponse> {
  const accessToken = await getAccessTokenOrThrow();

  const response = await fetch(url, {
    method: 'GET',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    cache: 'no-store',
  });

  return parseApiResponse<TResponse>(response);
}
