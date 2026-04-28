import { NextResponse } from 'next/server';
import { getEnvDiagnostics } from '@/lib/env';

export async function GET() {
  const diagnostics = getEnvDiagnostics();
  const groups = diagnostics.groupReadiness;

  return NextResponse.json({
    ok: diagnostics.publicReady && diagnostics.serverReady,
    app: 'up',
    environment: groups,
    supabase: groups.supabase,
    backendApiConfigured: false
  });
}
