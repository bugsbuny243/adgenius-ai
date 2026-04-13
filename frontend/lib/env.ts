const PUBLIC_ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;
const SERVER_ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY'] as const;

type PublicEnvKey = (typeof PUBLIC_ENV_KEYS)[number];
type ServerEnvKey = (typeof SERVER_ENV_KEYS)[number];

function hasValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function readEnv(name: string): string | null {
  const value = process.env[name];
  return hasValue(value) ? value : null;
}

export function getPublicEnv(): Record<PublicEnvKey, string | null> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: readEnv('NEXT_PUBLIC_SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  };
}

export function getServerEnv(): Record<ServerEnvKey, string | null> {
  return {
    SUPABASE_URL: readEnv('SUPABASE_URL'),
    SUPABASE_ANON_KEY: readEnv('SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: readEnv('SUPABASE_SERVICE_ROLE_KEY'),
    GEMINI_API_KEY: readEnv('GEMINI_API_KEY')
  };
}

export function getEnvDiagnostics() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  const missingPublicEnv = PUBLIC_ENV_KEYS.filter((key) => !publicEnv[key]);
  const missingServerEnv = SERVER_ENV_KEYS.filter((key) => !serverEnv[key]);

  return {
    publicEnv,
    serverEnv,
    missingPublicEnv,
    missingServerEnv,
    publicReady: missingPublicEnv.length === 0,
    serverReady: missingServerEnv.length === 0
  };
}
