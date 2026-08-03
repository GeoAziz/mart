import { firestoreAdmin } from '@/lib/firebase-admin';
import type { Role } from '@/lib/types';

export interface AuditLogEntry {
  actor: string;       // UID of the user who triggered the action
  role: Role;
  action: string;      // e.g. 'refund_processed', 'payout_approved', 'order_status_changed'
  resourceType: string; // e.g. 'order', 'refund', 'payout'
  resourceId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  timestamp: Date;
}

/**
 * Persist an audit log entry to the `audit_log` Firestore collection.
 * Errors are swallowed so they never break the calling financial transaction,
 * but are logged to stderr for alerting.
 */
export async function writeAuditLog(
  entry: Omit<AuditLogEntry, 'timestamp'>,
): Promise<void> {
  try {
    await firestoreAdmin.collection('audit_log').add({
      ...entry,
      timestamp: new Date(),
    } satisfies AuditLogEntry);
  } catch (err) {
    console.error('[AuditLog] Failed to write audit entry:', entry.action, entry.resourceId, err);
  }
}
