import { NextResponse } from 'next/server';
import { getEnvDiagnostics } from '@/lib/env';

export async function GET() {
  const diagnostics = getEnvDiagnostics();

  return NextResponse.json({
    app: 'up',
    environment: {
      public: {
        ready: diagnostics.publicReady,
        missingCount: diagnostics.missingPublicEnv.length
      },
      server: {
        ready: diagnostics.serverReady,
        missingCount: diagnostics.missingServerEnv.length
      }
    },
    supabase: {
      browserClientReady: diagnostics.publicReady,
      serverClientReady: Boolean(diagnostics.serverEnv.SUPABASE_URL && diagnostics.serverEnv.SUPABASE_ANON_KEY),
      ready: diagnostics.publicReady && Boolean(diagnostics.serverEnv.SUPABASE_URL && diagnostics.serverEnv.SUPABASE_ANON_KEY)
    }
  });
}
