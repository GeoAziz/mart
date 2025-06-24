
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit3, Trash2, Ticket, Loader2, Calendar as CalendarIcon, AlertCircle, DollarSign, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Promotion } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const promotionSchema = z.object({
    code: z.string().min(4, "Code must be at least 4 characters.").max(20, "Code cannot exceed 20 characters.").transform(v => v.toUpperCase()),
    description: z.string().min(5, "Description is required."),
    type: z.enum(['percentage', 'fixed_amount'], { required_error: "Type is required."}),
    value: z.number().positive("Value must be a positive number."),
    isActive: z.boolean(),
    startDate: z.date({ required_error: "Start date is required."}),
    endDate: z.date().optional(),
    usageLimit: z.number().int().positive().optional(),
    minPurchaseAmount: z.number().positive().optional(),
}).refine(data => {
    if (data.type === 'percentage' && data.value > 100) {
        return false;
    }
    return true;
}, {
    message: "Percentage value cannot exceed 100",
    path: ["value"],
});

type PromotionFormData = z.infer<typeof promotionSchema>;

const getStatusBadgeVariant = (isActive: boolean, endDate?: Date) => {
    if (!isActive) return 'bg-gray-500/20 text-gray-300 border-gray-400';
    if (endDate && new Date() > endDate) return 'bg-red-500/20 text-red-300 border-red-400';
    return 'bg-green-500/20 text-green-300 border-green-400';
}

const getStatusText = (isActive: boolean, endDate?: Date) => {
    if (!isActive) return 'Inactive';
    if (endDate && new Date() > endDate) return 'Expired';
    return 'Active';
}


