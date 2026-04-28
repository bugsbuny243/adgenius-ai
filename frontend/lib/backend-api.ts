export function getBackendApiUrl(): never {
  throw new Error('External backend is disabled in single-service mode.');
}
