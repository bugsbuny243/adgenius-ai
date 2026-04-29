import 'server-only';

import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function normalizeValue(value?: string | null): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function getOwnerEmailAllowlist(): string[] {
  const ownerEmail = normalizeValue(process.env.OWNER_EMAIL)?.toLowerCase();
  const ownerEmailAllowlist = normalizeValue(process.env.OWNER_EMAIL_ALLOWLIST)
    ?.split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0) ?? [];
  const ownerEmails = normalizeValue(process.env.OWNER_EMAILS)
    ?.split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0) ?? [];

  ownerEmailAllowlist.push(...ownerEmails);

  if (ownerEmail) {
    ownerEmailAllowlist.push(ownerEmail);
  }

  ownerEmailAllowlist.push('onur24sel@gmail.com');

  return Array.from(new Set(ownerEmailAllowlist));
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
  const ownerEmails = getOwnerEmailAllowlist();

  const normalizedUserId = normalizeValue(user.id);
  const normalizedEmail = normalizeValue(user.email)?.toLowerCase();

  if (ownerUserId && normalizedUserId === ownerUserId) return true;
  if (normalizedEmail && ownerEmails.includes(normalizedEmail)) return true;

  return false;
}

export async function getOwnerAccess() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/signin');
  }

  return {
    user,
    isOwner: isPlatformOwner(user)
  };
}

export async function requirePlatformOwner() {
  const { user, isOwner } = await getOwnerAccess();

  if (!isOwner) {
    throw new Error('OWNER_ACCESS_DENIED');
  }

  return user;
}
