import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { authMiddleware } from '@/lib/authMiddleware';

export async function PUT(req: NextRequest) {
  try {
    const userOrResponse = await authMiddleware(req, { params: {} });
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }
    // Explicitly type user to include 'uid'
    const user = userOrResponse as { uid: string };

    const notificationsRef = db.collection('vendors')
      .doc(user.uid)
      .collection('notifications');

    const batch = db.batch();
    const unreadNotifications = await notificationsRef
      .where('isRead', '==', false)
      .get();

    unreadNotifications.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
