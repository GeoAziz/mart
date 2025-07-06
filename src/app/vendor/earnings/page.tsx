'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Clock, Banknote, Download, BarChart3, TrendingUp, Loader2, AlertCircle, Wallet, Receipt, CreditCard, Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, BarChart, Bar } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { Payout } from '@/app/api/vendors/me/payouts/route'; // Import Payout type

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

const StatCard = ({ title, value, icon, trend, period, isLoading }: { title: string; value: string; icon: React.ReactNode; trend?: string; period?: string, isLoading?: boolean }) => (
  <Card className="bg-card border-border shadow-lg hover:shadow-primary/20 transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-primary mt-1" />
      ) : (
        <>
          <div className="text-2xl font-bold text-glow-primary">{value}</div>
          {trend && (
            <p className="text-xs text-muted-foreground mt-1">
              {trend} {period && <span className="text-muted-foreground/50">· {period}</span>}
            </p>
          )}
        </>
      )}
    </CardContent>
  </Card>
);

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-500/20 text-green-300 border-green-400';
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-400';
    case 'failed':
      return 'bg-red-500/20 text-red-300 border-red-400';
    default:
      return 'bg-muted/50 text-muted-foreground border-border';
  }
};

export default function VendorEarningsPage() {
  const [earningsSummary, setEarningsSummary] = useState<EarningsSummary | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(true);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);
  const [errorPayouts, setErrorPayouts] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const fetchEarningsSummary = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingSummary(true);
    setErrorSummary(null);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/vendors/me/earnings-summary', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch earnings summary');
      }
      const data: EarningsSummary = await response.json();
      setEarningsSummary(data);
    } catch (error) {
      console.error("Error fetching earnings summary:", error);
      setErrorSummary(error instanceof Error ? error.message : "Could not load earnings summary.");
      toast({ title: 'Error', description: error instanceof Error ? error.message : "Could not load earnings summary.", variant: "destructive" });
    } finally {
      setIsLoadingSummary(false);
    }
  }, [currentUser, toast]);

  const fetchPayouts = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingPayouts(true);
    setErrorPayouts(null);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/vendors/me/payouts', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch payout history.');
      }
      const data: Payout[] = await response.json();
      setPayouts(data);
    } catch (error) {
      console.error("Error fetching payouts:", error);
      setErrorPayouts(error instanceof Error ? error.message : "Could not load payout history.");
      toast({ title: 'Error', description: error instanceof Error ? error.message : "Could not load payout history.", variant: "destructive" });
    } finally {
      setIsLoadingPayouts(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchEarningsSummary();
    fetchPayouts();
  }, [fetchEarningsSummary, fetchPayouts]);

  const handleRequestPayout = async () => {
    if (!currentUser || !earningsSummary || earningsSummary.currentBalance <= 0) {
        toast({ title: "Cannot Request Payout", description: "Current balance is zero or not available.", variant: "destructive"});
        return;
    }
    setIsRequestingPayout(true);
    try {
        const token = await currentUser.getIdToken();
        // For now, assume M-Pesa is the default method. In a real app, vendor would select.
        const payload = { 
            amount: earningsSummary.currentBalance,
            method: "M-Pesa" // Default method for now
        };
        const response = await fetch('/api/vendors/me/payouts', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to submit payout request.");
        toast({ title: "Payout Request Submitted", description: data.message });
        fetchEarningsSummary(); 
        fetchPayouts(); 
    } catch(error) {
        toast({ title: "Request Error", description: error instanceof Error ? error.message : "Could not submit request.", variant: "destructive" });
    } finally {
        setIsRequestingPayout(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    return `KSh ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Earnings"
          value={formatCurrency(earningsSummary?.totalAllTimeEarnings)}
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          isLoading={isLoadingSummary}
        />
        <StatCard 
          title="Current Balance"
          value={formatCurrency(earningsSummary?.currentBalance)}
          icon={<Wallet className="h-4 w-4 text-primary" />}
          isLoading={isLoadingSummary}
        />
        <StatCard 
          title="Last Payout"
          value={formatCurrency(earningsSummary?.lastPayoutAmount)}
          icon={<CreditCard className="h-4 w-4 text-primary" />}
          period={earningsSummary?.lastPayoutDate ? new Date(earningsSummary.lastPayoutDate).toLocaleDateString() : 'No payouts yet'}
          isLoading={isLoadingSummary}
        />
        <Card className="bg-card border-border shadow-lg hover:shadow-primary/20 transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Request Payout</CardTitle>
            <Button
              onClick={handleRequestPayout}
              disabled={isRequestingPayout || !earningsSummary?.currentBalance || earningsSummary.currentBalance <= 0}
              className="w-full"
            >
              {isRequestingPayout ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Request Payout
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {earningsSummary?.currentBalance && earningsSummary.currentBalance > 0
                ? 'Click to request a payout of your current balance'
                : 'No balance available for payout'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Chart */}
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle>Monthly Earnings</CardTitle>
          <CardDescription>Your earnings over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSummary ? (
            <div className="flex justify-center items-center h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : earningsSummary?.earningsChartData ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={earningsSummary.earningsChartData}>
                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `KSh${value}`} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#e5e7eb' }}
                  formatter={(value: number) => [`KSh${value.toLocaleString()}`, 'Earnings']}
                />
                <Bar dataKey="earnings" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center h-[300px] text-muted-foreground">
              No earnings data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payouts Table */}
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle>Recent Payouts</CardTitle>
          <CardDescription>History of your payout requests</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPayouts ? (
            <div className="flex justify-center items-center h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : payouts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map(payout => (
                  <TableRow key={payout.id}>
                    <TableCell>{new Date(payout.date).toLocaleDateString()}</TableCell>
                    <TableCell>KSh {payout.amount.toLocaleString()}</TableCell>
                    <TableCell>{payout.method}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeVariant(payout.status)}>
                        {payout.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No payout history available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
