
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Clock, Banknote, Download, BarChart3, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
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
          {trend && <p className={`text-xs ${trend.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{trend} {period || 'vs. last month'}</p>}
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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch earnings summary.');
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
      setPayouts(data.map(p => ({...p, date: new Date(p.date), requestedAt: new Date(p.requestedAt), processedAt: p.processedAt ? new Date(p.processedAt) : undefined })));
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Earnings (All Time)"
          value={formatCurrency(earningsSummary?.totalAllTimeEarnings)}
          icon={<DollarSign className="h-5 w-5 text-green-400"/>}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Current Available Balance"
          value={formatCurrency(earningsSummary?.currentBalance)}
          icon={<Clock className="h-5 w-5 text-yellow-400"/>}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Last Payout Amount"
          value={formatCurrency(earningsSummary?.lastPayoutAmount)}
          icon={<Banknote className="h-5 w-5 text-blue-400"/>}
          period={earningsSummary?.lastPayoutDate ? `on ${new Date(earningsSummary.lastPayoutDate).toLocaleDateString()}` : ''}
          isLoading={isLoadingSummary}
        />
      </div>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-glow-accent flex items-center">
            <BarChart3 className="mr-3 h-5 w-5 text-accent" /> Earnings Trend
          </CardTitle>
          <CardDescription className="text-muted-foreground">Your earnings performance over recent months.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSummary ? (
            <div className="h-[350px] flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
          ) : errorSummary ? (
             <div className="h-[350px] flex flex-col justify-center items-center text-destructive">
                <AlertCircle className="h-8 w-8 mb-2"/>
                <p>Could not load chart data: {errorSummary}</p>
            </div>
          ) : !earningsSummary || earningsSummary.earningsChartData.length === 0 ? (
            <div className="h-[350px] flex flex-col justify-center items-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mb-4"/>
                <p>No earnings data available yet to display a chart.</p>
            </div>
          ) : (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={earningsSummary.earningsChartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(value) => `KSh ${value/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: 'var(--radius)'}}
                  itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
                  formatter={(value: number) => [formatCurrency(value), "Earnings"]}
                />
                <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 12, paddingTop: '10px' }} />
                <Line type="monotone" dataKey="earnings" stroke="hsl(var(--chart-1))" strokeWidth={2} activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--card))' }} dot={{fill: 'hsl(var(--chart-1))', r:3}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-headline text-glow-accent flex items-center">
              <Banknote className="mr-3 h-5 w-5 text-accent" /> Payout History
            </CardTitle>
            <CardDescription className="text-muted-foreground"> View your past and pending payouts. </CardDescription>
          </div>
           <Button onClick={handleRequestPayout} className="bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary" disabled={isLoadingSummary || isRequestingPayout || (earningsSummary?.currentBalance || 0) <= 0}>
            {isRequestingPayout ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <DollarSign className="mr-2 h-5 w-5" />}
            {isRequestingPayout ? 'Requesting...' : 'Request Payout'}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingPayouts ? (
            <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto"/> <p className="mt-2 text-muted-foreground">Loading payout history...</p></div>
          ) : errorPayouts ? (
            <div className="text-center py-12 text-destructive"><AlertCircle className="h-8 w-8 mx-auto mb-2"/> <p>{errorPayouts}</p></div>
          ) : payouts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Requested</TableHead>
                  <TableHead>Payout Date</TableHead>
                  <TableHead className="text-right">Amount (KSh)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id} className="hover:bg-muted/50">
                    <TableCell>{new Date(payout.requestedAt).toLocaleDateString()}</TableCell>
                    <TableCell>{payout.status === 'Completed' && payout.processedAt ? new Date(payout.processedAt).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(payout.amount)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={getStatusBadgeVariant(payout.status)}>
                        {payout.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{payout.method}</TableCell>
                    <TableCell className="text-xs">{payout.transactionId || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10" onClick={() => toast({title: "Coming Soon", description: "Downloadable statements will be available soon."})}>
                        <Download className="mr-1 h-4 w-4" /> Statement
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Banknote className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">No payout history found.</p>
              <p className="text-sm text-muted-foreground">Your completed payouts will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
