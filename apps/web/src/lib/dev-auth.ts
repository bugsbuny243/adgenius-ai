export function isDevAuthBypassEnabledOnClient() {
  return process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';
}
