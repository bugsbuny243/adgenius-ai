import 'server-only';

import { notFound, redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function normalizeValue(value?: string | null): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}

export function isPlatformOwner(user: Pick<User, 'id' | 'email'> | null | undefined): boolean {
  if (!user) return false;

  const ownerUserId = normalizeValue(process.env.OWNER_USER_ID);
  const ownerEmail = normalizeValue(process.env.OWNER_EMAIL)?.toLowerCase();

  const normalizedUserId = normalizeValue(user.id);
  const normalizedEmail = normalizeValue(user.email)?.toLowerCase();

  if (ownerUserId && normalizedUserId === ownerUserId) return true;
  if (ownerEmail && normalizedEmail === ownerEmail) return true;

  return false;
}

export async function requirePlatformOwner() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (!isPlatformOwner(user)) {
    notFound();
  }

  return user;
}
