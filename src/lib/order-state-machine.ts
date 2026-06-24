import type { OrderStatus } from '@/lib/types';

/**
 * Order Status State Machine
 * Enforces valid state transitions and prevents invalid status changes
 */

export const OrderStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['payment_pending', 'confirmed', 'cancelled'],
  payment_pending: ['confirmed', 'cancelled', 'pending'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: ['refund_pending'],
  refund_pending: ['refunded', 'delivered'],
  refunded: [],
  cancelled: [],
};

export function isValidStatusTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
): boolean {
  if (currentStatus === nextStatus) {
    return true; // Allow idempotent updates
  }

  const allowedTransitions = OrderStatusTransitions[currentStatus];
  return allowedTransitions?.includes(nextStatus) ?? false;
}

export function getValidNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return OrderStatusTransitions[currentStatus] ?? [];
}

export class StatusTransitionError extends Error {
  constructor(currentStatus: OrderStatus, attemptedStatus: OrderStatus) {
    super(
      `Invalid status transition: ${currentStatus} → ${attemptedStatus}. ` +
      `Valid transitions: ${OrderStatusTransitions[currentStatus].join(', ') || 'none'}`
    );
    this.name = 'StatusTransitionError';
  }
}

export function validateStatusTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
): void {
  if (!isValidStatusTransition(currentStatus, nextStatus)) {
    throw new StatusTransitionError(currentStatus, nextStatus);
  }
}
