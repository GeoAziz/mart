#!/usr/bin/env bash
# ==============================================================================
# ZilaCart / TechStore — Google Analytics 4 KPI Summary Digest
# Queries GA4 Data & Admin API via google-analytics-cli
#
# Metrics Definition:
# - Users: totalUsers (Active visitors over the 7-day period)
# - Sessions: sessions
# - Average Session Duration: averageSessionDuration (seconds)
# - Bounce Rate: bounceRate (Percentage of unengaged sessions)
# - Items Viewed: itemsViewed
# - Add To Carts (Events): addToCarts (Event counts)
# - Items Added: itemsAddedToCart (Unit quantities)
# - Checkouts Initiated: itemsCheckedOut
# - Purchase Revenue: purchaseRevenue (KES)
# - Transactions: ecommercePurchases (Confirmed order count)
# - Realtime: activeUsers (Last 30-minute operational metric)
# ==============================================================================

set -euo pipefail

PROPERTY_ID="${GA_PROPERTY_ID:-559293834}"
CREDENTIALS_FILE="${GOOGLE_APPLICATION_CREDENTIALS:-/home/kernelghost/Parrot-Dev/Dev/Done/mart/mart-ke-512403-780e42763b1b.json}"
OUTPUT_JSON=false

# Parse flags
for arg in "$@"; do
  case "$arg" in
    --json)
      OUTPUT_JSON=true
      shift
      ;;
    --property=*)
      PROPERTY_ID="${arg#*=}"
      shift
      ;;
    --credentials=*)
      CREDENTIALS_FILE="${arg#*=}"
      shift
      ;;
  esac
done

if [[ ! -f "$CREDENTIALS_FILE" ]]; then
  echo "Error: Credentials file not found at: $CREDENTIALS_FILE" >&2
  exit 1
fi

# Run 7-day e-commerce & traffic report
REPORT_RAW=$(google-analytics-cli report "$PROPERTY_ID" \
  --credentials "$CREDENTIALS_FILE" \
  --date-ranges 7daysAgo:yesterday \
  --metrics totalUsers,sessions,averageSessionDuration,bounceRate,itemsViewed,addToCarts,itemsAddedToCart,itemsCheckedOut,purchaseRevenue,ecommercePurchases \
  2>/dev/null || echo "{}")

# Run realtime report
REALTIME_RAW=$(google-analytics-cli realtime "$PROPERTY_ID" \
  --credentials "$CREDENTIALS_FILE" \
  --dimensions country \
  --metrics activeUsers \
  2>/dev/null || echo "{}")

if [[ "$OUTPUT_JSON" == true ]]; then
  node -e "
    const report = JSON.parse(process.argv[1]);
    const realtime = JSON.parse(process.argv[2]);
    const row = report.rows && report.rows[0] ? report.rows[0].metricValues : [];
    const getVal = (idx) => row[idx] ? row[idx].value : '0';

    const output = {
      propertyId: process.argv[3],
      period: '7daysAgo:yesterday',
      traffic: {
        totalUsers: Number(getVal(0)),
        sessions: Number(getVal(1)),
        averageSessionDurationSeconds: Number(parseFloat(getVal(2)).toFixed(1)),
        bounceRate: Number((parseFloat(getVal(3)) * 100).toFixed(1))
      },
      funnel: {
        itemsViewed: Number(getVal(4)),
        addToCartEvents: Number(getVal(5)),
        itemsAddedToCartUnits: Number(getVal(6)),
        itemsCheckedOut: Number(getVal(7))
      },
      commercial: {
        purchaseRevenue: Number(parseFloat(getVal(8)).toFixed(2)),
        transactions: Number(getVal(9))
      },
      realtime: {
        activeUsers: (realtime.rows || []).reduce((acc, r) => acc + Number(r.metricValues[0].value), 0)
      }
    };
    console.log(JSON.stringify(output, null, 2));
  " "$REPORT_RAW" "$REALTIME_RAW" "$PROPERTY_ID"
  exit 0
fi

# Terminal ANSI Digest output
echo "================================================================="
echo "   📊 ZilaCart GA4 Morning KPI Digest (Property: $PROPERTY_ID)"
echo "   Reporting Timezone: Etc/GMT+4 | Window: Last 7 Completed Days"
echo "================================================================="

node -e "
  const report = JSON.parse(process.argv[1]);
  const realtime = JSON.parse(process.argv[2]);
  const row = report.rows && report.rows[0] ? report.rows[0].metricValues : [];
  const getVal = (idx) => row[idx] ? row[idx].value : '0';

  const users = getVal(0);
  const sessions = getVal(1);
  const avgDur = parseFloat(getVal(2)).toFixed(1);
  const bounce = (parseFloat(getVal(3)) * 100).toFixed(1);
  const viewed = getVal(4);
  const atcEvents = getVal(5);
  const atcUnits = getVal(6);
  const checkouts = getVal(7);
  const revenue = parseFloat(getVal(8)).toFixed(2);
  const orders = getVal(9);
  const activeNow = (realtime.rows || []).reduce((acc, r) => acc + Number(r.metricValues[0].value), 0);

  console.log('  ⚡ REALTIME STATUS');
  console.log('     Active Users (Last 30m):   ' + activeNow);
  console.log('');
  console.log('  🌐 TRAFFIC (Last 7 Days)');
  console.log('     Total Active Users:        ' + users);
  console.log('     Sessions:                  ' + sessions);
  console.log('     Avg Session Duration:      ' + avgDur + 's');
  console.log('     Bounce Rate:               ' + bounce + '%');
  console.log('');
  console.log('  🛍️  ECOMMERCE FUNNEL');
  console.log('     Items Viewed:              ' + viewed);
  console.log('     Add to Cart (Events):      ' + atcEvents);
  console.log('     Items Added (Units):       ' + atcUnits);
  console.log('     Checkouts Initiated:       ' + checkouts);
  console.log('');
  console.log('  💰 COMMERCIAL PERFORMANCE');
  console.log('     Purchase Revenue:          KES ' + revenue);
  console.log('     Transactions (Orders):     ' + orders);
  console.log('=================================================================');
" "$REPORT_RAW" "$REALTIME_RAW"

