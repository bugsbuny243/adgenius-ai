'use strict';

/**
 * Koschei Backend API
 * - Express server for autonomous Unity build requests
 * - Railway-ready runtime configuration
 * - Supabase integration placeholder for persistence layer
 */

const crypto = require('node:crypto');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env when available.
dotenv.config();

const app = express();
const PORT = Number.parseInt(process.env.PORT, 10) || 3000;

// Security-minded baseline middlewares.
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));

/**
 * Normalizes user-provided identifiers so we can safely build a bundleId.
 * Keeps only lowercase alphanumeric and dashes, then trims edge dashes.
 */
function toSlug(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Produces a cryptographically secure random password string.
 */
function generateSecureToken(length = 24) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

/**
 * Liveness route for quick health checks.
 */
app.get('/', (_req, res) => {
  res.status(200).json({
    ok: true,
    message: 'Koschei backend is active and ready to orchestrate Unity builds.'
  });
});

/**
 * Starts an autonomous build flow.
 * Expected body: { username: string, gameName: string }
 */
app.post('/api/start-build', (req, res) => {
  const { username, gameName } = req.body || {};

  if (
    typeof username !== 'string' ||
    typeof gameName !== 'string' ||
    !username.trim() ||
    !gameName.trim()
  ) {
    return res.status(400).json({
      ok: false,
      error: 'username and gameName are required and must be non-empty strings.'
    });
  }

  const usernameSlug = toSlug(username);
  const gameNameSlug = toSlug(gameName);

  if (!usernameSlug || !gameNameSlug) {
    return res.status(400).json({
      ok: false,
      error: 'username and gameName must contain at least one alphanumeric character.'
    });
  }

  const buildConfig = {
    username: username.trim(),
    gameName: gameName.trim(),
    bundleId: `com.koschei.${usernameSlug}.${gameNameSlug}`,
    keystorePassword: generateSecureToken(24),
    keystoreAlias: `koschei-${usernameSlug}-${generateSecureToken(8)}`
  };

  // TODO: Persist buildConfig to Supabase (orders/build_jobs table) before triggering Unity agent.
  console.log('[Koschei] New build request received:', {
    username: buildConfig.username,
    gameName: buildConfig.gameName,
    bundleId: buildConfig.bundleId,
    keystorePassword: buildConfig.keystorePassword,
    keystoreAlias: buildConfig.keystoreAlias
  });

  return res.status(200).json({
    ok: true,
    message: 'Build configuration generated successfully.',
    data: buildConfig
  });
});

/**
 * Starts Koschei autonomous Unity build flow (requested route).
 * Expected body: { username: string, gameName: string }
 */
app.post('/api/koschei/start-build', (req, res) => {
  const { username, gameName } = req.body || {};

  if (
    typeof username !== 'string' ||
    typeof gameName !== 'string' ||
    !username.trim() ||
    !gameName.trim()
  ) {
    return res.status(400).json({
      status: 'error',
      message: 'username ve gameName zorunludur.'
    });
  }

  const usernameSlug = toSlug(username);
  const gameNameSlug = toSlug(gameName);

  if (!usernameSlug || !gameNameSlug) {
    return res.status(400).json({
      status: 'error',
      message: 'username ve gameName en az bir alfanümerik karakter içermelidir.'
    });
  }

  const keystorePassword = generateSecureToken(24);
  const keyAlias = `koschei-${usernameSlug}-${generateSecureToken(8)}`;
  const bundleId = `com.koschei.${usernameSlug}.${gameNameSlug}`;

  console.log('[Koschei] Unity build için kritik veriler üretildi:', {
    username: username.trim(),
    gameName: gameName.trim(),
    keystorePassword,
    keyAlias,
    bundleId
  });

  return res.status(200).json({
    status: 'success',
    message: 'Koschei uyandı, Unity ajanına veriler hazırlandı',
    data: {
      username: username.trim(),
      gameName: gameName.trim(),
      keystorePassword,
      keyAlias,
      bundleId
    }
  });
});

app.listen(PORT, () => {
  console.log(`[Koschei] Backend server is running on port ${PORT}`);
});
