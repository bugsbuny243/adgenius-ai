const PUBLIC_ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;
const SERVER_ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'AI_PROVIDER',
  'OPENAI_MODEL_PRIMARY',
  'OPENAI_MODEL_REASONING',
  'OPENAI_MODEL_FAST',
  'OPENAI_MODEL_LIGHT',
  'OPENAI_REASONING_EFFORT',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'APP_ORIGIN',
  'GITHUB_UNITY_REPO_OWNER',
  'GITHUB_UNITY_REPO_NAME',
  'GITHUB_UNITY_REPO_BRANCH',
  'GITHUB_UNITY_REPO_TOKEN',
  'UNITY_ORG_ID',
  'UNITY_PROJECT_ID',
  'UNITY_BUILD_TARGET_ID',
  'UNITY_SERVICE_ACCOUNT_KEY_ID',
  'UNITY_SERVICE_ACCOUNT_SECRET_KEY',
  'GOOGLE_PLAY_PACKAGE_NAME',
  'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64',
  'GOOGLE_PLAY_DEFAULT_TRACK'
] as const;

type PublicEnvKey = (typeof PUBLIC_ENV_KEYS)[number];
type ServerEnvKey = (typeof SERVER_ENV_KEYS)[number];

type OwnerEnvKey = 'OWNER_USER_ID' | 'OWNER_EMAIL';

function hasValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function readServerEnv(name: ServerEnvKey): string | null {
  const value = process.env[name];
  return hasValue(value) ? value : null;
}

export function getPublicEnv(): Record<PublicEnvKey, string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    NEXT_PUBLIC_SUPABASE_URL: hasValue(supabaseUrl) ? supabaseUrl : null,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: hasValue(supabaseAnonKey) ? supabaseAnonKey : null
  };
}

export function getServerEnv(): Record<ServerEnvKey, string | null> {
  return {
    SUPABASE_URL: readServerEnv('SUPABASE_URL'),
    SUPABASE_ANON_KEY: readServerEnv('SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: readServerEnv('SUPABASE_SERVICE_ROLE_KEY'),
    OPENAI_API_KEY: readServerEnv('OPENAI_API_KEY'),
    AI_PROVIDER: readServerEnv('AI_PROVIDER'),
    OPENAI_MODEL_PRIMARY: readServerEnv('OPENAI_MODEL_PRIMARY'),
    OPENAI_MODEL_REASONING: readServerEnv('OPENAI_MODEL_REASONING'),
    OPENAI_MODEL_FAST: readServerEnv('OPENAI_MODEL_FAST'),
    OPENAI_MODEL_LIGHT: readServerEnv('OPENAI_MODEL_LIGHT'),
    OPENAI_REASONING_EFFORT: readServerEnv('OPENAI_REASONING_EFFORT'),
    GOOGLE_CLIENT_ID: readServerEnv('GOOGLE_CLIENT_ID'),
    GOOGLE_CLIENT_SECRET: readServerEnv('GOOGLE_CLIENT_SECRET'),
    GOOGLE_REDIRECT_URI: readServerEnv('GOOGLE_REDIRECT_URI'),
    APP_ORIGIN: readServerEnv('APP_ORIGIN'),
    GITHUB_UNITY_REPO_OWNER: readServerEnv('GITHUB_UNITY_REPO_OWNER'),
    GITHUB_UNITY_REPO_NAME: readServerEnv('GITHUB_UNITY_REPO_NAME'),
    GITHUB_UNITY_REPO_BRANCH: readServerEnv('GITHUB_UNITY_REPO_BRANCH'),
    GITHUB_UNITY_REPO_TOKEN: readServerEnv('GITHUB_UNITY_REPO_TOKEN'),
    UNITY_ORG_ID: readServerEnv('UNITY_ORG_ID'),
    UNITY_PROJECT_ID: readServerEnv('UNITY_PROJECT_ID'),
    UNITY_BUILD_TARGET_ID: readServerEnv('UNITY_BUILD_TARGET_ID'),
    UNITY_SERVICE_ACCOUNT_KEY_ID: readServerEnv('UNITY_SERVICE_ACCOUNT_KEY_ID'),
    UNITY_SERVICE_ACCOUNT_SECRET_KEY: readServerEnv('UNITY_SERVICE_ACCOUNT_SECRET_KEY'),
    GOOGLE_PLAY_PACKAGE_NAME: readServerEnv('GOOGLE_PLAY_PACKAGE_NAME'),
    GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64: readServerEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64'),
    GOOGLE_PLAY_DEFAULT_TRACK: readServerEnv('GOOGLE_PLAY_DEFAULT_TRACK')
  };
}

export function getEnvDiagnostics() {
  const isServerRuntime = typeof window === 'undefined';
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  const missingPublicEnv = PUBLIC_ENV_KEYS.filter((key) => !publicEnv[key]);
  const missingServerEnv = isServerRuntime ? SERVER_ENV_KEYS.filter((key) => !serverEnv[key]) : [];

  return {
    publicEnv,
    serverEnv,
    missingPublicEnv,
    missingServerEnv,
    publicReady: missingPublicEnv.length === 0,
    serverReady: isServerRuntime ? missingServerEnv.length === 0 : true
  };
}


export function getOwnerEnv(): Record<OwnerEnvKey, string | null> {
  return {
    OWNER_USER_ID: hasValue(process.env.OWNER_USER_ID) ? process.env.OWNER_USER_ID : null,
    OWNER_EMAIL: hasValue(process.env.OWNER_EMAIL) ? process.env.OWNER_EMAIL : null
  };
}
