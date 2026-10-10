import 'dotenv/config';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { VendorOrder, VendorOrderStatus, LedgerEntry } from '@/lib/types';
import type { DocumentReference } from 'firebase-admin/firestore';

const PLATFORM_COMMISSION_RATE = 0.10;

interface LedgerEntryInput {
  vendorId: string;
  orderId: string;
  subtotal: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  items: VendorOrder['items'];
}

/**
 * Build an authoritative LedgerEntry snapshot for a given vendor order.
 *
 * Mirrors the award math used by the rest of the codebase:
 *   commissionAmount = subtotal * commissionRate
 *   netAmount        = subtotal - commissionAmount
 *
 * Writes into the canonical location the API routes, dashboard and payout
 * endpoints already read from:
 *   users/{vendorId}/ledgerEntries
 */
function buildLedgerEntry(input: LedgerEntryInput): Omit<LedgerEntry, 'id' | 'createdAt'> {
  const { vendorId, orderId, subtotal, commissionRate, commissionAmount, netAmount, items } = input;

  return {
    vendorId,
    type: 'sale_credit',
    amount: subtotal,
    commissionRate: commissionRate == null ? PLATFORM_COMMISSION_RATE : commissionRate,
    commissionAmount: commissionAmount || 0,
    netAmount,
    status: 'confirmed',
    orderId,
    description: `Sale of ${items?.reduce((sum: number, i: any) => sum + (i?.quantity || 0), 0) || 0} items`,
  };
}

interface PendingEntry {
  vendorId: string;
  orderId: string;
  entry: Omit<LedgerEntry, 'id' | 'createdAt'>;
  vendorOrderRef: DocumentReference;
}

async function reconcile() {
  // Walk every vendor order. The imported dataset stopped short of 'delivered',
  // but a vendor order can be delivered without a corresponding top-level
  // 'ledger' document (the live transaction path upserts an existing 'ledger'
  // doc instead of creating one). We therefore derive ledger entries from the
  // per-vendor 'vendorOrders' collection, which is guaranteed to exist for
  // every order the marketplace actually processed.
  const vendorOrdersSnap = await firestoreAdmin.collection('vendorOrders').get();

  const pending: PendingEntry[] = [];
  const seen = new Set<string>(); // key: `${vendorId}|${orderId}`

  for (const doc of vendorOrdersSnap.docs) {
    const data = doc.data() as VendorOrder;
    const { vendorId, orderId, subtotal, commissionRate, commissionAmount, netAmount, items, status } = data;

    const key = `${vendorId}|${orderId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Only create entries for orders that have actually been fulfilled (i.e.
    // delivered). A 'pending'/'processing' order does not yet represent a
    // realized sale from the vendor's perspective.
    if (status !== 'delivered') {
      console.log(`[skip] ${key} (status=${status ?? 'missing'})`);
      continue;
    }

    const entry = buildLedgerEntry({
      vendorId,
      orderId,
      subtotal: typeof subtotal === 'number' ? subtotal : 0,
      commissionRate: typeof commissionRate === 'number' ? commissionRate : PLATFORM_COMMISSION_RATE,
      commissionAmount: typeof commissionAmount === 'number' ? commissionAmount : 0,
      netAmount: typeof netAmount === 'number' ? netAmount : 0,
      items,
    });

    pending.push({
      vendorId,
      orderId,
      entry,
      vendorOrderRef: doc.ref,
    });
  }

  console.log(`
Found ${vendorOrdersSnap.size} vendor orders total.`);
  console.log(`Found ${pending.length} delivered vendor orders that need ledger entries.`);

  if (pending.length === 0) {
    console.log('✅ No ledger entries needed. Ledger is already consistent.');
    return;
  }

  // Batch-create entries under users/{vendorId}/ledgerEntries for all
  // pending (vendorId, orderId) pairs. A vendor may have multiple delivered
  // orders, so we build one WriteBatch per vendor to keep references valid.
  const byVendor = new Map<string, PendingEntry[]>();
  for (const p of pending) {
    if (!byVendor.has(p.vendorId)) byVendor.set(p.vendorId, []);
    byVendor.get(p.vendorId)!.push(p);
  }

  let created = 0;
  for (const [vendorId, entries] of byVendor) {
    const vendorDocRef = firestoreAdmin.collection('users').doc(vendorId);
    const batch = firestoreAdmin.batch();

    for (const { orderId, entry, vendorOrderRef } of entries) {
      const ledgerRef = vendorDocRef.collection('ledgerEntries').doc(orderId);
      batch.set(ledgerRef, { ...entry, createdAt: Timestamp.now() }, { merge: true });

      // Update the vendor order statusHistory so downstream consumers (e.g.
      // 'delivered' indicators on the vendor dashboard) see the change even
      // if the status was already set.
      batch.update(vendorOrderRef, {
        statusHistory: FieldValue.arrayUnion({
          status: 'delivered',
          timestamp: Timestamp.now(),
          note: 'Ledger backfill: ledger entry reconciled.',
          updatedBy: 'reconcile_ledger',
        }),
      });
      created++;
    }

    await batch.commit();
    console.log(`[batch] vendor ${vendorId}: ${entries.length} ledger entries`);
  }

  console.log(`\n✅ Reconcile complete. ${created} ledger entries created.`);
}

reconcile().then(() => process.exit(0)).catch((e) => {
  console.error('❌ Reconcile failed:', e);
  process.exit(1);
});
