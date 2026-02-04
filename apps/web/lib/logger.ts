import winston from 'winston';
import Transport from 'winston-transport';
import fs from 'fs';
import path from 'path';

// Define log root
const LOG_ROOT = process.env.LOG_ROOT || '/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/logs';

/**
 * Custom Transport to handle dynamic user-based logging
 * Directory: /logs/{user_id}/{date}/
 * File: user_{user_id}_{timestamp}_{log_level}.log
 */
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
    
    // Ensure directory exists
    const dir = path.join(LOG_ROOT, userId, dateStr);
    
    // Use a simple caching for directory existence to reduce syscalls? 
    // For now, synchronous check/mkdir is safer for simplicity, but async is better.
    // We'll use async mkdir.
    
    fs.mkdir(dir, { recursive: true }, (err) => {
        if (err) {
            console.error(`Failed to create log directory ${dir}:`, err);
            callback();
            return;
        }

        // Filename: user_{user_id}_{date}_{log_level}.log
        // We use date as the timestamp component for the filename to avoid creating millions of files.
        const filename = `user_${userId}_${dateStr}_${level}.log`;
        const filePath = path.join(dir, filename);
        
        const logEntry = `${timestamp.toISOString()} | ${level.toUpperCase()} | ${message}\n`;

        fs.appendFile(filePath, logEntry, (err) => {
            if (err) {
                console.error(`Failed to write to log file ${filePath}:`, err);
                // Fallback to console
                console.log(logEntry);
            }
            callback();
        });
    });
  }
}

// Create the logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'web-app' },
  transports: [
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }),
    new UserFileTransport()
  ],
});

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
