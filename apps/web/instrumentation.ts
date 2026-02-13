
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const fs = await import('fs');
    const path = await import('path');

    const LOG_ROOT = process.env.LOG_ROOT || '/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/logs';
    
    // Ensure log directory exists
    if (!fs.existsSync(LOG_ROOT)) {
      try {
        fs.mkdirSync(LOG_ROOT, { recursive: true });
      } catch (e) {
        console.error('Failed to create log directory:', e);
      }
    }

    const writeCrashLog = (type: string, error: any) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `crash-${timestamp}.log`;
      const filePath = path.join(LOG_ROOT, filename);
      
      const content = `Type: ${type}\nTime: ${new Date().toISOString()}\nError: ${error?.stack || error}\n`;
      
      try {
        fs.writeFileSync(filePath, content);
        console.error(`[CRASH] Error logged to ${filePath}`);
      } catch (e) {
        console.error('[CRASH] Failed to write log', e);
      }
    };

    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      writeCrashLog('UncaughtException', err);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      writeCrashLog('UnhandledRejection', reason);
    });
    
    console.log('Global error handlers registered in instrumentation.ts');
  }
}
