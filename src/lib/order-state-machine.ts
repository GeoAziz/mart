import type { OrderStatus, VendorOrderStatus } from '@/lib/types';

/**
 * Order Status State Machine
 * Enforces valid state transitions and prevents invalid status changes.
 *
 * Lifecycle:
 *   pending → payment_pending → confirmed → processing → shipped
 *   → out_for_delivery → delivered
 *
 * Cancellation is allowed until delivery starts. Refunds flow from any
 * fulfillment stage after the vendor has accepted the order.
 */

export const OrderStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['payment_pending', 'confirmed', 'cancelled'],
  payment_pending: ['confirmed', 'cancelled', 'pending'],
  confirmed: ['processing', 'cancelled', 'refund_pending'],
  processing: ['shipped', 'cancelled', 'refund_pending'],
  shipped: ['out_for_delivery', 'delivered', 'cancelled', 'refund_pending'],
  out_for_delivery: ['delivered', 'cancelled', 'refund_pending'],
  delivered: ['refund_pending', 'refunded', 'partially_refunded'],
  refund_pending: ['refunded', 'partially_refunded', 'delivered'],
  refunded: [],
  partially_refunded: ['refunded'],
  cancelled: [],
};

export const VendorOrderStatusTransitions: Record<VendorOrderStatus, VendorOrderStatus[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled', 'refund_pending'],
  shipped: ['out_for_delivery', 'delivered', 'cancelled', 'refund_pending'],
  out_for_delivery: ['delivered', 'cancelled', 'refund_pending'],
  delivered: ['refund_pending', 'refunded', 'partially_refunded'],
  cancelled: [],
  refund_pending: ['refunded', 'partially_refunded', 'delivered'],
  refunded: [],
  partially_refunded: ['refunded'],
};

export function isValidStatusTransition(
  currentStatus: OrderStatus | VendorOrderStatus,
  nextStatus: OrderStatus | VendorOrderStatus
): boolean {
  if (currentStatus === nextStatus) {
    return true; // Allow idempotent updates
  }

  const orderTransitions = OrderStatusTransitions[currentStatus as OrderStatus];
  if (orderTransitions?.includes(nextStatus as OrderStatus)) {
    return true;
  }

  const vendorTransitions = VendorOrderStatusTransitions[currentStatus as VendorOrderStatus];
  return vendorTransitions?.includes(nextStatus as VendorOrderStatus) ?? false;
}

export function getValidNextStatuses(currentStatus: OrderStatus | VendorOrderStatus): Array<OrderStatus | VendorOrderStatus> {
  return OrderStatusTransitions[currentStatus as OrderStatus]
    ?? VendorOrderStatusTransitions[currentStatus as VendorOrderStatus]
    ?? [];
}

export class StatusTransitionError extends Error {
  constructor(currentStatus: string, attemptedStatus: string) {
    super(
      `Invalid status transition: ${currentStatus} → ${attemptedStatus}. ` +
      `Valid transitions: ${(getValidNextStatuses(currentStatus as OrderStatus).join(', ')) || 'none'}`
    );
    this.name = 'StatusTransitionError';
  }
}

export function validateStatusTransition(
  currentStatus: OrderStatus | VendorOrderStatus,
  nextStatus: OrderStatus | VendorOrderStatus
): void {
  if (!isValidStatusTransition(currentStatus, nextStatus)) {
    throw new StatusTransitionError(currentStatus, nextStatus);
  }
}

/**
 * Derive the parent Order status from its VendorOrders.
 * - All delivered → delivered
 * - All cancelled/refunded → cancelled/refunded
 * - Mixed delivered + cancelled → partially fulfilled, keep parent at its stage
 */
export function deriveParentOrderStatus(vendorOrderStatuses: VendorOrderStatus[]): OrderStatus | null {
  if (vendorOrderStatuses.length === 0) {
    return null;
  }

  if (vendorOrderStatuses.every((s) => s === 'delivered')) {
    return 'delivered';
  }

  if (vendorOrderStatuses.every((s) => s === 'cancelled')) {
    return 'cancelled';
  }

  if (vendorOrderStatuses.every((s) => s === 'refunded')) {
    return 'refunded';
  }

  const activeStatuses = vendorOrderStatuses.filter(
    (s) => s !== 'delivered' && s !== 'cancelled' && s !== 'refunded'
  );

  if (activeStatuses.length === 0) {
    return 'partially_refunded';
  }

  // Parent reflects the most advanced active vendor stage.
  const rank: Record<string, number> = {
    pending: 0,
    processing: 1,
    shipped: 2,
    out_for_delivery: 3,
    delivered: 4,
  };
  let parent: OrderStatus = 'pending';
  for (const status of activeStatuses) {
    if ((rank[status] ?? 0) > (rank[parent] ?? 0)) {
      parent = status as OrderStatus;
    }
  }
  return parent;
}