export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(null);
  
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const form = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
    mode: 'onChange',
    defaultValues: {
        isActive: true,
        type: 'percentage'
    }
  });

  const { control, handleSubmit, reset, watch, formState: { errors, isValid } } = form;

  const fetchPromotions = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/promotions', { headers: { 'Authorization': `Bearer ${token}` }});
      if (!response.ok) throw new Error('Failed to fetch promotions');
      const data: Promotion[] = await response.json();
      setPromotions(data.map(p => ({
          ...p,
          startDate: new Date(p.startDate),
          endDate: p.endDate ? new Date(p.endDate) : undefined,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
      })));
    } catch (error) {
      console.error("Error fetching promotions:", error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : "Could not load promotions.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);
  
  useEffect(() => {
    if (isFormOpen) {
        if (editingPromotion) {
            reset({
                code: editingPromotion.code,
                description: editingPromotion.description,
                type: editingPromotion.type,
                value: editingPromotion.value,
                isActive: editingPromotion.isActive,
                startDate: new Date(editingPromotion.startDate),
                endDate: editingPromotion.endDate ? new Date(editingPromotion.endDate) : undefined,
                usageLimit: editingPromotion.usageLimit,
                minPurchaseAmount: editingPromotion.minPurchaseAmount,
            });
        } else {
            reset({
                code: '',
                description: '',
                isActive: true,
                type: 'percentage',
                value: undefined,
                startDate: new Date(),
                endDate: undefined,
                usageLimit: undefined,
                minPurchaseAmount: undefined,
            });
        }
    }
  }, [isFormOpen, editingPromotion, reset]);


  const handleFormSubmit = async (data: PromotionFormData) => {
    if (!currentUser) {
        toast({ title: "Not Authenticated", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    const method = editingPromotion ? 'PUT' : 'POST';
    const url = editingPromotion ? `/api/promotions/${editingPromotion.id}` : '/api/promotions';

    try {
        const token = await currentUser.getIdToken();
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to ${editingPromotion ? 'update' : 'create'} promotion`);
        }
        toast({ title: `Promotion ${editingPromotion ? 'Updated' : 'Created'}`, description: `Code "${data.code}" has been saved.` });
        setIsFormOpen(false);
        fetchPromotions();
    } catch (error) {
        toast({ title: 'Error', description: error instanceof Error ? error.message : "Could not save promotion.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeletePromotion = async () => {
    if (!promotionToDelete || !currentUser) return;
    setIsSubmitting(true);
    try {
        const token = await currentUser.getIdToken();
        await fetch(`/api/promotions/${promotionToDelete.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        toast({ title: 'Promotion Deleted', description: `Code "${promotionToDelete.code}" has been removed.`, variant: 'destructive' });
        setPromotionToDelete(null);
        fetchPromotions();
    } catch (error) {
        toast({ title: 'Error', description: error instanceof Error ? error.message : "Could not delete promotion.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingPromotion(null); }}>
        <DialogContent className="sm:max-w-lg bg-card border-primary shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-glow-accent">{editingPromotion ? 'Edit Promotion' : 'Create New Promotion'}</DialogTitle>
            <DialogDescription>Fill in the details for your discount code.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
            <div className="space-y-1">
                <Label htmlFor="code">Code <span className="text-destructive">*</span></Label>
                <Controller name="code" control={control} render={({ field }) => <Input {...field} placeholder="e.g. SUMMER20" className={`uppercase ${errors.code ? 'border-destructive' : ''}`} disabled={isSubmitting}/>} />
                {errors.code && <p className="text-xs text-destructive flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.code.message}</p>}
            </div>
             <div className="space-y-1">
                <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                <Controller name="description" control={control} render={({ field }) => <Input {...field} placeholder="e.g. 20% off for summer sale" className={`${errors.description ? 'border-destructive' : ''}`} disabled={isSubmitting}/>} />
                {errors.description && <p className="text-xs text-destructive flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="type">Type <span className="text-destructive">*</span></Label>
                    <Controller name="type" control={control} render={({ field }) => (
                         <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                            <SelectTrigger className={`${errors.type ? 'border-destructive' : ''}`}><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed_amount">Fixed Amount (KSh)</SelectItem></SelectContent>
                        </Select>
                    )} />
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="value">Value <span className="text-destructive">*</span></Label>
                    <div className="relative">
                        {watch('type') === 'percentage' ? <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /> : <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                        <Controller name="value" control={control} render={({ field }) => <Input {...field} type="number" placeholder={watch('type') === 'percentage' ? "20" : "500"} onChange={e => field.onChange(parseFloat(e.target.value))} className={`pl-9 ${errors.value ? 'border-destructive' : ''}`} disabled={isSubmitting}/>} />
                    </div>
                    {errors.value && <p className="text-xs text-destructive flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.value.message}</p>}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label>Start Date <span className="text-destructive">*</span></Label>
                    <Controller name="startDate" control={control} render={({ field }) => (
                        <Popover><PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground", errors.startDate && "border-destructive")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={isSubmitting}/></PopoverContent></Popover>
                    )} />
                </div>
                 <div className="space-y-1">
                    <Label>End Date (Optional)</Label>
                     <Controller name="endDate" control={control} render={({ field }) => (
                        <Popover><PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < watch('startDate') || isSubmitting} /></PopoverContent></Popover>
                    )} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="usageLimit">Total Usage Limit (Optional)</Label>
                    <Controller name="usageLimit" control={control} render={({ field }) => <Input {...field} type="number" onChange={e => field.onChange(parseInt(e.target.value))} placeholder="e.g. 1000" disabled={isSubmitting}/>} />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="minPurchaseAmount">Min. Purchase (KSh, Optional)</Label>
                     <Controller name="minPurchaseAmount" control={control} render={({ field }) => <Input {...field} type="number" onChange={e => field.onChange(parseFloat(e.target.value))} placeholder="e.g. 2000" disabled={isSubmitting}/>} />
                </div>
            </div>
             <div className="flex items-center space-x-2 pt-2">
                <Controller name="isActive" control={control} render={({ field }) => <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting}/>} />
                <Label htmlFor="isActive" className="font-normal">Active</Label>
            </div>
          </form>
           <DialogFooter>
                <DialogClose asChild><Button variant="ghost" disabled={isSubmitting}>Cancel</Button></DialogClose>
                <Button type="submit" onClick={handleSubmit(handleFormSubmit)} className="bg-primary hover:bg-primary/90" disabled={isSubmitting || !isValid}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (editingPromotion ? 'Save Changes' : 'Create Promotion')}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
              <Ticket className="mr-3 h-6 w-6 text-primary" /> Promotions Management
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Create and manage discount codes for your marketplace.
            </CardDescription>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Promotion
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
          ) : promotions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-primary">{p.code}</TableCell>
                    <TableCell className="capitalize">{p.type.replace('_', ' ')}</TableCell>
                    <TableCell>{p.type === 'percentage' ? `${p.value}%` : `KSh ${p.value.toLocaleString()}`}</TableCell>
                    <TableCell>{p.timesUsed} / {p.usageLimit || '∞'}</TableCell>
                    <TableCell><Badge variant="outline" className={getStatusBadgeVariant(p.isActive, p.endDate)}>{getStatusText(p.isActive, p.endDate)}</Badge></TableCell>
                    <TableCell>{p.endDate ? format(new Date(p.endDate), 'PPP') : 'Never'}</TableCell>
                    <TableCell className="text-right space-x-2">
                       <Button variant="outline" size="icon" className="h-8 w-8 text-accent border-accent hover:bg-accent hover:text-accent-foreground" onClick={() => { setEditingPromotion(p); setIsFormOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                       <AlertDialog open={!!promotionToDelete && promotionToDelete.id === p.id} onOpenChange={(isOpen) => !isOpen && setPromotionToDelete(null)}>
                         <AlertDialogTrigger asChild>
                           <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setPromotionToDelete(p)}><Trash2 className="h-4 w-4" /></Button>
                         </AlertDialogTrigger>
                         <AlertDialogContent>
                           <AlertDialogHeader>
                             <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                             <AlertDialogDescription>This will permanently delete the promotion code <strong className="text-primary">{p.code}</strong>. This action cannot be undone.</AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                             <AlertDialogCancel onClick={() => setPromotionToDelete(null)}>Cancel</AlertDialogCancel>
                             <AlertDialogAction onClick={handleDeletePromotion} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Delete'}
                             </AlertDialogAction>
                           </AlertDialogFooter>
                         </AlertDialogContent>
                       </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Ticket className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">No promotions found.</p>
              <p className="text-sm text-muted-foreground">Start by creating your first promotion code.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
