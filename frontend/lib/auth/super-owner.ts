function normalizeValue(value?: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function isSuperOwner(userId?: string | null, email?: string | null): boolean {
  const ownerUserId = normalizeValue(process.env.OWNER_USER_ID);
  const ownerEmail = normalizeValue(process.env.OWNER_EMAIL)?.toLowerCase();

  const normalizedUserId = normalizeValue(userId);
  const normalizedEmail = normalizeValue(email)?.toLowerCase();

  if (ownerUserId && normalizedUserId && normalizedUserId === ownerUserId) {
    return true;
  }

  if (ownerEmail && normalizedEmail && normalizedEmail === ownerEmail) {
    return true;
  }

  return false;
}
