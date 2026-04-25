import { NextResponse } from 'next/server';
import { getEnvDiagnostics } from '@/lib/env';

export async function GET() {
  const diagnostics = getEnvDiagnostics();
  const groups = diagnostics.groupReadiness;
  const supabaseReady = groups.supabase;

  return NextResponse.json({
    ok: groups.core && supabaseReady,
    app: 'up',
    environment: groups,
    supabase: supabaseReady,
    githubUnityConfigured: groups.githubUnity,
    unityBuildConfigured: groups.unityBuild,
    googleOAuthConfigured: groups.googleOAuth,
    googlePlayEncryptionConfigured: groups.googlePlayEncryption
  });
}
