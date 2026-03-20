export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // This part runs ONLY on the server (Node.js runtime)
    // You can initialize Sentry, OpenTelemetry, or custom monitoring here
    console.log('--- Server Performance Monitoring Initialized (Node.js) ---');
    
    // In a real scenario, you might do:
    // const { registerOTel } = await import('@vercel/otel');
    // registerOTel('owner-property-management');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // This part runs ONLY on the Edge runtime
    console.log('--- Server Performance Monitoring Initialized (Edge) ---');
  }
}
