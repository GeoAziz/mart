/**
 * Full Pipeline Runner & GA4 Live Validation Script for Lead Generation (v1.2).
 * Simulates a realistic batch of Kenyan merchant onboarding leads across Nairobi, Mombasa,
 * Kisumu, Nakuru, and Eldoret.
 * 
 * Includes:
 * 1. Initial submissions (generate_lead)
 * 2. Compliance reviews (working_lead)
 * 3. Approvals (qualify_lead) -> populates 'Qualified leads' scorecard
 * 4. Realistic compliance rejections (disqualify_lead) -> populates 'Users by disqualified lead reason'
 * 5. Store activations (close_convert_lead)
 * 6. Top-level user_location geo hints
 * 7. Multi-channel UTM attribution
 * 
 * Validates with Google Debug API first, then dispatches to the live test stream G-YV6C8Q312S.
 */

import { LeadDomainService, AuthoritativeLeadRecord } from '../marketplace-activity-engine/services/lead-domain-service';
import { GA4LocationAdapter, SupportedKenyanCity } from '../marketplace-activity-engine/adapters/ga4-location-adapter';
import { generateWebClientId, GA4StreamEventPayload } from '../marketplace-activity-engine/contracts/ga4-contracts';
import { assertSecurityAuthorization } from '../marketplace-activity-engine/safety/security-manifest';

interface LeadScenario {
  leadId: string;
  actorId: string;
  storeName: string;
  city: SupportedKenyanCity;
  county: string;
  channel: string;
  source: string;
  medium: string;
  campaign: string;
  outcome: 'convert' | 'disqualify' | 'in_review';
  disqualifyReason?: 'failed_business_kyc' | 'out_of_coverage_area' | 'prohibited_catalog' | 'duplicate_store';
}

const SCENARIOS: LeadScenario[] = [
  // 1. Nairobi Qualified & Activated Merchant (Facebook Paid Social)
  {
    leadId: 'lead_nbi_01',
    actorId: 'vnd_nbi_01',
    storeName: 'Nairobi Smart Gadgets',
    city: 'Nairobi',
    county: 'Nairobi County',
    channel: 'Paid Social',
    source: 'facebook',
    medium: 'cpc',
    campaign: 'vendor_acquisition_q4',
    outcome: 'convert'
  },
  // 2. Mombasa Qualified & Activated Merchant (Google Paid Search)
  {
    leadId: 'lead_msa_01',
    actorId: 'vnd_msa_01',
    storeName: 'Coast Spices & Crafts',
    city: 'Mombasa',
    county: 'Mombasa County',
    channel: 'Paid Search',
    source: 'google',
    medium: 'cpc',
    campaign: 'sell_online_kenya',
    outcome: 'convert'
  },
  // 3. Kisumu Qualified & Activated Merchant (Organic Search)
  {
    leadId: 'lead_ksm_01',
    actorId: 'vnd_ksm_01',
    storeName: 'Lake Basin Organics',
    city: 'Kisumu',
    county: 'Kisumu County',
    channel: 'Organic Search',
    source: 'google',
    medium: 'organic',
    campaign: 'organic_discovery',
    outcome: 'convert'
  },
  // 4. Nakuru Disqualified Lead: Failed KYC (Invalid Tax PIN)
  {
    leadId: 'lead_nku_01',
    actorId: 'vnd_nku_01',
    storeName: 'Rift Valley Wholesalers',
    city: 'Nakuru',
    county: 'Nakuru County',
    channel: 'Paid Social',
    source: 'facebook',
    medium: 'cpc',
    campaign: 'vendor_acquisition_q4',
    outcome: 'disqualify',
    disqualifyReason: 'failed_business_kyc'
  },
  // 5. Eldoret Disqualified Lead: Out of Delivery Zone
  {
    leadId: 'lead_eld_01',
    actorId: 'vnd_eld_01',
    storeName: 'Highland Grains & Dairy',
    city: 'Eldoret',
    county: 'Uasin Gishu County',
    channel: 'Organic Social',
    source: 'instagram',
    medium: 'social',
    campaign: 'seller_stories',
    outcome: 'disqualify',
    disqualifyReason: 'out_of_coverage_area'
  },
  // 6. Nairobi Disqualified Lead: Prohibited Catalog Item
  {
    leadId: 'lead_nbi_02',
    actorId: 'vnd_nbi_02',
    storeName: 'Grey Market Optics',
    city: 'Nairobi',
    county: 'Nairobi County',
    channel: 'Direct',
    source: '(direct)',
    medium: '(none)',
    campaign: 'direct_portal',
    outcome: 'disqualify',
    disqualifyReason: 'prohibited_catalog'
  },
  // 7. Nairobi In-Review Merchant (Newsletter referral)
  {
    leadId: 'lead_nbi_03',
    actorId: 'vnd_nbi_03',
    storeName: 'Savanna Fashion Hub',
    city: 'Nairobi',
    county: 'Nairobi County',
    channel: 'Email',
    source: 'newsletter',
    medium: 'email',
    campaign: 'merchant_digest_nov',
    outcome: 'in_review'
  }
];

