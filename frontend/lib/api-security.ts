import { z } from 'zod';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'unknown';
}

export function enforceRateLimit(request: Request, scope: string): Response | null {
  const ip = getClientIp(request);
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  if (existing.count >= MAX_REQUESTS) {
    return Response.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  existing.count += 1;
  return null;
}

export const gameFactoryBuildSchema = z.object({
  projectId: z.string().trim().min(1),
  username: z.string().trim().min(1).max(80),
  gameName: z.string().trim().min(1).max(80),
  workspace_id: z.string().trim().optional(),
  user_id: z.string().trim().optional()
});

export const generateSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  project_id: z.string().trim().min(1)
});

export const refreshSchema = z.object({ projectId: z.string().trim().min(1) });
