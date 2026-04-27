// Service-role access was moved to backend service.
export function createServerOnlyBackendBoundary() {
  throw new Error('Service role access is not available in frontend. Use BACKEND_API_URL proxy routes.');
}
