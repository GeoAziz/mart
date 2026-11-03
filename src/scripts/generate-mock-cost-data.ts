import fs from 'fs';
import path from 'path';

export interface CostRecord {
  date: string; // YYYYMMDD
  source: string;
  medium: string;
  campaign: string;
  cost: number;
  clicks: number;
  impressions: number;
}

export const CAMPAIGN_DEFINITIONS = [
  {
    source: 'facebook',
    medium: 'cpc',
    campaign: 'nairobi_electronics_promo',
    dailyBudgetKes: 4800,
    cpcKes: 14.5,
    ctrPercent: 2.6,
  },
  {
    source: 'linkedin',
    medium: 'cpc',
    campaign: 'b2b_tech_kenya',
    dailyBudgetKes: 6000,
    cpcKes: 58.0,
    ctrPercent: 3.2,
  },
  {
    source: 'tiktok',
    medium: 'paid_social',
    campaign: 'viral_audio_gear',
    dailyBudgetKes: 3200,
    cpcKes: 6.8,
    ctrPercent: 2.1,
  },
];

/**
 * Formats a Date object into YYYYMMDD string for GA4 Cost Import.
 */
function formatDateYYYYMMDD(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Generates synthetic daily cost data for a window of past days up to today.
 */
export function generateDailyCostRecords(days = 7): CostRecord[] {
  const records: CostRecord[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const targetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = formatDateYYYYMMDD(targetDate);

    for (const camp of CAMPAIGN_DEFINITIONS) {
      // Add realistic daily fluctuation (+- 15%)
      const variance = 0.85 + Math.random() * 0.3;
      const dailySpend = Number((camp.dailyBudgetKes * variance).toFixed(2));
      const clicks = Math.round(dailySpend / camp.cpcKes);
      const impressions = Math.round(clicks / (camp.ctrPercent / 100));

      records.push({
        date: dateStr,
        source: camp.source,
        medium: camp.medium,
        campaign: camp.campaign,
        cost: dailySpend,
        clicks,
        impressions,
      });
    }
  }

  return records;
}

/**
 * Converts cost records to GA4 standard CSV format.
 */
export function convertToGA4CostCsv(records: CostRecord[]): string {
  const header = 'date,source,medium,campaign,cost,clicks,impressions';
  const rows = records.map(
    (r) => `${r.date},${r.source},${r.medium},${r.campaign},${r.cost.toFixed(2)},${r.clicks},${r.impressions}`
  );
  return [header, ...rows].join('\n');
}

/**
 * CLI Runner: Generates and outputs cost_data.csv to disk.
 */
async function main() {
  const outputDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'ga4_cost_data.csv');
  const records = generateDailyCostRecords(14); // 14 days of realistic cost history
  const csvContent = convertToGA4CostCsv(records);

  fs.writeFileSync(outputPath, csvContent, 'utf-8');

  console.log(`\n======================================================`);
  console.log(`📊 GA4 Cost Data Generator (ZilaCart Campaign Mix)`);
  console.log(`======================================================\n`);
  console.log(`✅ Successfully generated ${records.length} cost records across 14 days.`);
  console.log(`📁 File written to: ${outputPath}\n`);
  console.log(`Sample Preview:`);
  console.log(csvContent.split('\n').slice(0, 7).join('\n'));
  console.log(`...\n`);
}

if (process.argv[1] && process.argv[1].endsWith('generate-mock-cost-data.ts')) {
  main().catch(console.error);
}

