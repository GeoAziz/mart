import { NextRequest, NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { eventType, eventData, sessionId, userId } = data;

    if (!eventType) {
      return NextResponse.json({ error: 'Missing eventType' }, { status: 400 });
    }

    const event = {
      eventType,
      eventData: eventData || {},
      sessionId: sessionId || 'anonymous',
      userId: userId || null,
      timestamp: new Date(),
      userAgent: req.headers.get('user-agent') || 'unknown',
    };

    await firestoreAdmin.collection('analytics_events').add(event);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
}

