const PUBLIC_ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;
const SERVER_ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'APP_ORIGIN'
] as const;

type PublicEnvKey = (typeof PUBLIC_ENV_KEYS)[number];
type ServerEnvKey = (typeof SERVER_ENV_KEYS)[number];

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
    GEMINI_API_KEY: readServerEnv('GEMINI_API_KEY'),
    GOOGLE_CLIENT_ID: readServerEnv('GOOGLE_CLIENT_ID'),
    GOOGLE_CLIENT_SECRET: readServerEnv('GOOGLE_CLIENT_SECRET'),
    GOOGLE_REDIRECT_URI: readServerEnv('GOOGLE_REDIRECT_URI'),
    APP_ORIGIN: readServerEnv('APP_ORIGIN')
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
