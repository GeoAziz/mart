'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MapPin, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { Address } from '@/lib/types';

interface AddressSelectorProps {
  onSelectAddress: (address: Address | null) => void;
  selectedAddressId?: string;
}

export function AddressSelector({ onSelectAddress, selectedAddressId }: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!currentUser) return;
      
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/users/me/addresses', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setAddresses(data);
        }
      } catch (error) {
        console.error('Failed to fetch addresses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAddresses();
  }, [currentUser]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading saved addresses...</div>;
  }

  if (addresses.length === 0) {
    return null; // Show manual form
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Delivery Address
        </h3>
      </div>

      <Select 
        value={selectedAddressId || 'new'}
        onValueChange={(value) => {
          if (value === 'new') {
            onSelectAddress(null);
          } else {
            const address = addresses.find(a => a.id === value);
            onSelectAddress(address || null);
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a saved address" />
        </SelectTrigger>
        <SelectContent>
          {addresses.map((address) => (
            <SelectItem key={address.id!} value={address.id!}>
              <div className="flex flex-col items-start">
                <span className="font-medium">{address.fullName}</span>
                <span className="text-sm text-muted-foreground">
                  {address.address}, {address.city}
                </span>
              </div>
            </SelectItem>
          ))}
          <SelectItem value="new">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Add New Address</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
