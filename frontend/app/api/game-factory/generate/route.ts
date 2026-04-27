import { proxyToBackend } from '@/lib/backend-api';

// Temporary proxy route: secret-backed logic moved to backend service.
export async function POST(request: Request) {
  return proxyToBackend(request, '/game-factory/generate');
}
