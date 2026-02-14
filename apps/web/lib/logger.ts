import winston from 'winston';
import Transport from 'winston-transport';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Environment detection
const isServerless = !!(
  process.env.VERCEL ||
  process.env.NETLIFY ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.FUNCTIONS_WORKER_RUNTIME // Cloudflare
);

// Enable file logging in development/container environments
const enableFileLogging = process.env.ENABLE_FILE_LOGGING === 'true' && !isServerless;

/**
 * Supabase Transport for logging to database
 * Compatible with Serverless environments (Vercel, Netlify, Cloudflare, etc.)
 */
class SupabaseTransport extends Transport {
  private supabase: any;
  private batchQueue: Array<any> = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_TIMEOUT = 5000; // 5 seconds

  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
    
    // Initialize Supabase client with service role key for server-side logging
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️  Supabase credentials missing. Logging to Supabase disabled.');
      return;
    }

    this.supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // If Supabase client not initialized, skip
    if (!this.supabase) {
      callback();
      return;
    }

    const logEntry = {
      user_id: info.userId || 'anonymous',
      level: info.level,
      message: info.message,
      metadata: info.metadata || info.meta || {},
      service: info.service || 'web-app',
      created_at: new Date().toISOString(),
    };

    // Add to batch queue
    this.batchQueue.push(logEntry);

    // Flush if batch is full
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      this.flush();
    } else if (!this.batchTimer) {
      // Set timer for batch flush
      this.batchTimer = setTimeout(() => this.flush(), this.BATCH_TIMEOUT);
    }

    callback();
  }

  private async flush() {
    if (this.batchQueue.length === 0) return;

    const logsToInsert = [...this.batchQueue];
    this.batchQueue = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      const { error } = await this.supabase
        .from('logs')
        .insert(logsToInsert);

      if (error) {
        console.error('Failed to write logs to Supabase:', error);
        // Fallback: log to console
        logsToInsert.forEach(log => {
          console.log(`[${log.level.toUpperCase()}] ${log.message}`, log.metadata);
        });
      }
    } catch (err) {
      console.error('Supabase logging error:', err);
    }
  }

  // Ensure remaining logs are flushed on process exit
  async close() {
    await this.flush();
  }
}

/**
 * File-based Transport (only for local/container environments)
 * Disabled in Serverless environments
 */
let FileTransport: any = null;

if (enableFileLogging) {
  const fs = require('fs');
  const path = require('path');
  const LOG_ROOT = process.env.LOG_ROOT || path.join(process.cwd(), 'logs');

  class UserFileTransport extends Transport {
    constructor(opts?: Transport.TransportStreamOptions) {
      super(opts);
    }

    log(info: any, callback: () => void) {
      setImmediate(() => {
        this.emit('logged', info);
      });

      const userId = info.userId || 'anonymous';
      const level = info.level;
      const message = info.message;
      const timestamp = new Date();
      
      const dateStr = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      const dir = path.join(LOG_ROOT, userId, dateStr);
      
      fs.mkdir(dir, { recursive: true }, (err: any) => {
        if (err) {
          console.error(`Failed to create log directory ${dir}:`, err);
          callback();
          return;
        }

        const filename = `user_${userId}_${dateStr}_${level}.log`;
        const filePath = path.join(dir, filename);
        const logEntry = `${timestamp.toISOString()} | ${level.toUpperCase()} | ${message}\n`;

        fs.appendFile(filePath, logEntry, (err: any) => {
          if (err) {
            console.error(`Failed to write to log file ${filePath}:`, err);
          }
          callback();
        });
      });
    }
  }

  FileTransport = UserFileTransport;
}


// Build transports array
const transports: Transport[] = [
  // Console transport (always enabled for development visibility)
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
];

// Add Supabase transport (preferred for production/Serverless)
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  transports.push(new SupabaseTransport());
  console.log('✅ Supabase logging enabled');
} else {
  console.warn('⚠️  Supabase logging disabled: missing credentials');
}

// Add file transport (only for local/container environments)
if (FileTransport) {
  transports.push(new FileTransport());
  console.log('✅ File logging enabled (local/container mode)');
}

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: { 
    service: 'web-app',
    environment: process.env.NODE_ENV || 'development',
  },
  transports,
});

// Graceful shutdown: flush remaining logs
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    const supabaseTransport = transports.find(t => t instanceof SupabaseTransport);
    if (supabaseTransport) {
      await (supabaseTransport as SupabaseTransport).close();
    }
  });
}


/**
 * Helper to log with user context
 */
export const logWithUser = (level: string, message: string, userId: string, meta: any = {}) => {
  logger.log({
    level,
    message,
    userId,
    ...meta
  });
};

export const userLogger = {
    info: (message: string, userId: string, meta?: any) => logWithUser('info', message, userId, meta),
    error: (message: string, userId: string, meta?: any) => logWithUser('error', message, userId, meta),
    warn: (message: string, userId: string, meta?: any) => logWithUser('warn', message, userId, meta),
    debug: (message: string, userId: string, meta?: any) => logWithUser('debug', message, userId, meta),
};

export default logger;
