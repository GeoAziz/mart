
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Eye, MoreHorizontal, Filter, CheckCircle, XCircle, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { RefundRequest as RefundRequestType } from '@/app/api/refunds/route';

type RefundStatus = RefundRequestType['status'];

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return 'bg-green-500/20 text-green-300 border-green-400';
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-400';
    case 'denied':
    case 'rejected': 
      return 'bg-red-500/20 text-red-300 border-red-400';
    case 'processing':
      return 'bg-blue-500/20 text-blue-300 border-blue-400';
    default:
      return 'bg-muted/50 text-muted-foreground border-border';
  }
};

const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'pending':
        return <RotateCcw className="h-4 w-4 text-yellow-400" />;
      case 'denied':
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
      default:
        return null;
    }
}

export default function RefundManagementPage() {
  const [refundRequests, setRefundRequests] = useState<RefundRequestType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const fetchRefunds = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      toast({ title: "Authentication Error", description: "Please log in to manage refunds.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/refunds', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch refund requests.');
      }
      const data: RefundRequestType[] = await response.json();
      setRefundRequests(data.map(r => ({ ...r, requestedAt: new Date(r.requestedAt), processedAt: r.processedAt ? new Date(r.processedAt) : undefined })));
    } catch (error) {
      console.error('Error fetching refunds:', error);
      toast({ title: 'Error Fetching Refunds', description: error instanceof Error ? error.message : 'Could not load refund requests.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const handleUpdateRefundStatus = async (refundId: string, newStatus: RefundStatus, adminNotes?: string, transactionId?: string) => {
    if (!currentUser) {
      toast({ title: "Not Authenticated", description: "Please log in to manage refunds.", variant: "destructive"});
      return;
    }
    setActionLoading(prev => ({ ...prev, [refundId]: true }));
    
    try {
      const token = await currentUser.getIdToken();
      const payload: any = { status: newStatus };
      if (adminNotes) payload.adminNotes = adminNotes;
      if (transactionId && newStatus === 'Approved') payload.transactionId = transactionId;

      const response = await fetch(`/api/refunds/${refundId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update refund status');
      }
      const updatedRefund: RefundRequestType = await response.json();
      setRefundRequests(prevRequests =>
        prevRequests.map(r => (r.id === refundId ? { ...updatedRefund, requestedAt: new Date(updatedRefund.requestedAt), processedAt: updatedRefund.processedAt ? new Date(updatedRefund.processedAt) : undefined } : r))
      );
      toast({ title: `Refund ${newStatus}`, description: `Refund ID ${refundId.substring(0,7)}... has been ${newStatus.toLowerCase()}.` });
    } catch (error) {
        console.error(`Error updating refund ${refundId}:`, error);
        toast({ title: 'Update Error', description: error instanceof Error ? error.message : `Could not update refund to ${newStatus}.`, variant: 'destructive'});
    } finally {
      setActionLoading(prev => ({ ...prev, [refundId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading refund requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
                <Shield className="mr-3 h-6 w-6 text-primary" /> Refund Management
            </CardTitle>
            <CardDescription className="text-muted-foreground">Review and process customer refund requests.</CardDescription>
          </div>
          <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
            <Filter className="mr-2 h-4 w-4" /> Filter Requests
          </Button>
        </CardHeader>
        <CardContent>
          {refundRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Refund ID</TableHead>
                  <TableHead className="w-[120px]">Order ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date Requested</TableHead>
                  <TableHead className="text-right">Amount (KSh)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refundRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-xs">{request.id?.substring(0,7)}...</TableCell>
                    <TableCell>
                        <Link href={`/admin/orders/${request.orderId}`} target="_blank" className="hover:text-primary hover:underline text-xs" title={`View Order ${request.orderId}`}>
                            {request.orderId.substring(0,7)}...
                        </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Image src={request.productImageUrl || 'https://placehold.co/32x32/cccccc/E0E0E0?text=P'} alt={request.productName} width={32} height={32} className="rounded-sm object-cover border border-border" data-ai-hint={request.dataAiHint || "product"}/>
                        <Link href={`/products/${request.productId}`} target="_blank" className="text-xs hover:text-primary hover:underline" title={`View Product ${request.productName}`}>
                            {request.productName.length > 25 ? request.productName.substring(0,22) + "..." : request.productName}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{request.customerName}</TableCell>
                    <TableCell className="text-xs">{new Date(request.requestedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-semibold">{request.requestedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`flex items-center justify-center gap-1.5 text-xs ${getStatusBadgeVariant(request.status)}`}>
                        {getStatusIcon(request.status)}
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                     {actionLoading[request.id!] ? <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /> : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Refund Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-primary shadow-lg">
                          <DropdownMenuItem asChild className="hover:bg-primary/10 hover:text-primary cursor-pointer">
                             <Link href={`/admin/orders/${request.orderId}`} target="_blank">
                                <Eye className="mr-2 h-4 w-4" /> View Order Details
                            </Link>
                          </DropdownMenuItem>
                          {/* Placeholder for viewing refund notes if available */}
                          {request.adminNotes && 
                            <DropdownMenuItem onClick={() => toast({title: `Notes for ${request.id?.substring(0,7)}...`, description: request.adminNotes})} className="hover:bg-primary/10 hover:text-primary cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" /> View Admin Notes
                            </DropdownMenuItem>
                          }
                          {request.status === 'Pending' && (
                            <>
                              <DropdownMenuSeparator className="bg-border/50"/>
                              <DropdownMenuItem onClick={() => handleUpdateRefundStatus(request.id!, 'Processing')} className="text-blue-400 hover:bg-blue-500/10 hover:!text-blue-300 focus:bg-blue-500/20 focus:!text-blue-300 cursor-pointer">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mark as Processing
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateRefundStatus(request.id!, 'Approved', 'Refund approved by admin.')} className="text-green-400 hover:bg-green-500/10 hover:!text-green-300 focus:bg-green-500/20 focus:!text-green-300 cursor-pointer">
                                <CheckCircle className="mr-2 h-4 w-4" /> Approve Refund
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateRefundStatus(request.id!, 'Denied', 'Refund denied by admin.')} className="text-destructive hover:bg-destructive/10 hover:!text-destructive focus:bg-destructive/20 focus:!text-destructive cursor-pointer">
                                <XCircle className="mr-2 h-4 w-4" /> Deny Refund
                              </DropdownMenuItem>
                            </>
                          )}
                           {request.status === 'Processing' && ( // If processing, can move to Approved or Denied
                            <>
                                <DropdownMenuSeparator className="bg-border/50"/>
                                <DropdownMenuItem onClick={() => handleUpdateRefundStatus(request.id!, 'Approved', request.adminNotes || 'Refund approved by admin after processing.')} className="text-green-400 hover:bg-green-500/10 hover:!text-green-300 focus:bg-green-500/20 focus:!text-green-300 cursor-pointer">
                                <CheckCircle className="mr-2 h-4 w-4" /> Approve Refund
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateRefundStatus(request.id!, 'Denied', request.adminNotes || 'Refund denied by admin after processing.')} className="text-destructive hover:bg-destructive/10 hover:!text-destructive focus:bg-destructive/20 focus:!text-destructive cursor-pointer">
                                <XCircle className="mr-2 h-4 w-4" /> Deny Refund
                                </DropdownMenuItem>
                            </>
                           )}
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
              <CheckCircle className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4 text-green-400" />
              <p className="text-xl font-semibold text-muted-foreground">No refund requests.</p>
              <p className="text-sm text-muted-foreground">All refund requests have been processed or there are no new requests.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

