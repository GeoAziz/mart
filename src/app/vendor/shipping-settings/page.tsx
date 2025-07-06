'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, X } from 'lucide-react';

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

export default function ShippingSettingsPage() {
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
        
        if (!response.ok) throw new Error('Failed to fetch shipping settings');
        
        const data = await response.json();
        setSettings(data);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load shipping settings',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [currentUser, toast]);

  const handleInputChange = (
    section: string,
    field: string,
    value: string | number | boolean
  ) => {
    if (section === 'returnAddress') {
      setSettings(prev => ({
        ...prev,
        returnAddress: {
          ...prev.returnAddress,
          [field]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [field]: value
      }));
    }
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

    setNewZone({ name: '', regions: [], rates: [] });
  };

  const handleDeleteZone = (zoneId: string) => {
    setSettings(prev => ({
      ...prev,
      zones: prev.zones.filter(zone => zone.id !== zoneId)
    }));
  };

  const handleAddRate = (zoneId: string) => {
    const newRate: ShippingRate = {
      id: crypto.randomUUID(),
      name: 'Standard Shipping',
      price: 0,
      estimatedDays: '3-5'
    };

    setSettings(prev => ({
      ...prev,
      zones: prev.zones.map(zone => {
        if (zone.id === zoneId) {
          return {
            ...zone,
            rates: [...zone.rates, newRate]
          };
        }
        return zone;
      })
    }));
  };

  const handleUpdateRate = (
    zoneId: string,
    rateId: string,
    field: keyof ShippingRate,
    value: string | number
  ) => {
    setSettings(prev => ({
      ...prev,
      zones: prev.zones.map(zone => {
        if (zone.id === zoneId) {
          return {
            ...zone,
            rates: zone.rates.map(rate => {
              if (rate.id === rateId) {
                return {
                  ...rate,
                  [field]: value
                };
              }
              return rate;
            })
          };
        }
        return zone;
      })
    }));
  };

  const handleDeleteRate = (zoneId: string, rateId: string) => {
    setSettings(prev => ({
      ...prev,
      zones: prev.zones.map(zone => {
        if (zone.id === zoneId) {
          return {
            ...zone,
            rates: zone.rates.filter(rate => rate.id !== rateId)
          };
        }
        return zone;
      })
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSaving(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/vendor/shipping-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) throw new Error('Failed to update shipping settings');

      toast({
        title: 'Success',
        description: 'Shipping settings updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update shipping settings',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">General Shipping Settings</h2>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => 
                handleInputChange('general', 'enabled', checked)
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="freeShippingThreshold">
              Free Shipping Threshold (KSh)
            </Label>
            <Input
              id="freeShippingThreshold"
              type="number"
              value={settings.freeShippingThreshold || ''}
              onChange={(e) => 
                handleInputChange('general', 'freeShippingThreshold', parseFloat(e.target.value))
              }
              placeholder="Enter amount for free shipping"
              disabled={!settings.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Return Address */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">Return Address</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="returnName">Business Name</Label>
              <Input
                id="returnName"
                value={settings.returnAddress.name}
                onChange={(e) => 
                  handleInputChange('returnAddress', 'name', e.target.value)
                }
                disabled={!settings.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnPhone">Phone</Label>
              <Input
                id="returnPhone"
                value={settings.returnAddress.phone}
                onChange={(e) => 
                  handleInputChange('returnAddress', 'phone', e.target.value)
                }
                disabled={!settings.enabled}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="returnStreet">Street Address</Label>
              <Input
                id="returnStreet"
                value={settings.returnAddress.street}
                onChange={(e) => 
                  handleInputChange('returnAddress', 'street', e.target.value)
                }
                disabled={!settings.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnCity">City</Label>
              <Input
                id="returnCity"
                value={settings.returnAddress.city}
                onChange={(e) => 
                  handleInputChange('returnAddress', 'city', e.target.value)
                }
                disabled={!settings.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnState">State/Province</Label>
              <Input
                id="returnState"
                value={settings.returnAddress.state}
                onChange={(e) => 
                  handleInputChange('returnAddress', 'state', e.target.value)
                }
                disabled={!settings.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnPostal">Postal Code</Label>
              <Input
                id="returnPostal"
                value={settings.returnAddress.postalCode}
                onChange={(e) => 
                  handleInputChange('returnAddress', 'postalCode', e.target.value)
                }
                disabled={!settings.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnCountry">Country</Label>
              <Input
                id="returnCountry"
                value={settings.returnAddress.country}
                onChange={(e) => 
                  handleInputChange('returnAddress', 'country', e.target.value)
                }
                disabled={!settings.enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Zones */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">Shipping Zones</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Zone */}
          <div className="flex gap-4">
            <Input
              placeholder="New Zone Name"
              value={newZone.name}
              onChange={(e) => setNewZone(prev => ({ ...prev, name: e.target.value }))}
              disabled={!settings.enabled}
            />
            <Button
              type="button"
              onClick={handleAddZone}
              disabled={!settings.enabled || !newZone.name}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Zone
            </Button>
          </div>

          {/* Existing Zones */}
          <div className="space-y-6">
            {settings.zones.map(zone => (
              <div key={zone.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">{zone.name}</h3>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteZone(zone.id)}
                    disabled={!settings.enabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Shipping Rates for this Zone */}
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddRate(zone.id)}
                    disabled={!settings.enabled}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rate
                  </Button>

                  {zone.rates.map(rate => (
                    <div key={rate.id} className="grid grid-cols-4 gap-4 items-center border-t pt-4">
                      <div className="space-y-2">
                        <Label>Rate Name</Label>
                        <Input
                          value={rate.name}
                          onChange={(e) => 
                            handleUpdateRate(zone.id, rate.id, 'name', e.target.value)
                          }
                          disabled={!settings.enabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Price (KSh)</Label>
                        <Input
                          type="number"
                          value={rate.price}
                          onChange={(e) => 
                            handleUpdateRate(zone.id, rate.id, 'price', parseFloat(e.target.value))
                          }
                          disabled={!settings.enabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estimated Days</Label>
                        <Input
                          value={rate.estimatedDays}
                          onChange={(e) => 
                            handleUpdateRate(zone.id, rate.id, 'estimatedDays', e.target.value)
                          }
                          placeholder="e.g., 3-5"
                          disabled={!settings.enabled}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRate(zone.id, rate.id)}
                          disabled={!settings.enabled}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving || !settings.enabled}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Shipping Settings
        </Button>
      </div>
    </form>
  );
}
