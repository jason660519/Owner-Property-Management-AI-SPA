#!/usr/bin/env node
/**
 * SSL Certificate Monitor — Cron Job
 *
 * Checks TLS certificate expiry for each domain in the SSL_MONITOR_DOMAINS
 * environment variable (comma-separated), then upserts results into the
 * `public.ssl_certificates` Supabase table.
 *
 * Recommended schedule (example crontab):
 *   0 6 * * *  node /workspace/scripts/ssl-cert-monitor.js
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL       – Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY      – Service-role key (has write access)
 *   SSL_MONITOR_DOMAINS            – Comma-separated domain list
 *                                    e.g. "example.com,api.example.com"
 *
 * Alert thresholds (days before expiry):
 *   < 7  days  → status = 'expired'         (treated as critical)
 *   < 30 days  → status = 'expiring_soon'
 *   ≥ 30 days  → status = 'valid'
 */

'use strict';

const tls = require('tls');
const { createClient } = require('@supabase/supabase-js');

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DOMAINS_RAW = process.env.SSL_MONITOR_DOMAINS || '';
const CHECK_PORT = parseInt(process.env.SSL_MONITOR_PORT || '443', 10);
const TIMEOUT_MS = 10_000;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[ssl-monitor] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const domains = DOMAINS_RAW.split(',')
  .map((d) => d.trim())
  .filter(Boolean);

if (domains.length === 0) {
  console.log('[ssl-monitor] No domains configured in SSL_MONITOR_DOMAINS. Exiting.');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Certificate check ─────────────────────────────────────────────────────────

/**
 * @param {string} domain
 * @returns {Promise<{
 *   domain: string,
 *   subject: string|null,
 *   issuer: string|null,
 *   valid_from: string|null,
 *   valid_until: string|null,
 *   status: 'valid'|'expiring_soon'|'expired'|'error',
 *   error_message: string|null
 * }>}
 */
function checkDomain(domain) {
  return new Promise((resolve) => {
    const record = {
      domain,
      subject: null,
      issuer: null,
      valid_from: null,
      valid_until: null,
      status: 'unknown',
      error_message: null,
      last_checked_at: new Date().toISOString(),
    };

    const socket = tls.connect(
      { host: domain, port: CHECK_PORT, servername: domain, rejectUnauthorized: false },
      () => {
        try {
          const cert = socket.getPeerCertificate();
          if (!cert || !cert.valid_to) {
            record.status = 'error';
            record.error_message = 'Empty or missing certificate';
            socket.destroy();
            return resolve(record);
          }

          const validFrom = new Date(cert.valid_from);
          const validUntil = new Date(cert.valid_to);
          const daysRemaining = Math.floor((validUntil - Date.now()) / (1000 * 60 * 60 * 24));

          record.subject = cert.subject ? JSON.stringify(cert.subject) : null;
          record.issuer = cert.issuer ? JSON.stringify(cert.issuer) : null;
          record.valid_from = validFrom.toISOString();
          record.valid_until = validUntil.toISOString();

          if (daysRemaining < 7) {
            record.status = 'expired';
          } else if (daysRemaining < 30) {
            record.status = 'expiring_soon';
          } else {
            record.status = 'valid';
          }
        } catch (err) {
          record.status = 'error';
          record.error_message = String(err.message || err);
        }
        socket.destroy();
        resolve(record);
      }
    );

    socket.setTimeout(TIMEOUT_MS, () => {
      socket.destroy();
      record.status = 'error';
      record.error_message = `Connection timed out after ${TIMEOUT_MS}ms`;
      resolve(record);
    });

    socket.on('error', (err) => {
      record.status = 'error';
      record.error_message = String(err.message || err);
      resolve(record);
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[ssl-monitor] Checking ${domains.length} domain(s): ${domains.join(', ')}`);

  const results = await Promise.all(domains.map(checkDomain));

  let successCount = 0;
  let errorCount = 0;

  for (const record of results) {
    const { error } = await supabase.from('ssl_certificates').upsert(
      {
        domain: record.domain,
        subject: record.subject,
        issuer: record.issuer,
        valid_from: record.valid_from,
        valid_until: record.valid_until,
        status: record.status,
        error_message: record.error_message,
        last_checked_at: record.last_checked_at,
        updated_at: record.last_checked_at,
      },
      { onConflict: 'domain' }
    );

    if (error) {
      console.error(`[ssl-monitor] DB upsert failed for ${record.domain}:`, error.message);
      errorCount++;
    } else {
      console.log(`[ssl-monitor] ${record.domain} → ${record.status}`);
      successCount++;
    }
  }

  console.log(`[ssl-monitor] Done. Success: ${successCount}, Errors: ${errorCount}`);
}

main().catch((err) => {
  console.error('[ssl-monitor] Unhandled error:', err);
  process.exit(1);
});
