/**
 * MAE Lead Domain Service (v1.2).
 * Implements the authoritative 6-state B2B merchant lead state machine:
 * generate_lead -> working_lead -> qualify_lead -> close_convert_lead
 * or disqualify_lead / close_unconvert_lead.
 *
 * Atomically mutates domain state in Firestore and inserts the corresponding
 * AnalyticsOutboxEvent into the analytics_outbox collection.
 */

import {
  GA4LeadEventName,
  DisqualifiedLeadReason,
  UnconvertLeadReason
} from '../contracts/ga4-contracts';
import { AnalyticsOutboxEvent } from '../orchestrator/fenced-outbox';
import { GA4LocationAdapter, InternalMarketplaceLocation } from '../adapters/ga4-location-adapter';

export type LeadStatus =
  | 'submitted'
  | 'under_review'
  | 'qualified'
  | 'disqualified'
  | 'converted'
  | 'unconverted';

export interface AuthoritativeLeadRecord {
  leadId: string;
  leadType: 'vendor_onboarding' | 'wholesale_quote';
  status: LeadStatus;
  version: number;
  actorId: string;
  storeName: string;
  location: InternalMarketplaceLocation;
  leadSource: string;
  valuationKes: number;
  disqualifiedReason?: DisqualifiedLeadReason;
  unconvertedReason?: UnconvertLeadReason;
  createdAt: string;
  updatedAt: string;
}

export class LeadDomainService {
  /**
   * Step 1: Initial Merchant Application Submission (generate_lead)
   */
  public static createLeadSubmission(
    leadId: string,
    actorId: string,
    storeName: string,
    location: InternalMarketplaceLocation,
    leadSource: string,
    valuationKes = 15000
  ): { lead: AuthoritativeLeadRecord; outboxEvent: AnalyticsOutboxEvent } {
    const now = new Date().toISOString();
    const lead: AuthoritativeLeadRecord = {
      leadId,
      leadType: 'vendor_onboarding',
      status: 'submitted',
      version: 1,
      actorId,
      storeName,
      location,
      leadSource,
      valuationKes,
      createdAt: now,
      updatedAt: now
    };

    const outboxEvent: AnalyticsOutboxEvent = {
      eventId: `evt_lead_${leadId}_v1`,
      idempotencyKey: `lead:${leadId}:1:generate_lead`,
      aggregateType: 'lead',
      aggregateId: leadId,
      aggregateVersion: 1,
      eventName: 'generate_lead',
      userLocation: GA4LocationAdapter.toGA4Location(location),
      eventPayload: {
        currency: 'KES',
        value: valuationKes,
        lead_source: leadSource,
        lead_type: 'vendor_onboarding',
        is_synthetic: 1
      },
      occurredAt: now,
      createdAt: now,
      delivery: {
        status: 'pending',
        attemptCount: 0,
        fencingToken: 0
      }
    };

    return { lead, outboxEvent };
  }

  /**
   * Step 2: Compliance Review Commenced (working_lead)
   */
  public static markLeadUnderReview(
    lead: AuthoritativeLeadRecord,
    reviewerId: string
  ): { lead: AuthoritativeLeadRecord; outboxEvent: AnalyticsOutboxEvent } {
    if (lead.status !== 'submitted') {
      throw new Error(`Cannot transition lead ${lead.leadId} to under_review from status '${lead.status}'.`);
    }

    const now = new Date().toISOString();
    const nextVersion = lead.version + 1;
    const updatedLead: AuthoritativeLeadRecord = {
      ...lead,
      status: 'under_review',
      version: nextVersion,
      updatedAt: now
    };

    const outboxEvent: AnalyticsOutboxEvent = {
      eventId: `evt_lead_${lead.leadId}_v${nextVersion}`,
      idempotencyKey: `lead:${lead.leadId}:${nextVersion}:working_lead`,
      aggregateType: 'lead',
      aggregateId: lead.leadId,
      aggregateVersion: nextVersion,
      eventName: 'working_lead',
      userLocation: GA4LocationAdapter.toGA4Location(lead.location),
      eventPayload: {
        currency: 'KES',
        value: lead.valuationKes,
        is_synthetic: 1
      },
      occurredAt: now,
      createdAt: now,
      delivery: {
        status: 'pending',
        attemptCount: 0,
        fencingToken: 0
      }
    };

    return { lead: updatedLead, outboxEvent };
  }

  /**
   * Step 3A: Merchant KYC Approved & Qualified (qualify_lead)
   */
  public static qualifyLead(
    lead: AuthoritativeLeadRecord
  ): { lead: AuthoritativeLeadRecord; outboxEvent: AnalyticsOutboxEvent } {
    if (lead.status !== 'under_review') {
      throw new Error(`Cannot qualify lead ${lead.leadId} from status '${lead.status}'. Must be 'under_review'.`);
    }

    const now = new Date().toISOString();
    const nextVersion = lead.version + 1;
    const updatedLead: AuthoritativeLeadRecord = {
      ...lead,
      status: 'qualified',
      version: nextVersion,
      updatedAt: now
    };

    const outboxEvent: AnalyticsOutboxEvent = {
      eventId: `evt_lead_${lead.leadId}_v${nextVersion}`,
      idempotencyKey: `lead:${lead.leadId}:${nextVersion}:qualify_lead`,
      aggregateType: 'lead',
      aggregateId: lead.leadId,
      aggregateVersion: nextVersion,
      eventName: 'qualify_lead',
      userLocation: GA4LocationAdapter.toGA4Location(lead.location),
      eventPayload: {
        currency: 'KES',
        value: lead.valuationKes,
        lead_status: 'verified_merchant',
        is_synthetic: 1
      },
      occurredAt: now,
      createdAt: now,
      delivery: {
        status: 'pending',
        attemptCount: 0,
        fencingToken: 0
      }
    };

    return { lead: updatedLead, outboxEvent };
  }

