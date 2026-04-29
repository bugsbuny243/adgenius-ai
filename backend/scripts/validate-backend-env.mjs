import { loadEnv } from '../dist/env.js';

try {
  const env = loadEnv();
  console.info('Backend environment is valid.', {
    aiProvider: env.AI_PROVIDER,
    unityProject: env.UNITY_PROJECT_ID,
    unityBuildTarget: env.UNITY_BUILD_TARGET_ID
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Backend environment validation failed:', message);
  process.exitCode = 1;
}
