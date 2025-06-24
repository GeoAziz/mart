
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Home, PlusCircle, Edit2, Trash2, MapPin, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Address as AddressType } from '@/app/api/users/me/addresses/route'; // Import Address type

const addressFormSchema = z.object({
  label: z.string().min(1, "Label is required (e.g., Home, Work)."),
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  addressLine1: z.string().min(5, "Street address is required."),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required."),
  postalCode: z.string().optional(),
  phone: z.string().min(10, "Phone number must be valid.").regex(/^\+?[0-9\s-()]{10,}$/, "Invalid phone number format."),
  isDefault: z.boolean().optional(),
});

type AddressFormData = z.infer<typeof addressFormSchema>;

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<AddressType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressType | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const { control, handleSubmit, reset, formState: { errors, isValid, isDirty } } = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
    mode: 'onChange',
    defaultValues: {
      label: '',
      fullName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      postalCode: '',
      phone: '',
      isDefault: false,
    },
  });

  const fetchAddresses = useCallback(async () => {
    if (!currentUser) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/users/me/addresses', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch addresses');
      const data: AddressType[] = await response.json();
      setAddresses(data);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      toast({ title: "Error", description: "Could not load your addresses.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);
  
  useEffect(() => {
    if (editingAddress) {
      reset({
        label: editingAddress.label,
        fullName: editingAddress.fullName,
        addressLine1: editingAddress.addressLine1,
        addressLine2: editingAddress.addressLine2 || '',
        city: editingAddress.city,
        postalCode: editingAddress.postalCode || '',
        phone: editingAddress.phone,
        isDefault: editingAddress.isDefault || false,
      });
    } else {
      reset({ label: '', fullName: '', addressLine1: '', city: '', phone: '', isDefault: addresses.length === 0, addressLine2: '', postalCode: '' });
    }
  }, [editingAddress, reset, addresses.length]);


  const handleFormSubmit = async (data: AddressFormData) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    const method = editingAddress ? 'PUT' : 'POST';
    const url = editingAddress 
      ? `/api/users/me/addresses/${editingAddress.id}` 
      : '/api/users/me/addresses';

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${editingAddress ? 'update' : 'add'} address.`);
      }
      toast({ title: `Address ${editingAddress ? 'Updated' : 'Added'}`, description: `Your address has been successfully ${editingAddress ? 'updated' : 'added'}.` });
      fetchAddresses(); // Refresh list
      setIsFormDialogOpen(false);
      setEditingAddress(null);
    } catch (error) {
      console.error(`Error ${editingAddress ? 'updating' : 'adding'} address:`, error);
      toast({ title: "Operation Failed", description: error instanceof Error ? error.message : "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeAddress = async (addressId: string) => {
    if (!currentUser || !confirm('Are you sure you want to remove this address?')) return;
    setIsLoading(true); // Use general loading for quick actions
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/users/me/addresses/${addressId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to remove address');
      toast({ title: 'Address Removed', description: 'The address has been removed.' });
      fetchAddresses(); // Refresh
    } catch (error) {
      toast({ title: "Error Removing Address", description: error instanceof Error ? error.message : "Could not remove address.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const setDefaultAddress = async (addressId: string) => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/users/me/addresses/${addressId}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ isDefault: true }),
      });
       if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set default address.');
      }
      toast({ title: 'Default Address Updated', description: 'The address has been set as default.' });
      fetchAddresses(); // Refresh
    } catch (error) {
       toast({ title: "Error Setting Default", description: error instanceof Error ? error.message : "Could not set default address.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingAddress(null);
    reset({ label: '', fullName: '', addressLine1: '', city: '', phone: '', isDefault: addresses.length === 0, addressLine2: '', postalCode: '' });
    setIsFormDialogOpen(true);
  };
  const openEditForm = (address: AddressType) => {
    setEditingAddress(address);
    setIsFormDialogOpen(true);
  };
  
  if (isLoading && addresses.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading addresses...</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <Dialog open={isFormDialogOpen} onOpenChange={(isOpen) => { setIsFormDialogOpen(isOpen); if (!isOpen) setEditingAddress(null); }}>
        <DialogContent className="sm:max-w-lg bg-card border-primary shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-glow-accent">{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
            <DialogDescription>
              {editingAddress ? 'Update your address details below.' : 'Enter the details for your new delivery address.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="label">Label <span className="text-destructive">*</span></Label>
              <Controller name="label" control={control} render={({ field }) => <Input id="label" placeholder="e.g., Home, Work" {...field} className={`bg-input border-primary focus:ring-accent ${errors.label ? 'border-destructive' : ''}`} />} />
              {errors.label && <p className="text-xs text-destructive flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.label.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
              <Controller name="fullName" control={control} render={({ field }) => <Input id="fullName" {...field} className={`bg-input border-primary focus:ring-accent ${errors.fullName ? 'border-destructive' : ''}`} />} />
              {errors.fullName && <p className="text-xs text-destructive flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.fullName.message}</p>}
            </div>
             <div className="space-y-1">
              <Label htmlFor="addressLine1">Address Line 1 <span className="text-destructive">*</span></Label>
              <Controller name="addressLine1" control={control} render={({ field }) => <Input id="addressLine1" {...field} className={`bg-input border-primary focus:ring-accent ${errors.addressLine1 ? 'border-destructive' : ''}`} />} />
              {errors.addressLine1 && <p className="text-xs text-destructive flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.addressLine1.message}</p>}
            </div>
             <div className="space-y-1">
              <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
              <Controller name="addressLine2" control={control} render={({ field }) => <Input id="addressLine2" {...field} value={field.value ?? ''} className={`bg-input border-primary focus:ring-accent ${errors.addressLine2 ? 'border-destructive' : ''}`} />} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                    <Controller name="city" control={control} render={({ field }) => <Input id="city" {...field} className={`bg-input border-primary focus:ring-accent ${errors.city ? 'border-destructive' : ''}`} />} />
                    {errors.city && <p className="text-xs text-destructive flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.city.message}</p>}
                </div>
                <div className="space-y-1">
                    <Label htmlFor="postalCode">Postal Code (Optional)</Label>
                    <Controller name="postalCode" control={control} render={({ field }) => <Input id="postalCode" {...field} value={field.value ?? ''} className={`bg-input border-primary focus:ring-accent ${errors.postalCode ? 'border-destructive' : ''}`} />} />
                </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
              <Controller name="phone" control={control} render={({ field }) => <Input id="phone" type="tel" {...field} className={`bg-input border-primary focus:ring-accent ${errors.phone ? 'border-destructive' : ''}`} />} />
              {errors.phone && <p className="text-xs text-destructive flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.phone.message}</p>}
            </div>
             <div className="flex items-center space-x-2 pt-2">
                <Controller name="isDefault" control={control} render={({ field }) => ( <Checkbox id="isDefault" checked={field.value} onCheckedChange={field.onChange} className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" /> )} />
                <Label htmlFor="isDefault" className="text-sm font-normal">Set as default delivery address</Label>
            </div>
          </form>
          <DialogFooter className="mt-2">
             <DialogClose asChild><Button type="button" variant="ghost" disabled={isSubmitting}>Cancel</Button></DialogClose>
            <Button type="submit" onClick={handleSubmit(handleFormSubmit)} className="bg-primary hover:bg-primary/90" disabled={isSubmitting || !isDirty || !isValid}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (editingAddress ? 'Save Changes' : 'Add Address')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline text-glow-primary">Address Book</CardTitle>
            <CardDescription className="text-muted-foreground">Manage your saved delivery addresses.</CardDescription>
          </div>
          <Button onClick={openAddForm} className="bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Address
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && addresses.length > 0 && <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto"/></div>}
          {!isLoading && addresses.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {addresses.map((address) => (
                <Card key={address.id} className={`bg-card border shadow-md ${address.isDefault ? 'border-primary glow-edge-primary' : 'border-border'}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center justify-between">
                      <span>{address.label} {address.isDefault && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full ml-2">Default</span>}</span>
                      <Home className="h-5 w-5 text-primary" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{address.fullName}</p>
                    <p>{address.addressLine1}</p>
                    {address.addressLine2 && <p>{address.addressLine2}</p>}
                    <p>{address.city}{address.postalCode ? `, ${address.postalCode}` : ''}</p>
                    <p>Phone: {address.phone}</p>
                  </CardContent>
                  <CardFooter className="flex justify-between items-center pt-4 border-t border-border/50">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditForm(address)} className="text-accent border-accent hover:bg-accent hover:text-accent-foreground" aria-label={`Edit ${address.label} address`}>
                        <Edit2 className="mr-1 h-4 w-4" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => removeAddress(address.id)} className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" disabled={isLoading} aria-label={`Remove ${address.label} address`}>
                        <Trash2 className="mr-1 h-4 w-4" /> Remove
                      </Button>
                    </div>
                    {!address.isDefault && (
                       <Button variant="link" size="sm" onClick={() => setDefaultAddress(address.id)} className="text-primary hover:underline p-0 h-auto" disabled={isLoading}>
                         Set as Default
                       </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            !isLoading && (
                <div className="text-center py-12">
                <MapPin className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-xl font-semibold text-muted-foreground">No addresses saved.</p>
                <p className="text-sm text-muted-foreground">Add an address for faster checkout.</p>
                <Button onClick={openAddForm} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary">
                    <PlusCircle className="mr-2 h-5 w-5" /> Add New Address
                </Button>
                </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
