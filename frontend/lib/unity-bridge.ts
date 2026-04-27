// Unity bridge moved to backend.
export class UnityClientMovedError extends Error {
  constructor() {
    super('Unity operations are backend-only.');
  }
}
