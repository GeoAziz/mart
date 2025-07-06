'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import * as Icons from '@/components/icons';
import { Loader2 } from 'lucide-react';

interface PaymentSettings {
  mpesa: {
    enabled: boolean;
    businessNumber: string;
    accountNumber: string;
    callbackUrl: string;
  };
  bankTransfer: {
    enabled: boolean;
    accountName: string;
    accountNumber: string;
    bankName: string;
    branchName: string;
    swiftCode: string;
  };
  paypal: {
    enabled: boolean;
    email: string;
    clientId: string;
  };
  stripe: {
    enabled: boolean;
    publishableKey: string;
    accountId: string;
  };
  autoPayouts: {
    enabled: boolean;
    threshold: number;
    frequency: 'daily' | 'weekly' | 'monthly';
  };
}

const defaultSettings: PaymentSettings = {
  mpesa: {
    enabled: false,
    businessNumber: '',
    accountNumber: '',
    callbackUrl: '',
  },
  bankTransfer: {
    enabled: false,
    accountName: '',
    accountNumber: '',
    bankName: '',
    branchName: '',
    swiftCode: '',
  },
  paypal: {
    enabled: false,
    email: '',
    clientId: '',
  },
  stripe: {
    enabled: false,
    publishableKey: '',
    accountId: '',
  },
  autoPayouts: {
    enabled: false,
    threshold: 1000,
    frequency: 'weekly',
  },
};

export default function PaymentSettingsPage() {
  const [settings, setSettings] = useState<PaymentSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const { currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentUser) return;
      
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/vendor/payment-settings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch payment settings');
        
        const data = await response.json();
        setSettings(data);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load payment settings',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [currentUser, toast]);

  const handleInputChange = (
    section: keyof PaymentSettings,
    field: string,
    value: string | boolean | number
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSaving(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/vendor/payment-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) throw new Error('Failed to update payment settings');

      toast({
        title: 'Success',
        description: 'Payment settings updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update payment settings',
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
      {/* M-Pesa Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">M-Pesa Settings</h2>
            <Switch
              checked={settings.mpesa.enabled}
              onCheckedChange={(checked) => 
                handleInputChange('mpesa', 'enabled', checked)
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mpesaBusinessNumber">Business Number</Label>
              <Input
                id="mpesaBusinessNumber"
                value={settings.mpesa.businessNumber}
                onChange={(e) => 
                  handleInputChange('mpesa', 'businessNumber', e.target.value)
                }
                disabled={!settings.mpesa.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mpesaAccountNumber">Account Number</Label>
              <Input
                id="mpesaAccountNumber"
                value={settings.mpesa.accountNumber}
                onChange={(e) => 
                  handleInputChange('mpesa', 'accountNumber', e.target.value)
                }
                disabled={!settings.mpesa.enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Transfer Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Bank Transfer Settings</h2>
            <Switch
              checked={settings.bankTransfer.enabled}
              onCheckedChange={(checked) => 
                handleInputChange('bankTransfer', 'enabled', checked)
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankAccountName">Account Name</Label>
              <Input
                id="bankAccountName"
                value={settings.bankTransfer.accountName}
                onChange={(e) => 
                  handleInputChange('bankTransfer', 'accountName', e.target.value)
                }
                disabled={!settings.bankTransfer.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountNumber">Account Number</Label>
              <Input
                id="bankAccountNumber"
                value={settings.bankTransfer.accountNumber}
                onChange={(e) => 
                  handleInputChange('bankTransfer', 'accountNumber', e.target.value)
                }
                disabled={!settings.bankTransfer.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={settings.bankTransfer.bankName}
                onChange={(e) => 
                  handleInputChange('bankTransfer', 'bankName', e.target.value)
                }
                disabled={!settings.bankTransfer.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchName">Branch Name</Label>
              <Input
                id="branchName"
                value={settings.bankTransfer.branchName}
                onChange={(e) => 
                  handleInputChange('bankTransfer', 'branchName', e.target.value)
                }
                disabled={!settings.bankTransfer.enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PayPal Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">PayPal Settings</h2>
            <Switch
              checked={settings.paypal.enabled}
              onCheckedChange={(checked) => 
                handleInputChange('paypal', 'enabled', checked)
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paypalEmail">PayPal Email</Label>
              <Input
                id="paypalEmail"
                type="email"
                value={settings.paypal.email}
                onChange={(e) => 
                  handleInputChange('paypal', 'email', e.target.value)
                }
                disabled={!settings.paypal.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paypalClientId">Client ID</Label>
              <Input
                id="paypalClientId"
                value={settings.paypal.clientId}
                onChange={(e) => 
                  handleInputChange('paypal', 'clientId', e.target.value)
                }
                disabled={!settings.paypal.enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Stripe Settings</h2>
            <Switch
              checked={settings.stripe.enabled}
              onCheckedChange={(checked) => 
                handleInputChange('stripe', 'enabled', checked)
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stripePublishableKey">Publishable Key</Label>
              <Input
                id="stripePublishableKey"
                value={settings.stripe.publishableKey}
                onChange={(e) => 
                  handleInputChange('stripe', 'publishableKey', e.target.value)
                }
                disabled={!settings.stripe.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripeAccountId">Account ID</Label>
              <Input
                id="stripeAccountId"
                value={settings.stripe.accountId}
                onChange={(e) => 
                  handleInputChange('stripe', 'accountId', e.target.value)
                }
                disabled={!settings.stripe.enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto Payouts Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Auto Payouts</h2>
            <Switch
              checked={settings.autoPayouts.enabled}
              onCheckedChange={(checked) => 
                handleInputChange('autoPayouts', 'enabled', checked)
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payoutThreshold">Payout Threshold (KSh)</Label>
              <Input
                id="payoutThreshold"
                type="number"
                value={settings.autoPayouts.threshold}
                onChange={(e) => 
                  handleInputChange('autoPayouts', 'threshold', parseInt(e.target.value))
                }
                disabled={!settings.autoPayouts.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payoutFrequency">Payout Frequency</Label>
              <select
                id="payoutFrequency"
                className="w-full p-2 border rounded-md"
                value={settings.autoPayouts.frequency}
                onChange={(e) => 
                  handleInputChange('autoPayouts', 'frequency', e.target.value)
                }
                disabled={!settings.autoPayouts.enabled}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Payment Settings
        </Button>
      </div>
    </form>
  );
}
