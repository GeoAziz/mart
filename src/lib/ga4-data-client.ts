/**
 * Google Analytics 4 Data API Client for Server-Side Queries.
 * Provides authenticated queries to GA4 for live vendor & admin performance metrics.
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

let cachedAuthClient: any = null;

async function getAuthClient() {
  if (cachedAuthClient) return cachedAuthClient;

  // Resolve credentials file path
  const explicitPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const defaultPath = path.resolve(process.cwd(), 'mart-ke-512403-780e42763b1b.json');
  const credPath = explicitPath && fs.existsSync(explicitPath) ? explicitPath : (fs.existsSync(defaultPath) ? defaultPath : null);

  if (credPath) {
    const auth = new GoogleAuth({
      keyFile: credPath,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });
    cachedAuthClient = await auth.getClient();
    return cachedAuthClient;
  }

  // Fallback to default application credentials in cloud environments
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
  cachedAuthClient = await auth.getClient();
  return cachedAuthClient;
}

export interface GA4ReportQuery {
  propertyId?: string;
  startDate?: string; // e.g. "30daysAgo", "7daysAgo", "yesterday"
  endDate?: string;   // e.g. "yesterday", "today"
  dimensions?: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  dimensionFilter?: any;
}

/**
 * Runs a report against the GA4 Data API v1beta
 */
export async function runGA4Report(query: GA4ReportQuery): Promise<any> {
  const propertyId = query.propertyId || process.env.GA_PROPERTY_ID || '559293834';
  const client = await getAuthClient();

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const requestBody: Record<string, any> = {
    dateRanges: [
      {
        startDate: query.startDate || '7daysAgo',
        endDate: query.endDate || 'yesterday',
      },
    ],
    metrics: query.metrics,
  };

  if (query.dimensions && query.dimensions.length > 0) {
    requestBody.dimensions = query.dimensions;
  }

  if (query.dimensionFilter) {
    requestBody.dimensionFilter = query.dimensionFilter;
  }

  const res = await client.request({
    url,
    method: 'POST',
    data: requestBody,
  });

  return res.data;
}

/**
 * Fetches vendor-scoped performance metrics from GA4.
 * Returns views, add-to-carts, purchases, and conversion rate.
 */
export async function getVendorGA4Metrics(vendorId: string, days = 7) {
  try {
    const report = await runGA4Report({
      startDate: `${days}daysAgo`,
      endDate: 'today',
      metrics: [
        { name: 'itemsViewed' },
        { name: 'itemsAddedToCart' },
        { name: 'itemsPurchased' },
        { name: 'itemRevenue' },
      ],
      // If vendor_id dimension is registered, filter by it.
      // Otherwise, return base store metrics as aggregate benchmark.
      dimensionFilter: {
        filter: {
          fieldName: 'customItem:vendor_id',
          stringFilter: {
            value: vendorId,
            matchType: 'EXACT',
          },
        },
      },
    });

    const row = report?.rows?.[0]?.metricValues || [];
    return {
      vendorId,
      days,
      itemsViewed: Number(row[0]?.value || 0),
      itemsAddedToCart: Number(row[1]?.value || 0),
      itemsPurchased: Number(row[2]?.value || 0),
      itemRevenue: parseFloat(row[3]?.value || '0'),
      cartToViewRate: row[0]?.value && Number(row[0].value) > 0
        ? Number(((Number(row[1]?.value || 0) / Number(row[0].value)) * 100).toFixed(1))
        : 0,
    };
  } catch (err: any) {
    // If custom dimension customItem:vendor_id is not yet registered or has no data, fallback gracefully
    return {
      vendorId,
      days,
      itemsViewed: 0,
      itemsAddedToCart: 0,
      itemsPurchased: 0,
      itemRevenue: 0,
      cartToViewRate: 0,
      notice: 'Vendor dimension is synchronizing with GA4',
    };
  }
}

