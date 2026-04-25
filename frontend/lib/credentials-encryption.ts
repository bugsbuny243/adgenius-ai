import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const AES_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;

export type EncryptedCredentialsPayload = {
  iv: string;
  authTag: string;
  ciphertext: string;
};

function resolveEncryptionKey(): Buffer {
  const secret = process.env.KOSCHEI_CREDENTIALS_ENCRYPTION_KEY?.trim();

  if (!secret) {
    throw new Error(
      'Missing required server configuration: KOSCHEI_CREDENTIALS_ENCRYPTION_KEY must be set for credentials encryption.'
    );
  }

  return createHash('sha256').update(secret, 'utf8').digest();
}

export function encryptCredentials(value: string): EncryptedCredentialsPayload {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const key = resolveEncryptionKey();
  const cipher = createCipheriv(AES_ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
}

export function decryptCredentials(payload: EncryptedCredentialsPayload): string {
  const key = resolveEncryptionKey();
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');

  const decipher = createDecipheriv(AES_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

export function serializeEncryptedCredentials(payload: EncryptedCredentialsPayload): string {
  return JSON.stringify(payload);
}

export function tryParseEncryptedCredentials(value: string | null | undefined): EncryptedCredentialsPayload | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<EncryptedCredentialsPayload>;
    if (typeof parsed.iv !== 'string' || typeof parsed.authTag !== 'string' || typeof parsed.ciphertext !== 'string') {
      return null;
    }

    return {
      iv: parsed.iv,
      authTag: parsed.authTag,
      ciphertext: parsed.ciphertext
    };
  } catch {
    return null;
  }
}
