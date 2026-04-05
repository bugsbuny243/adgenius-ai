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

const API_REQUEST_TIMEOUT_MS = 30000;

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return { signal: controller.signal, timeoutId };
}

export async function getAccessTokenOrThrow() {
  const supabase = createBrowserSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new ApiRequestError('Oturum bulunamadı. Lütfen tekrar giriş yapın.', 401);
  }

  return session.access_token;
}

export async function postJsonWithSession<TResponse, TRequest extends object>(
  url: string,
  body: TRequest,
): Promise<TResponse> {
  const accessToken = await getAccessTokenOrThrow();
  const { signal, timeoutId } = createTimeoutSignal(API_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    window.clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiRequestError('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.', 408);
    }

    throw error;
  }
  window.clearTimeout(timeoutId);

  let payload: (TResponse & ApiErrorResponse) | ApiErrorResponse = {};
  try {
    payload = (await response.json()) as (TResponse & ApiErrorResponse) | ApiErrorResponse;
  } catch {
    if (!response.ok) {
      throw new ApiRequestError('Sunucudan geçersiz yanıt alındı.', response.status);
    }
  }

  if (!response.ok || payload.error) {
    throw new ApiRequestError(payload.error ?? 'Bir hata oluştu.', response.status);
  }

  return payload as TResponse;
}
