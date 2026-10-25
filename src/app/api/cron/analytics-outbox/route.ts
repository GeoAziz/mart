import { NextResponse } from 'next/server';
import { processOutboxBatch } from '@/lib/analytics-worker';

export const dynamic = 'force-dynamic';

/**
 * HTTP Cron Trigger for Analytics Outbox Processing
 * Can be triggered periodically by Vercel Cron, Google Cloud Scheduler, or an uptime robot.
 * Requires Bearer token matching CRON_SECRET if defined.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await processOutboxBatch({
      batchSize: 25,
      workerId: `http_cron_${Date.now()}`,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (err: any) {
    console.error('[Cron:AnalyticsOutbox] Error processing batch:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}

