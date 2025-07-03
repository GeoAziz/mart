"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';

const steps = [
  'Store Profile',
  'Add First Product',
  'Payout Info',
  'Finish'
];

export default function VendorOnboardingWizard() {
  const [step, setStep] = useState(0);
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [payoutMpesa, setPayoutMpesa] = useState('');
  const router = useRouter();

  const handleNext = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="container mx-auto py-12 max-w-xl">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle>Vendor Onboarding</CardTitle>
          <CardDescription>Step {step + 1} of {steps.length}: {steps[step]}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <>
              <label className="block mb-2 font-medium">Store Name</label>
              <Input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Your Store Name" />
              <label className="block mt-4 mb-2 font-medium">Store Description</label>
              <Textarea value={storeDescription} onChange={e => setStoreDescription(e.target.value)} placeholder="Describe your store..." />
            </>
          )}
          {step === 1 && (
            <>
              <label className="block mb-2 font-medium">First Product Name</label>
              <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Product Name" />
              <label className="block mt-4 mb-2 font-medium">Price (KSh)</label>
              <Input value={productPrice} onChange={e => setProductPrice(e.target.value)} placeholder="1000" type="number" />
            </>
          )}
          {step === 2 && (
            <>
              <label className="block mb-2 font-medium">M-Pesa Number for Payouts</label>
              <Input value={payoutMpesa} onChange={e => setPayoutMpesa(e.target.value)} placeholder="07XXXXXXXX" />
            </>
          )}
          {step === 3 && (
            <>
              <p className="mb-4">You're all set! You can now start selling on ZilaCart.</p>
              <Button className="w-full" onClick={() => router.push('/vendor')}>Go to Vendor Dashboard</Button>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {step > 0 && <Button variant="outline" onClick={handleBack}>Back</Button>}
          {step < steps.length - 1 && <Button onClick={handleNext}>Next</Button>}
        </CardFooter>
      </Card>
    </div>
  );
}
