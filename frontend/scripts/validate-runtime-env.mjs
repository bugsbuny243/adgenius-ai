const requiredPublicEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SITE_URL'];
const requiredServerEnv = ['BACKEND_API_URL'];

function isPresent(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function missingKeys(keys) {
  return keys.filter((key) => !isPresent(process.env[key]));
}

const missingPublic = missingKeys(requiredPublicEnv);
const missingServer = missingKeys(requiredServerEnv);

if (missingPublic.length || missingServer.length) {
  const details = [
    missingPublic.length ? `public missing: ${missingPublic.join(', ')}` : null,
    missingServer.length ? `server missing: ${missingServer.join(', ')}` : null
  ]
    .filter(Boolean)
    .join(' | ');

  console.error(`[startup-env] App configuration is incomplete. ${details}`);
  process.exit(1);
}

console.info('[startup-env] Required environment variables are present.');
