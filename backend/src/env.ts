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
  'KOSCHEI_CREDENTIALS_ENCRYPTION_KEY',
  'AI_PROVIDER'
] as const;

type RequiredKey = (typeof REQUIRED_ENV_KEYS)[number];

type BackendEnv = Record<RequiredKey, string> & {
  OPENAI_API_KEY: string | null;
  GROQ_API_KEY: string | null;
};

function required(name: RequiredKey): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required backend env: ${name}`);
  return value;
}

function optional(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function requireAbsoluteUrl(value: string, envKey: string): void {
  try {
    const parsed = new URL(value);
    if (!parsed.protocol.startsWith('http')) throw new Error('protocol');
  } catch {
    throw new Error(`Invalid backend env: ${envKey} must be a valid http(s) URL`);
  }
}

function requireBase64Key(value: string, envKey: string): void {
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length !== 32) {
    throw new Error(`Invalid backend env: ${envKey} must decode to 32 bytes`);
  }
}

function validateEnv(env: Record<RequiredKey, string>): void {
  requireAbsoluteUrl(env.SUPABASE_URL, 'SUPABASE_URL');
  requireAbsoluteUrl(env.GOOGLE_REDIRECT_URI, 'GOOGLE_REDIRECT_URI');
  if (!/^[a-z0-9_.-]+$/i.test(env.UNITY_BUILD_TARGET_ID)) {
    throw new Error('Invalid backend env: UNITY_BUILD_TARGET_ID contains unsupported characters');
  }
  requireBase64Key(env.KOSCHEI_CREDENTIALS_ENCRYPTION_KEY, 'KOSCHEI_CREDENTIALS_ENCRYPTION_KEY');
}

export function loadEnv(): BackendEnv {
  const env = Object.fromEntries(REQUIRED_ENV_KEYS.map((key) => [key, required(key)])) as Record<RequiredKey, string>;
  validateEnv(env);
  const aiProvider = env.AI_PROVIDER.toLowerCase();
  const openai = optional('OPENAI_API_KEY');
  const groq = optional('GROQ_API_KEY');

  if (aiProvider === 'openai' && !openai) {
    throw new Error('Missing required backend env: OPENAI_API_KEY (AI_PROVIDER=openai)');
  }

  if (aiProvider === 'groq' && !groq) {
    throw new Error('Missing required backend env: GROQ_API_KEY (AI_PROVIDER=groq)');
  }

  return {
    ...env,
    OPENAI_API_KEY: openai,
    GROQ_API_KEY: groq
  };
}
