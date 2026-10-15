import type { OrderItem, ShippingAddress, VendorOrder } from '@/lib/types';

export const PLATFORM_COMMISSION_RATE = 0.10;

export interface VendorOrderInput {
  vendorId: string;
  vendorName?: string;
  items: OrderItem[];
}

export interface VendorSplitContext {
  orderId?: string; // Parent order id (injected after the parent is created)
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  shippingAddress: ShippingAddress;
  subtotal: number; // Order subtotal before discount
  discountAmount: number; // Order-level discount
  taxRate: number; // e.g. 0.16
  shippingCost: number; // Order-level shipping cost
  estimatedDeliveryDate?: Date;
}

export type VendorOrderDraft = Omit<VendorOrder, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Group order items by their vendor.
 */
export function groupItemsByVendor(items: OrderItem[]): Map<string, OrderItem[]> {
  const groups = new Map<string, OrderItem[]>();
  for (const item of items) {
    const vendorId = item.vendorId;
    if (!vendorId) continue;
    const group = groups.get(vendorId) ?? [];
    group.push(item);
    groups.set(vendorId, group);
  }
  return groups;
}

/**
 * Split a parent order into per-vendor order drafts.
 *
 * Discount and shipping are allocated proportionally to each vendor's subtotal
 * share. Commission is levied on the vendor's gross subtotal, matching the
 * existing ledger convention. Total order amounts always reconcile:
 *   sum(vendorSubtotal) = order.subtotal
 *   sum(vendorDiscount) = order.discountAmount
 *   sum(vendorShipping) = order.shippingCost
 */
export function computeVendorOrderSplits(
  inputs: VendorOrderInput[],
  ctx: VendorSplitContext
): VendorOrderDraft[] {
  if (inputs.length === 0 || ctx.subtotal <= 0) {
    return [];
  }

  const timestamp = new Date();

  return inputs.map((input) => {
    const vendorSubtotal = input.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const share = vendorSubtotal / ctx.subtotal;
    const vendorDiscount = round2(ctx.discountAmount * share);
    const vendorTaxable = vendorSubtotal - vendorDiscount;
    const vendorTax = round2(vendorTaxable * ctx.taxRate);
    const vendorShipping = round2(ctx.shippingCost * share);
    const vendorTotal = round2(vendorSubtotal - vendorDiscount + vendorTax + vendorShipping);
    const commissionAmount = round2(vendorSubtotal * PLATFORM_COMMISSION_RATE);
    const netAmount = round2(vendorTotal - commissionAmount);

    return {
      orderId: ctx.orderId ?? '',
      vendorId: input.vendorId,
      vendorName: input.vendorName || 'Vendor',
      customerId: ctx.customerId,
      customerName: ctx.customerName || 'Customer',
      customerEmail: ctx.customerEmail || '',
      items: input.items,
      status: 'pending',
      statusHistory: [
        {
          status: 'pending',
          timestamp,
          note: 'Vendor order created',
        },
      ],
      shippingAddress: ctx.shippingAddress,
      subtotal: vendorSubtotal,
      discountAmount: vendorDiscount,
      taxAmount: vendorTax,
      shippingCost: vendorShipping,
      totalAmount: vendorTotal,
      commissionRate: PLATFORM_COMMISSION_RATE,
      commissionAmount,
      netAmount,
      estimatedDeliveryDate: ctx.estimatedDeliveryDate,
    };
  });
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