  /**
   * Step 3B: Compliance Rejects Merchant Application (disqualify_lead)
   */
  public static disqualifyLead(
    lead: AuthoritativeLeadRecord,
    reason: DisqualifiedLeadReason
  ): { lead: AuthoritativeLeadRecord; outboxEvent: AnalyticsOutboxEvent } {
    if (lead.status !== 'under_review' && lead.status !== 'submitted') {
      throw new Error(`Cannot disqualify lead ${lead.leadId} from status '${lead.status}'.`);
    }

    const now = new Date().toISOString();
    const nextVersion = lead.version + 1;
    const updatedLead: AuthoritativeLeadRecord = {
      ...lead,
      status: 'disqualified',
      disqualifiedReason: reason,
      version: nextVersion,
      updatedAt: now
    };

    const outboxEvent: AnalyticsOutboxEvent = {
      eventId: `evt_lead_${lead.leadId}_v${nextVersion}`,
      idempotencyKey: `lead:${lead.leadId}:${nextVersion}:disqualify_lead`,
      aggregateType: 'lead',
      aggregateId: lead.leadId,
      aggregateVersion: nextVersion,
      eventName: 'disqualify_lead',
      userLocation: GA4LocationAdapter.toGA4Location(lead.location),
      eventPayload: {
        disqualified_lead_reason: reason,
        lead_source: lead.leadSource,
        is_synthetic: 1
      },
      occurredAt: now,
      createdAt: now,
      delivery: {
        status: 'pending',
        attemptCount: 0,
        fencingToken: 0
      }
    };

    return { lead: updatedLead, outboxEvent };
  }

  /**
   * Step 4A: Merchant Publishes 1st Product Catalog Item (close_convert_lead)
   */
  public static activateMerchant(
    lead: AuthoritativeLeadRecord,
    firstProductId: string,
    activatedValuationKes = 50000
  ): { lead: AuthoritativeLeadRecord; outboxEvent: AnalyticsOutboxEvent } {
    if (lead.status !== 'qualified') {
      throw new Error(`Cannot activate merchant ${lead.leadId} from status '${lead.status}'. Must be 'qualified'.`);
    }

    const now = new Date().toISOString();
    const nextVersion = lead.version + 1;
    const updatedLead: AuthoritativeLeadRecord = {
      ...lead,
      status: 'converted',
      valuationKes: activatedValuationKes,
      version: nextVersion,
      updatedAt: now
    };

    const outboxEvent: AnalyticsOutboxEvent = {
      eventId: `evt_lead_${lead.leadId}_v${nextVersion}`,
      idempotencyKey: `lead:${lead.leadId}:${nextVersion}:close_convert_lead`,
      aggregateType: 'lead',
      aggregateId: lead.leadId,
      aggregateVersion: nextVersion,
      eventName: 'close_convert_lead',
      userLocation: GA4LocationAdapter.toGA4Location(lead.location),
      eventPayload: {
        currency: 'KES',
        value: activatedValuationKes,
        is_synthetic: 1
      },
      occurredAt: now,
      createdAt: now,
      delivery: {
        status: 'pending',
        attemptCount: 0,
        fencingToken: 0
      }
    };

    return { lead: updatedLead, outboxEvent };
  }

  /**
   * Step 4B: Merchant Drops Out or Remains Dormant (close_unconvert_lead)
   */
  public static unconvertLead(
    lead: AuthoritativeLeadRecord,
    reason: UnconvertLeadReason
  ): { lead: AuthoritativeLeadRecord; outboxEvent: AnalyticsOutboxEvent } {
    if (lead.status !== 'qualified') {
      throw new Error(`Cannot unconvert merchant ${lead.leadId} from status '${lead.status}'. Must be 'qualified'.`);
    }

    const now = new Date().toISOString();
    const nextVersion = lead.version + 1;
    const updatedLead: AuthoritativeLeadRecord = {
      ...lead,
      status: 'unconverted',
      unconvertedReason: reason,
      version: nextVersion,
      updatedAt: now
    };

    const outboxEvent: AnalyticsOutboxEvent = {
      eventId: `evt_lead_${lead.leadId}_v${nextVersion}`,
      idempotencyKey: `lead:${lead.leadId}:${nextVersion}:close_unconvert_lead`,
      aggregateType: 'lead',
      aggregateId: lead.leadId,
      aggregateVersion: nextVersion,
      eventName: 'close_unconvert_lead',
      userLocation: GA4LocationAdapter.toGA4Location(lead.location),
      eventPayload: {
        unconvert_lead_reason: reason,
        is_synthetic: 1
      },
      occurredAt: now,
      createdAt: now,
      delivery: {
        status: 'pending',
        attemptCount: 0,
        fencingToken: 0
      }
    };

    return { lead: updatedLead, outboxEvent };
  }
}
