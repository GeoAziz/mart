import { describe, it, expect } from 'vitest';
import { LeadDomainService } from '@/marketplace-activity-engine/services/lead-domain-service';
import { InternalMarketplaceLocation } from '@/marketplace-activity-engine/adapters/ga4-location-adapter';

describe('T05 & T07: B2B Merchant Lead Lifecycle & Disqualification FSM', () => {
  const loc: InternalMarketplaceLocation = {
    city: 'Nairobi',
    county: 'Nairobi County'
  };

  it('T05: executes full 6-state qualification & activation path', () => {
    // 1. generate_lead
    const { lead: l1, outboxEvent: e1 } = LeadDomainService.createLeadSubmission(
      'lead_test_001',
      'actor_vnd_001',
      'Nairobi Tech Store',
      loc,
      'facebook_cpc',
      15000
    );
    expect(l1.status).toBe('submitted');
    expect(l1.version).toBe(1);
    expect(e1.eventName).toBe('generate_lead');
    expect(e1.userLocation?.city).toBe('Nairobi');

    // 2. working_lead
    const { lead: l2, outboxEvent: e2 } = LeadDomainService.markLeadUnderReview(l1, 'admin_reviewer_44');
    expect(l2.status).toBe('under_review');
    expect(l2.version).toBe(2);
    expect(e2.eventName).toBe('working_lead');

    // 3. qualify_lead
    const { lead: l3, outboxEvent: e3 } = LeadDomainService.qualifyLead(l2);
    expect(l3.status).toBe('qualified');
    expect(l3.version).toBe(3);
    expect(e3.eventName).toBe('qualify_lead');
    expect(e3.eventPayload.lead_status).toBe('verified_merchant');

    // 4. close_convert_lead (Merchant publishes 1st product catalog item)
    const { lead: l4, outboxEvent: e4 } = LeadDomainService.activateMerchant(l3, 'prod_001', 50000);
    expect(l4.status).toBe('converted');
    expect(l4.version).toBe(4);
    expect(e4.eventName).toBe('close_convert_lead');
    expect(e4.eventPayload.value).toBe(50000);
  });

  it('T07: handles disqualification with documented reasons', () => {
    const { lead: l1 } = LeadDomainService.createLeadSubmission(
      'lead_test_002',
      'actor_vnd_002',
      'Shady Goods Co',
      loc,
      'google_cpc'
    );
    const { lead: l2 } = LeadDomainService.markLeadUnderReview(l1, 'admin_reviewer_44');

    const { lead: disqualifiedLead, outboxEvent: eDisq } = LeadDomainService.disqualifyLead(
      l2,
      'failed_business_kyc'
    );

    expect(disqualifiedLead.status).toBe('disqualified');
    expect(disqualifiedLead.disqualifiedReason).toBe('failed_business_kyc');
    expect(eDisq.eventName).toBe('disqualify_lead');
    expect(eDisq.eventPayload.disqualified_lead_reason).toBe('failed_business_kyc');
  });

  it('handles unconvert_lead when merchant is dormant', () => {
    const { lead: l1 } = LeadDomainService.createLeadSubmission(
      'lead_test_003',
      'actor_vnd_003',
      'Quiet Store',
      loc,
      'direct'
    );
    const { lead: l2 } = LeadDomainService.markLeadUnderReview(l1, 'admin_reviewer_44');
    const { lead: l3 } = LeadDomainService.qualifyLead(l2);

    const { lead: unconvertedLead, outboxEvent: eUnconv } = LeadDomainService.unconvertLead(
      l3,
      'abandoned_catalog_setup'
    );

    expect(unconvertedLead.status).toBe('unconverted');
    expect(eUnconv.eventName).toBe('close_unconvert_lead');
    expect(eUnconv.eventPayload.unconvert_lead_reason).toBe('abandoned_catalog_setup');
  });

  it('prevents illegal state transitions', () => {
    const { lead: l1 } = LeadDomainService.createLeadSubmission(
      'lead_test_004',
      'actor_vnd_004',
      'Illegal Store',
      loc,
      'google_organic'
    );

    // Cannot qualify directly from submitted without review
    expect(() => LeadDomainService.qualifyLead(l1)).toThrow(/Cannot qualify lead/);
    // Cannot activate directly from submitted
    expect(() => LeadDomainService.activateMerchant(l1, 'prod_999')).toThrow(/Cannot activate merchant/);
  });
});
