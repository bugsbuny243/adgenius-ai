import { createCipheriv, createHash, randomBytes } from 'node:crypto';

const AES_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;

export type EncryptedCredentialsPayload = {
  iv: string;
  authTag: string;
  ciphertext: string;
};

function resolveEncryptionKey(): Buffer {
  const secret = process.env.KOSCHEI_CREDENTIALS_ENCRYPTION_KEY?.trim();
  if (!secret) throw new Error('Missing KOSCHEI_CREDENTIALS_ENCRYPTION_KEY.');
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
