import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { writeAuditLog } from '@/lib/audit-log';
import { z } from 'zod';

const patchSchema = z.object({
  status: z.enum(['Approved', 'Denied', 'Processing']),
  adminNotes: z.string().optional(),
  paidAt: z.string().datetime().optional(),
});

async function patchRefundHandler(
  req: AuthenticatedRequest,
  context: { params: Promise<{ refundId: string }> }
) {
  const { refundId } = await context.params;
  if (!refundId) {
    return NextResponse.json({ message: 'Refund ID is required.' }, { status: 400 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { status, adminNotes, paidAt } = parsed.data;

  const refundRef = firestoreAdmin.collection('refunds').doc(refundId);
  const refundSnap = await refundRef.get();
  if (!refundSnap.exists) {
    return NextResponse.json({ message: 'Refund not found.' }, { status: 404 });
  }

  const before = refundSnap.data();

  const update: Record<string, unknown> = {
    status,
    processedAt: new Date(),
    updatedBy: req.userProfile.uid,
  };
  if (adminNotes !== undefined) update.adminNotes = adminNotes;
  if (paidAt) update.paidAt = new Date(paidAt);

  await refundRef.update(update);

  await writeAuditLog({
    actor: req.userProfile.uid,
    role: req.userProfile.role,
    action: 'admin_refund_updated',
    resourceType: 'refund',
    resourceId: refundId,
    before: { status: before?.status },
    after: { status, adminNotes, paidAt },
  });

  // Notify the customer via Firestore notifications collection
  const customerId: string | undefined = before?.userId;
  if (customerId) {
    await firestoreAdmin.collection('notifications').add({
      userId: customerId,
      type: 'refund_status_update',
      refundId,
      status,
      message: `Your M-Pesa refund request has been ${status.toLowerCase()}.${adminNotes ? ' Note: ' + adminNotes : ''}`,
      read: false,
      createdAt: new Date(),
    });
  }

  return NextResponse.json({ message: 'Refund updated successfully.', refundId, status }, { status: 200 });
}

export const PATCH = withAuth(patchRefundHandler, 'admin');
