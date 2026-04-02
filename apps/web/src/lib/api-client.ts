const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  return response.json()
}

export function apiGet(path: string) {
  return request(path)
}

export function apiPost(path: string, body: unknown) {
  return request(path, { method: 'POST', body: JSON.stringify(body) })
}
