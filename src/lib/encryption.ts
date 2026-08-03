import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY env var must be a 64-character hex string (32 bytes). ' +
        'Generate with: openssl rand -hex 32'
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a colon-delimited string: iv:authTag:ciphertext (all hex-encoded).
 */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * Decrypt a value produced by encrypt().
 */
export function decrypt(encoded: string): string {
  const [ivHex, authTagHex, ciphertextHex] = encoded.split(':');
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Invalid encrypted value format');
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

/**
 * Encrypt a value only if ENCRYPTION_KEY is configured; pass through otherwise
 * (allows gradual rollout in development without breaking existing data).
 */
export function encryptIfConfigured(value: string): string {
  if (!process.env.ENCRYPTION_KEY) return value;
  return encrypt(value);
}

/**
 * Decrypt a value that may or may not have been encrypted (handles migration).
 * If the value doesn't look like an encrypted blob, returns it as-is.
 */
export function decryptIfEncrypted(value: string): string {
  if (!process.env.ENCRYPTION_KEY) return value;
  // Encrypted blobs contain two colons separating iv:authTag:ciphertext
  if ((value.match(/:/g) || []).length !== 2) return value;
  try {
    return decrypt(value);
  } catch {
    return value;
  }
}
