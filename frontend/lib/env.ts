const PUBLIC_ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SITE_URL'] as const;
const SERVER_ENV_KEYS = ['BACKEND_API_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'AI_PROVIDER', 'OPENAI_API_KEY', 'GROQ_API_KEY'] as const;

type PublicEnvKey = (typeof PUBLIC_ENV_KEYS)[number];
type ServerEnvKey = (typeof SERVER_ENV_KEYS)[number];
type OwnerEnvKey = 'OWNER_USER_ID' | 'OWNER_EMAIL';

function hasValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function read(name: string): string | null {
  const value = process.env[name];
  return hasValue(value) ? value : null;
}

export function getPublicEnv(): Record<PublicEnvKey, string | null> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: read('NEXT_PUBLIC_SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: read('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    NEXT_PUBLIC_SITE_URL: read('NEXT_PUBLIC_SITE_URL')
  };
}

export function getServerEnv(): Record<ServerEnvKey, string | null> {
  return {
    BACKEND_API_URL: read('BACKEND_API_URL'),
    SUPABASE_URL: read('SUPABASE_URL') ?? read('NEXT_PUBLIC_SUPABASE_URL'),
    SUPABASE_ANON_KEY: read('SUPABASE_ANON_KEY') ?? read('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    AI_PROVIDER: read('AI_PROVIDER'),
    OPENAI_API_KEY: read('OPENAI_API_KEY'),
    GROQ_API_KEY: read('GROQ_API_KEY')
  };
}

export function getEnvDiagnostics() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();
  const missingPublicEnv = PUBLIC_ENV_KEYS.filter((key) => !publicEnv[key]);
  const missingServerEnv = typeof window === 'undefined' ? SERVER_ENV_KEYS.filter((key) => key === 'BACKEND_API_URL' && !serverEnv[key]) : [];

  return {
    publicEnv,
    serverEnv,
    missingPublicEnv,
    missingServerEnv,
    publicReady: missingPublicEnv.length === 0,
    serverReady: missingServerEnv.length === 0,
    groupReadiness: {
      supabase: Boolean(publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      backendApi: Boolean(serverEnv.BACKEND_API_URL)
    }
  };
}

export function getOwnerEnv(): Record<OwnerEnvKey, string | null> {
  return {
    OWNER_USER_ID: read('OWNER_USER_ID'),
    OWNER_EMAIL: read('OWNER_EMAIL')
  };
}
