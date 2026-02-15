/**
 * Sync AI API keys from .env into Supabase ai_api_keys table.
 * Uses same encryption as apps/superadmin (AES-256-GCM + PBKDF2) so the UI can decrypt.
 * Run from repo root: npx tsx scripts/sync_ai_api_keys_from_env.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

const TEST_USER_ID = '2cd70d9d-9d84-4d2a-9848-df5b3898e4c4';

const ENV_KEYS: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  grok: 'GROK_API_KEY',
};

function getPassphrase(): string {
  return process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'opm-ai-settings-default-key-2026';
}

/**
 * Match apps/superadmin/lib/crypto.ts: PBKDF2 + AES-256-GCM, output base64(salt+ciphertext+tag), base64(iv).
 */
function encryptApiKey(plaintext: string): { encrypted: string; iv: string } {
  const passphrase = getPassphrase();
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, encrypted, tag]);
  return {
    encrypted: combined.toString('base64'),
    iv: iv.toString('base64'),
  };
}

async function main() {
  const envPath = path.join(process.cwd(), '.env');
  dotenv.config({ path: envPath });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  for (const [provider, envVar] of Object.entries(ENV_KEYS)) {
    const raw = process.env[envVar]?.trim();
    if (!raw) {
      console.log(`Skip ${provider}: ${envVar} not set`);
      continue;
    }
    const { encrypted, iv } = encryptApiKey(raw);
    await supabase.from('ai_api_keys').update({ is_active: false }).eq('user_id', TEST_USER_ID).eq('provider', provider);
    const { error } = await supabase.from('ai_api_keys').insert({
      user_id: TEST_USER_ID,
      provider,
      api_key_encrypted: encrypted,
      iv,
      is_active: true,
    });
    if (error) {
      console.error(`${provider}: ${error.message}`);
      continue;
    }
    console.log(`Updated ai_api_keys for ${provider}`);
  }
  console.log('Done. Check http://localhost:54323 → Table Editor → ai_api_keys');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
