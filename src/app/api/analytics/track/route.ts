import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { applyRateLimit, rateLimitPresets } from '@/lib/rate-limiter';

const analyticsEventSchema = z.object({
  eventType: z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_.:-]+$/),
  eventData: z.any().refine(
    (value) => value === undefined || value === null || (typeof value === 'object' && !Array.isArray(value)),
    { message: 'eventData must be an object when supplied' }
  ).transform((value) => value ?? {}),
  sessionId: z.string().trim().max(256).optional().transform((value) => value || 'anonymous'),
  userId: z.string().trim().max(128).nullable().optional().transform((value) => value || null),
}).strict();

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const limited = await applyRateLimit(req, rateLimitPresets.public, typeof data?.userId === 'string' ? data.userId : undefined);
    if (limited) return limited;

    const validation = analyticsEventSchema.safeParse(data);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid analytics payload', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { eventType, eventData, sessionId, userId } = validation.data;
    const event = {
      eventType,
      eventData,
      sessionId,
      userId,
      timestamp: new Date(),
      userAgent: req.headers.get('user-agent') || 'unknown',
    };

    await firestoreAdmin.collection('analytics_events').add(event);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
}

