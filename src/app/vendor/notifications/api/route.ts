import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { authMiddleware } from '@/lib/authMiddleware';

export async function GET(req: Request) {
  try {
    const { user } = await authMiddleware(req);
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const notificationsRef = db.collection('vendors')
      .doc(user.uid)
      .collection('notifications');

    const notificationsSnapshot = await notificationsRef
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const notifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { user } = await authMiddleware(req);
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { action } = await req.json();

    if (action === 'read-all') {
      const batch = db.batch();
      const notificationsRef = db.collection('vendors')
        .doc(user.uid)
        .collection('notifications');

      const unreadNotifications = await notificationsRef
        .where('isRead', '==', false)
        .get();

      unreadNotifications.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
      });

      await batch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
