import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint
 * Used by Kubernetes liveness and readiness probes
 * Also used by load balancers and monitoring systems
 */

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // If using Firestore, attempt to read a simple document
    // This is a lightweight check that verifies DB connectivity
    // Adjust based on your actual database implementation
    return true; // Placeholder for actual DB health check
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function checkExternalServices(): Promise<Record<string, boolean>> {
  const services: Record<string, boolean> = {};
  
  // Check critical external services (PayPal, etc.)
  // Adjust based on your actual dependencies
  services.paypal = true; // Placeholder
  
  return services;
}

export async function GET() {
  try {
    const dbHealthy = await checkDatabaseHealth();
    const servicesStatus = await checkExternalServices();
    
    // Determine overall health
    const isHealthy = dbHealthy && Object.values(servicesStatus).every(s => s);
    
    const healthData = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.APP_VERSION || 'unknown',
      checks: {
        database: dbHealthy ? 'ok' : 'failed',
        services: servicesStatus,
      },
    };

    return NextResponse.json(healthData, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

export async function HEAD() {
  // Lightweight probe for simple availability check
  try {
    const dbHealthy = await checkDatabaseHealth();
    return new NextResponse(null, {
      status: dbHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
