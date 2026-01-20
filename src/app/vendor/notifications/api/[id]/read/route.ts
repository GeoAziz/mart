import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { withAuth } from '@/lib/authMiddleware';
import type { AuthenticatedRequest } from '@/lib/authMiddleware';

export const PUT = withAuth(
  async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const notificationId = (await params).id;
      const notificationRef = db
        .collection('vendors')
        .doc(req.userProfile.uid)
        .collection('notifications')
        .doc(notificationId);

      await notificationRef.update({
        isRead: true,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
);
