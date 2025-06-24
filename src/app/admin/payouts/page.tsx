
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, CheckCircle, XCircle, Clock, Filter, DollarSign, Loader2, MessageSquare, Edit3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Payout } from '@/app/api/vendors/me/payouts/route'; // Assuming this type is suitable

type PayoutWithVendorInfo = Payout & { vendorName?: string };

const getStatusBadgeVariant = (status: Payout['status']) => {
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

const getStatusIcon = (status: Payout['status']) => {
  switch (status.toLowerCase()) {
    case 'completed': return <CheckCircle className="h-4 w-4 text-green-400" />;
    case 'pending': return <Clock className="h-4 w-4 text-yellow-400" />;
    case 'failed': return <XCircle className="h-4 w-4 text-red-400" />;
    default: return null;
  }
};

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutWithVendorInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});
  
  const [processingPayout, setProcessingPayout] = useState<PayoutWithVendorInfo | null>(null);
  const [isProcessDialogValid, setIsProcessDialogValid] = useState(false);
  const [processAction, setProcessAction] = useState<'Completed' | 'Failed' | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();

  const fetchPayouts = useCallback(async () => {
    if (!currentUser || userProfile?.role !== 'admin') {
      setIsLoading(false);
      // toast({ title: "Unauthorized", description: "You do not have permission to view payouts.", variant: "destructive"});
      return;
    }
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/payouts', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch payout requests.');
      }
      let data: Payout[] = await response.json();
      
      // Enrich with vendor names (placeholder for now, ideally batch fetch)
      const enrichedData: PayoutWithVendorInfo[] = await Promise.all(data.map(async (payout) => {
        try {
            const userResponse = await fetch(`/api/users/${payout.vendorId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (userResponse.ok) {
                const vendorData = await userResponse.json();
                return { ...payout, vendorName: vendorData.fullName || payout.vendorId.substring(0,8)+'...' };
            }
            return { ...payout, vendorName: payout.vendorId.substring(0,8)+'...' };
        } catch {
             return { ...payout, vendorName: payout.vendorId.substring(0,8)+'...' };
        }
      }));

      setPayouts(enrichedData.map(p => ({
        ...p,
        date: new Date(p.date),
        requestedAt: new Date(p.requestedAt),
        processedAt: p.processedAt ? new Date(p.processedAt) : undefined,
      })));
    } catch (error) {
      console.error('Error fetching payouts:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Could not load payout requests.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, userProfile, toast]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);
  
  useEffect(() => {
    if (processAction === 'Completed') {
      setIsProcessDialogValid(!!transactionId.trim());
    } else if (processAction === 'Failed') {
      setIsProcessDialogValid(!!adminNotes.trim());
    } else {
      setIsProcessDialogValid(false);
    }
  }, [transactionId, adminNotes, processAction]);

  const openProcessDialog = (payout: PayoutWithVendorInfo, action: 'Completed' | 'Failed') => {
    setProcessingPayout(payout);
    setProcessAction(action);
    setTransactionId(payout.transactionId || '');
    setAdminNotes(payout.adminNotes || '');
  };

  const handleProcessPayout = async () => {
    if (!currentUser || !processingPayout || !processAction) return;
    
    const payload: any = { status: processAction };
    if (processAction === 'Completed') {
      if (!transactionId.trim()) {
        toast({ title: 'Validation Error', description: 'Transaction ID is required for completed payouts.', variant: 'destructive' });
        return;
      }
      payload.transactionId = transactionId.trim();
    }
     if (adminNotes.trim()) { // Always include notes if provided
        payload.adminNotes = adminNotes.trim();
    } else if (processAction === 'Failed' && !adminNotes.trim()) {
        toast({ title: 'Validation Error', description: 'Admin notes are required for failed payouts.', variant: 'destructive' });
        return;
    }


    setActionLoading(prev => ({...prev, [processingPayout.id]: true}));
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/payouts/${processingPayout.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to mark payout as ${processAction.toLowerCase()}.`);
      }
      toast({ title: 'Success', description: `Payout ${processingPayout.id.substring(0,7)}... marked as ${processAction.toLowerCase()}.` });
      setProcessingPayout(null);
      setProcessAction(null);
      setTransactionId('');
      setAdminNotes('');
      fetchPayouts(); 
    } catch (error) {
      console.error(`Error processing payout ${processingPayout.id}:`, error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Could not process payout.', variant: 'destructive' });
    } finally {
      setActionLoading(prev => ({...prev, [processingPayout.id]: false}));
    }
  };

  if (isLoading && payouts.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading payout requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Dialog open={!!processingPayout} onOpenChange={(isOpen) => { if (!isOpen) { setProcessingPayout(null); setProcessAction(null); setTransactionId(''); setAdminNotes(''); } }}>
        <DialogContent className="sm:max-w-md bg-card border-primary shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-glow-accent">Process Payout: {processingPayout?.id.substring(0,7)}...</DialogTitle>
            <DialogDescription>
              Mark this payout as {processAction?.toLowerCase()} for vendor <span className="font-semibold text-primary">{processingPayout?.vendorName}</span> amounting to <span className="font-semibold text-primary">KSh {processingPayout?.amount.toLocaleString()}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {processAction === 'Completed' && (
              <div className="space-y-1">
                <Label htmlFor="transactionId">Transaction ID <span className="text-destructive">*</span></Label>
                <Input id="transactionId" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="bg-input border-primary focus:ring-accent" placeholder="e.g., MPESA_TXN_123" />
              </div>
            )}
            <div className="space-y-1">
                <Label htmlFor="adminNotes">Admin Notes {processAction === 'Failed' && <span className="text-destructive">*</span>}</Label>
                <Textarea id="adminNotes" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="bg-input border-primary focus:ring-accent" placeholder="Optional notes for completed, required for failed." rows={3}/>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <DialogClose asChild><Button type="button" variant="ghost" disabled={actionLoading[processingPayout?.id || '']}>Cancel</Button></DialogClose>
            <Button onClick={handleProcessPayout} className={`${processAction === 'Completed' ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'} text-white`} disabled={actionLoading[processingPayout?.id || ''] || !isProcessDialogValid}>
              {actionLoading[processingPayout?.id || ''] ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (processAction === 'Completed' ? <CheckCircle className="mr-2 h-4 w-4"/> : <XCircle className="mr-2 h-4 w-4"/>)}
              Mark as {processAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
                    <DollarSign className="mr-3 h-6 w-6 text-primary" /> Vendor Payout Requests
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    Review and process pending payout requests from vendors.
                </CardDescription>
            </div>
            <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              <Filter className="mr-2 h-4 w-4" /> Filter Requests
            </Button>
        </CardHeader>
        <CardContent>
          {payouts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Request ID</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date Requested</TableHead>
                  <TableHead className="text-right">Amount (KSh)</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-xs">
                        {payout.id.substring(0, 7)}...
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/users?userId=${payout.vendorId}`} className="hover:text-primary hover:underline text-sm" title={`View vendor ${payout.vendorName}`}>
                        {payout.vendorName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(payout.requestedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-semibold">{payout.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-sm">{payout.method}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`flex items-center justify-center gap-1.5 text-xs ${getStatusBadgeVariant(payout.status)}`}>
                        {getStatusIcon(payout.status)}
                        {payout.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{payout.transactionId || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      {actionLoading[payout.id] ? <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /> : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Payout Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-primary shadow-lg">
                           {payout.status === 'Pending' && (
                            <>
                                <DropdownMenuItem onClick={() => openProcessDialog(payout, 'Completed')} className="text-green-400 hover:bg-green-500/10 hover:!text-green-300 focus:bg-green-500/20 focus:!text-green-300 cursor-pointer">
                                    <CheckCircle className="mr-2 h-4 w-4" /> Mark as Completed
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openProcessDialog(payout, 'Failed')} className="text-destructive hover:bg-destructive/10 hover:!text-destructive focus:bg-destructive/20 focus:!text-destructive cursor-pointer">
                                    <XCircle className="mr-2 h-4 w-4" /> Mark as Failed
                                </DropdownMenuItem>
                            </>
                           )}
                           {(payout.status === 'Completed' || payout.status === 'Failed') && (
                                <DropdownMenuItem onClick={() => openProcessDialog(payout, payout.status)} className="hover:bg-primary/10 hover:text-primary cursor-pointer">
                                    <Edit3 className="mr-2 h-4 w-4" /> View/Edit Notes
                                </DropdownMenuItem>
                           )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild className="hover:bg-primary/10 hover:text-primary cursor-pointer">
                            <Link href={`/admin/users?userId=${payout.vendorId}`} target="_blank">
                                <MessageSquare className="mr-2 h-4 w-4" /> View Vendor Profile
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">No payout requests found.</p>
              <p className="text-sm text-muted-foreground">There are currently no pending or processed payout requests.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