async function runLiveLeadValidation() {
  const runId = `sim_run_leads_${Date.now()}`;
  const measurementId = process.env.GA4_TEST_MEASUREMENT_ID || 'G-YV6C8Q312S';
  const apiSecret = process.env.GA4_TEST_API_SECRET;

  console.log('================================================================');
  console.log(`[MAE LEAD ENGINE v1.2] Live GA4 Validation Pipeline Initializing`);
  console.log(`Run ID:         ${runId}`);
  console.log(`Measurement ID: ${measurementId}`);
  console.log('================================================================\n');

  // 1. Safety Guard Check
  assertSecurityAuthorization(runId, measurementId, 'mart-ke-sim');
  console.log('✓ Security Authorization Manifest verified: Target is strictly mart-ke-sim / test stream.');

  if (!apiSecret) {
    throw new Error('GA4_TEST_API_SECRET missing in environment. Aborting.');
  }

  const debugEndpoint = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
  const liveEndpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;

  let totalEventsDispatched = 0;
  let totalQualifiedLeads = 0;
  let totalDisqualifiedLeads = 0;
  let totalConvertedMerchants = 0;

  for (const scenario of SCENARIOS) {
    const clientId = generateWebClientId(scenario.actorId, 1730000000);
    const userLocation = GA4LocationAdapter.toGA4Location({
      city: scenario.city,
      county: scenario.county
    });

    console.log(`\n▶ Processing Scenario: [${scenario.leadId}] - "${scenario.storeName}" (${scenario.city}, ${scenario.channel})`);

    // Step 1: Initial Application Submission (generate_lead)
    const { lead: l1, outboxEvent: e1 } = LeadDomainService.createLeadSubmission(
      scenario.leadId,
      scenario.actorId,
      scenario.storeName,
      { city: scenario.city, county: scenario.county },
      `${scenario.source}_${scenario.medium}`
    );

    const eventsToDispatch: Array<{ name: string; params: Record<string, any> }> = [
      {
        name: e1.eventName,
        params: {
          ...e1.eventPayload,
          campaign: scenario.campaign,
          source: scenario.source,
          medium: scenario.medium,
          engagement_time_msec: 1500
        }
      }
    ];

    // Step 2: Under Review (working_lead)
    const { lead: l2, outboxEvent: e2 } = LeadDomainService.markLeadUnderReview(l1, 'compliance_officer_01');
    eventsToDispatch.push({
      name: e2.eventName,
      params: {
        ...e2.eventPayload,
        engagement_time_msec: 1000
      }
    });

    if (scenario.outcome === 'convert') {
      // Step 3: Qualified (qualify_lead) -> Populates 'Qualified leads' scorecard!
      const { lead: l3, outboxEvent: e3 } = LeadDomainService.qualifyLead(l2);
      eventsToDispatch.push({
        name: e3.eventName,
        params: {
          ...e3.eventPayload,
          engagement_time_msec: 2000
        }
      });
      totalQualifiedLeads++;

      // Step 4: Activated / Catalog Listed (close_convert_lead)
      const { outboxEvent: e4 } = LeadDomainService.activateMerchant(l3, 'prod_first_001', 50000);
      eventsToDispatch.push({
        name: e4.eventName,
        params: {
          ...e4.eventPayload,
          engagement_time_msec: 3000
        }
      });
      totalConvertedMerchants++;
    } else if (scenario.outcome === 'disqualify') {
      // Step 3B: Disqualified -> Populates 'Users by disqualified lead reason' card!
      const { outboxEvent: eDisq } = LeadDomainService.disqualifyLead(l2, scenario.disqualifyReason!);
      eventsToDispatch.push({
        name: eDisq.eventName,
        params: {
          ...eDisq.eventPayload,
          engagement_time_msec: 1000
        }
      });
      totalDisqualifiedLeads++;
    }

    const payload: GA4StreamEventPayload = {
      client_id: clientId,
      user_location: userLocation,
      events: eventsToDispatch
    };

    // Pre-flight Google Debug API validation
    const debugRes = await fetch(debugEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const debugData = await debugRes.json();

    if (debugData.validationMessages && debugData.validationMessages.length > 0) {
      console.error(`  ✖ Validation failed for ${scenario.leadId}:`, debugData.validationMessages);
      throw new Error(`Google Debug API rejected payload for ${scenario.leadId}`);
    }
    console.log(`  ✓ Pre-flight Google Debug API passed: 0 validation messages.`);

    // Live Test Stream Dispatch (Measurement Protocol)
    const liveRes = await fetch(liveEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (liveRes.status === 204 || liveRes.status === 200) {
      console.log(`  ✓ Live Stream Delivery SUCCESS (HTTP ${liveRes.status}): ${eventsToDispatch.length} events ingested.`);
      totalEventsDispatched += eventsToDispatch.length;
    } else {
      console.error(`  ✖ Live stream delivery failed (HTTP ${liveRes.status})`);
    }
  }

  console.log('\n================================================================');
  console.log(`[MAE LEAD ENGINE v1.2] Live Dispatch Summary`);
  console.log(`Total Events Delivered:     ${totalEventsDispatched}`);
  console.log(`Qualified Leads Emitted:    ${totalQualifiedLeads} (Populates Qualified leads scorecard)`);
  console.log(`Disqualified Leads Emitted: ${totalDisqualifiedLeads} (Populates Users by disqualified lead reason)`);
  console.log(`Converted Merchants:        ${totalConvertedMerchants} (close_convert_lead)`);
  console.log(`Kenyan Cities Attributed:   Nairobi, Mombasa, Kisumu, Nakuru, Eldoret`);
  console.log(`Attribution Channels:       Paid Social, Paid Search, Organic Search, Organic Social, Email, Direct`);
  console.log('================================================================\n');
}

runLiveLeadValidation().catch(err => {
  console.error('Fatal error running live lead validation:', err);
  process.exit(1);
});
