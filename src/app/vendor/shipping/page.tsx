'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';

interface ShippingZone {
  id: string;
  name: string;
  regions: string[];
  rates: ShippingRate[];
}

interface ShippingRate {
  id: string;
  name: string;
  price: number;
  minWeight?: number;
  maxWeight?: number;
  minOrder?: number;
  maxOrder?: number;
  estimatedDays: string;
}

interface ShippingSettings {
  enabled: boolean;
  freeShippingThreshold?: number;
  zones: ShippingZone[];
  defaultZone: string;
  returnAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
}

const defaultSettings: ShippingSettings = {
  enabled: true,
  freeShippingThreshold: 5000,
  zones: [],
  defaultZone: '',
  returnAddress: {
    name: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
  }
};

export default function ShippingPage() {
  const [settings, setSettings] = useState<ShippingSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newZone, setNewZone] = useState<Partial<ShippingZone>>({
    name: '',
    regions: [],
    rates: []
  });

  const { currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentUser) return;

      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/vendor/shipping-settings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch shipping settings');
        }

        const data = await response.json();
        setSettings(data);
      } catch (error) {
        console.error('Error fetching shipping settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load shipping settings',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [currentUser, toast]);

  const handleSave = async () => {
    if (!currentUser) return;

    setIsSaving(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/vendor/shipping-settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save shipping settings');
      }

      toast({
        title: 'Success',
        description: 'Shipping settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving shipping settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save shipping settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (
    section: string,
    field: string,
    value: string | number | boolean
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: section === 'returnAddress'
        ? { ...prev.returnAddress, [field]: value }
        : value
    }));
  };

  const handleAddZone = () => {
    if (!newZone.name) return;

    const zone: ShippingZone = {
      id: crypto.randomUUID(),
      name: newZone.name,
      regions: newZone.regions || [],
      rates: []
    };

    setSettings(prev => ({
      ...prev,
      zones: [...prev.zones, zone]
    }));

    setNewZone({
      name: '',
      regions: [],
      rates: []
    });
  };

  const handleDeleteZone = (zoneId: string) => {
    setSettings(prev => ({
      ...prev,
      zones: prev.zones.filter(zone => zone.id !== zoneId)
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shipping Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Shipping</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle shipping functionality for your store
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) =>
                  handleInputChange('enabled', '', checked)
                }
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <Label>Free Shipping Threshold (KSh)</Label>
                <Input
                  type="number"
                  value={settings.freeShippingThreshold || ''}
                  onChange={(e) =>
                    handleInputChange(
                      'freeShippingThreshold',
                      '',
                      parseFloat(e.target.value)
                    )
                  }
                  placeholder="e.g., 5000"
                  className="max-w-xs"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Orders above this amount qualify for free shipping
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Return Address</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Business Name</Label>
                    <Input
                      value={settings.returnAddress.name}
                      onChange={(e) =>
                        handleInputChange('returnAddress', 'name', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Street Address</Label>
                    <Input
                      value={settings.returnAddress.street}
                      onChange={(e) =>
                        handleInputChange('returnAddress', 'street', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      value={settings.returnAddress.city}
                      onChange={(e) =>
                        handleInputChange('returnAddress', 'city', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>State/Province</Label>
                    <Input
                      value={settings.returnAddress.state}
                      onChange={(e) =>
                        handleInputChange('returnAddress', 'state', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Postal Code</Label>
                    <Input
                      value={settings.returnAddress.postalCode}
                      onChange={(e) =>
                        handleInputChange('returnAddress', 'postalCode', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={settings.returnAddress.phone}
                      onChange={(e) =>
                        handleInputChange('returnAddress', 'phone', e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipping Zones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>New Zone Name</Label>
                <Input
                  value={newZone.name}
                  onChange={(e) =>
                    setNewZone((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Nairobi Metro"
                />
              </div>
              <Button
                onClick={handleAddZone}
                disabled={!newZone.name}
                className="mt-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Zone
              </Button>
            </div>

            {settings.zones.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone Name</TableHead>
                    <TableHead>Regions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.zones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell>{zone.name}</TableCell>
                      <TableCell>
                        {zone.regions.join(', ') || 'No regions defined'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteZone(zone.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No shipping zones defined yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="min-w-[120px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
