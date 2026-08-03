import { NextResponse } from 'next/server';
import { firestoreAdmin, firebaseAdminAuth } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { writeAuditLog } from '@/lib/audit-log';

/**
 * DELETE /api/users/me
 *
 * Right-to-erasure endpoint required by Kenya's Data Protection Act 2019.
 * Anonymises all PII fields in Firestore, revokes the Firebase auth account,
 * and purges the user's subcollections (cart, wishlist, addresses).
 */
async function deleteAccountHandler(req: AuthenticatedRequest) {
  const uid = req.userProfile.uid;

  try {
    const batch = firestoreAdmin.batch();
    const userRef = firestoreAdmin.collection('users').doc(uid);

    // Anonymise PII fields rather than deleting the document so that
    // order history and audit trails that reference the uid remain intact.
    batch.update(userRef, {
      email: `deleted-${uid}@zilacart.invalid`,
      fullName: 'Deleted User',
      phone: null,
      photoURL: null,
      status: 'deleted',
      deletedAt: new Date(),
    });

    await batch.commit();

    // Delete subcollections that contain PII
    const subcollections = ['cart', 'wishlist', 'addresses', 'ledgerEntries'];
    for (const sub of subcollections) {
      const snap = await userRef.collection(sub).limit(500).get();
      const delBatch = firestoreAdmin.batch();
      snap.docs.forEach((d) => delBatch.delete(d.ref));
      if (!snap.empty) await delBatch.commit();
    }

    await writeAuditLog({
      actor: uid,
      role: req.userProfile.role,
      action: 'account_deleted',
      resourceType: 'user',
      resourceId: uid,
      before: { email: req.userProfile.email },
      after: { status: 'deleted' },
    });

    // Revoke Firebase auth account last (so the write above can still use the token)
    if (firebaseAdminAuth) {
      await firebaseAdminAuth.deleteUser(uid);
    }

    return NextResponse.json(
      { message: 'Your account has been permanently deleted in compliance with KDPA 2019.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(`[DeleteAccount] Error for uid ${uid}:`, error);
    return NextResponse.json(
      { message: 'Failed to delete account. Please contact support.' },
      { status: 500 }
    );
  }
}

export const DELETE = withAuth(deleteAccountHandler);
