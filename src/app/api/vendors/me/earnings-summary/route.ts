
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { LedgerEntry, Payout } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

interface EarningsChartDataPoint {
  month: string;
  earnings: number;
}

interface EarningsSummary {
  totalAllTimeEarnings: number;
  currentBalance: number;
  lastPayoutAmount: number | null;
  lastPayoutDate: string | null;
  earningsChartData: EarningsChartDataPoint[];
}

function safeParseDate(value: any): Date | undefined {
    if (value instanceof Timestamp) return value.toDate();
    if (value) {
        const d = new Date(value as string | number | Date);
        if (!isNaN(d.getTime())) return d;
    }
    return undefined;
}

async function getVendorEarningsSummaryHandler(req: AuthenticatedRequest) {
  const vendorId = req.userProfile.uid;

  try {
    const ledgerSnapshot = await firestoreAdmin.collection('users').doc(vendorId).collection('ledgerEntries').get();
    const ledgerEntries = ledgerSnapshot.docs.map(doc => doc.data() as LedgerEntry);

    let totalAllTimeEarnings = 0;
    let currentBalance = 0;
    const monthlyEarnings: { [key: string]: number } = {};

    for (const entry of ledgerEntries) {
        currentBalance += entry.netAmount;
        if (entry.type === 'sale_credit') {
            totalAllTimeEarnings += entry.netAmount; // Net earnings after commission
            
            const entryDate = safeParseDate(entry.createdAt);
            if (entryDate) {
                const monthYear = entryDate.toLocaleString('default', { month: 'short', year: '2-digit' });
                if (!monthlyEarnings[monthYear]) {
                    monthlyEarnings[monthYear] = 0;
                }
                monthlyEarnings[monthYear] += entry.netAmount;
            }
        }
    }

    const payoutsSnapshot = await firestoreAdmin.collection('payouts')
                                  .where('vendorId', '==', vendorId)
                                  .where('status', '==', 'Completed')
                                  .orderBy('processedAt', 'desc')
                                  .limit(1)
                                  .get();
    
    let lastPayoutAmount: number | null = null;
    let lastPayoutDate: string | null = null;

    if (!payoutsSnapshot.empty) {
      const lastPayoutData = payoutsSnapshot.docs[0].data() as Payout;
      lastPayoutAmount = lastPayoutData.amount;
      const processedDate = safeParseDate(lastPayoutData.processedAt);
      if (processedDate) {
          lastPayoutDate = processedDate.toISOString().split('T')[0];
      }
    }
    
    const earningsChartData: EarningsChartDataPoint[] = Object.entries(monthlyEarnings)
      .map(([month, earnings]) => ({ month, earnings }))
      .sort((a,b) => {
          const [aMonthStr, aYearNumStr] = a.month.split(' ');
          const [bMonthStr, bYearNumStr] = b.month.split(' ');
          const currentCentury = Math.floor(new Date().getFullYear() / 100) * 100;
          const dateA = new Date(`${aMonthStr} 1, ${parseInt(aYearNumStr) < 100 ? currentCentury + parseInt(aYearNumStr) : parseInt(aYearNumStr)}`);
          const dateB = new Date(`${bMonthStr} 1, ${parseInt(bYearNumStr) < 100 ? currentCentury + parseInt(bYearNumStr) : parseInt(bYearNumStr)}`);
          return dateA.getTime() - dateB.getTime();
      })
      .slice(-6); 

    const summary: EarningsSummary = {
      totalAllTimeEarnings,
      currentBalance,
      lastPayoutAmount,
      lastPayoutDate,
      earningsChartData,
    };

    return NextResponse.json(summary, { status: 200 });

  } catch (error: any) {
    console.error(`Error fetching earnings summary for vendor ${vendorId}:`, error);
    return NextResponse.json({ message: 'Internal Server Error while fetching earnings summary.' }, { status: 500 });
  }
}

export const GET = withAuth(getVendorEarningsSummaryHandler, ['vendor', 'admin']);
