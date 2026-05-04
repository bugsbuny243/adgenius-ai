const REQUIRED_ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GITHUB_UNITY_REPO_OWNER',
  'GITHUB_UNITY_REPO_NAME',
  'GITHUB_UNITY_REPO_BRANCH',
  'GITHUB_UNITY_REPO_TOKEN',
  'UNITY_ORG_ID',
  'UNITY_PROJECT_ID',
  'UNITY_BUILD_TARGET_ID',
  'UNITY_BUILD_API_KEY',
  'UNITY_WEBHOOK_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'GOOGLE_PLAY_DEFAULT_TRACK',
  'ENCRYPTION_SECRET',
  'AI_PROVIDER'
] as const;

type RequiredKey = (typeof REQUIRED_ENV_KEYS)[number];

type BackendEnv = Record<RequiredKey, string>;

function required(name: RequiredKey): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required backend env: ${name}`);
  return value;
}

export function loadEnv(): BackendEnv {
  const env = Object.fromEntries(REQUIRED_ENV_KEYS.map((key) => [key, required(key)])) as BackendEnv;
  const aiProvider = env.AI_PROVIDER.toLowerCase();

  if (aiProvider !== 'huggingface') {
    throw new Error('Invalid backend env: AI_PROVIDER must be "huggingface"');
  }

  return env;
}
