/**
 * Opportunity-Adjusted Vendor Retention Model for MAE.
 *
 * Formulates vendor retention adjusted for incoming customer demand opportunities.
 * Evaluates SLAs and separates idle vendors from neglectful/churned vendors.
 */

export interface VendorOrderOpportunity {
  orderId: string;
  vendorId: string;
  orderType: 'express' | 'standard';
  receivedAt: string; // ISO 8601
  customerCancelledAt?: string;
  acceptedAt?: string;
  fulfilledAt?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

export interface VendorOpportunityMetrics {
  totalRegistered: number;
  withOpportunities: number; // Active Denominator (vendors who received >= 1 order)
  idleConstrained: number; // Vendors with 0 orders in window (excluded from denominator)
  fulfilledWithinSLA: number; // Numerator
  pendingSLA: number;
  neglectful: number; // Assigned order breached SLA
  churned: number; // Sustained neglect across multiple windows
  retentionRate: number; // [0, 1]
  retentionPercentage: string; // "XX.X%"
  n: number; // Denominator sample size
}

export class VendorOpportunityModel {
  // Acceptance SLAs in minutes
  static readonly ACCEPT_SLA_EXPRESS_MIN = 2 * 60; // 2 hours
  static readonly ACCEPT_SLA_STANDARD_MIN = 12 * 60; // 12 hours

  // Fulfillment SLAs in minutes
  static readonly FULFILL_SLA_EXPRESS_MIN = 12 * 60; // 12 hours
  static readonly FULFILL_SLA_STANDARD_MIN = 48 * 60; // 48 hours

  /**
   * Evaluates vendor opportunities in a given window.
   */
  static evaluateWindow(params: {
    registeredVendorIds: string[];
    opportunities: VendorOrderOpportunity[];
    evaluationTimestamp?: string;
    priorNeglectVendorIds?: string[];
  }): VendorOpportunityMetrics {
    const {
      registeredVendorIds,
      opportunities,
      evaluationTimestamp = new Date().toISOString(),
      priorNeglectVendorIds = [],
    } = params;

    const evalTimeMs = new Date(evaluationTimestamp).getTime();

    // Map opportunities per vendor
    const vendorOrdersMap = new Map<string, VendorOrderOpportunity[]>();
    for (const opp of opportunities) {
      if (!vendorOrdersMap.has(opp.vendorId)) {
        vendorOrdersMap.set(opp.vendorId, []);
      }
      vendorOrdersMap.get(opp.vendorId)!.push(opp);
    }

    let withOpportunitiesCount = 0;
    let fulfilledWithinSLACount = 0;
    let idleConstrainedCount = 0;
    let pendingSLACount = 0;
    let neglectfulCount = 0;
    let churnedCount = 0;

    for (const vendorId of registeredVendorIds) {
      const orders = vendorOrdersMap.get(vendorId);

      // Case 1: Idle vendor (0 opportunities in window)
      if (!orders || orders.length === 0) {
        idleConstrainedCount++;
        continue;
      }

      withOpportunitiesCount++;

      // Filter out customer cancellations that occurred before SLA expired
      const validOrders = orders.filter((o) => {
        if (o.status === 'cancelled' && o.customerCancelledAt) {
          const receivedMs = new Date(o.receivedAt).getTime();
          const cancelMs = new Date(o.customerCancelledAt).getTime();
          const maxAcceptSlaMs =
            (o.orderType === 'express'
              ? VendorOpportunityModel.ACCEPT_SLA_EXPRESS_MIN
              : VendorOpportunityModel.ACCEPT_SLA_STANDARD_MIN) *
            60 *
            1000;

          if (cancelMs - receivedMs <= maxAcceptSlaMs) {
            // Customer cancelled before vendor SLA expired -> not a vendor fault
            return false;
          }
        }
        return true;
      });

      if (validOrders.length === 0) {
        // All orders were prematurely cancelled by customers -> treat as idle for SLA evaluation
        withOpportunitiesCount--;
        idleConstrainedCount++;
        continue;
      }

      // Check SLA performance across valid orders
      let hasBreachedSLA = false;
      let hasPendingSLA = false;
      let hasFulfilledWithinSLA = false;

      for (const order of validOrders) {
        const receivedMs = new Date(order.receivedAt).getTime();
        const acceptSlaMs =
          (order.orderType === 'express'
            ? VendorOpportunityModel.ACCEPT_SLA_EXPRESS_MIN
            : VendorOpportunityModel.ACCEPT_SLA_STANDARD_MIN) *
          60 *
          1000;
        const fulfillSlaMs =
          (order.orderType === 'express'
            ? VendorOpportunityModel.FULFILL_SLA_EXPRESS_MIN
            : VendorOpportunityModel.FULFILL_SLA_STANDARD_MIN) *
          60 *
          1000;

        // Check Acceptance SLA
        if (order.acceptedAt) {
          const acceptedMs = new Date(order.acceptedAt).getTime();
          if (acceptedMs - receivedMs > acceptSlaMs) {
            hasBreachedSLA = true;
          }
        } else if (order.status === 'pending') {
          if (evalTimeMs - receivedMs > acceptSlaMs) {
            hasBreachedSLA = true;
          } else {
            hasPendingSLA = true;
          }
        }

        // Check Fulfillment SLA
        if (order.fulfilledAt) {
          const fulfilledMs = new Date(order.fulfilledAt).getTime();
          if (fulfilledMs - receivedMs <= fulfillSlaMs && !hasBreachedSLA) {
            hasFulfilledWithinSLA = true;
          } else {
            hasBreachedSLA = true;
          }
        } else if (order.status === 'processing' || order.status === 'shipped') {
          if (evalTimeMs - receivedMs > fulfillSlaMs) {
            hasBreachedSLA = true;
          } else {
            hasPendingSLA = true;
          }
        }
      }

      if (hasBreachedSLA) {
        neglectfulCount++;
        if (priorNeglectVendorIds.includes(vendorId)) {
          churnedCount++;
        }
      } else if (hasPendingSLA) {
        pendingSLACount++;
      } else if (hasFulfilledWithinSLA) {
        fulfilledWithinSLACount++;
      }
    }

    const retentionRate =
      withOpportunitiesCount > 0 ? fulfilledWithinSLACount / withOpportunitiesCount : 0;
    const retentionPercentage = `${(retentionRate * 100).toFixed(1)}%`;

    return {
      totalRegistered: registeredVendorIds.length,
      withOpportunities: withOpportunitiesCount,
      idleConstrained: idleConstrainedCount,
      fulfilledWithinSLA: fulfilledWithinSLACount,
      pendingSLA: pendingSLACount,
      neglectful: neglectfulCount,
      churned: churnedCount,
      retentionRate: Number(retentionRate.toFixed(4)),
      retentionPercentage,
      n: withOpportunitiesCount,
    };
  }
}
