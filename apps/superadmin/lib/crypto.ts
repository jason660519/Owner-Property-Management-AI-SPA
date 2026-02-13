// filepath: apps/superadmin/lib/crypto.ts
// AES-256-GCM encryption/decryption for API keys (browser-side)

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

/**
 * Derive a CryptoKey from a passphrase using PBKDF2
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Get or derive the encryption passphrase
 * In production, this should come from a secure server-side source
 */
function getPassphrase(): string {
  return process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'opm-ai-settings-default-key-2026';
}

/**
 * Encrypt a plaintext API key
 * Returns base64-encoded ciphertext and IV
 */
export async function encryptApiKey(plaintext: string): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(getPassphrase(), salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine salt + ciphertext for storage
  const combined = new Uint8Array(salt.length + new Uint8Array(ciphertext).length);
  combined.set(salt);
  combined.set(new Uint8Array(ciphertext), salt.length);

  return {
    encrypted: btoa(String.fromCharCode(...combined)),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Decrypt an encrypted API key
 */
export async function decryptApiKey(encryptedBase64: string, ivBase64: string): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

  // Extract salt (first 16 bytes) and ciphertext
  const salt = combined.slice(0, 16);
  const ciphertext = combined.slice(16);

  const key = await deriveKey(getPassphrase(), salt);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plainBuffer);
}

/**
 * Mask an API key for display: show first 4 and last 4 characters
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 24))}${key.slice(-4)}`;
}
