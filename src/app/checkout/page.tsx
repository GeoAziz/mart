'use client';

import CheckoutWizard from '@/components/checkout/CheckoutWizard';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CheckoutPage() {
  const { cart, isCartLoading, currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Consolidated redirect logic - only redirect once everything is loaded
  useEffect(() => {
    // Wait until both auth and cart are fully loaded
    if (authLoading || isCartLoading) return;
    
    // Prevent multiple redirects
    if (isRedirecting) return;

    if (!currentUser) {
      setIsRedirecting(true);
      router.replace('/auth/login?redirect=/checkout');
      return;
    }
    
    if (cart.length === 0) {
      setIsRedirecting(true);
      router.replace('/products');
      return;
    }
  }, [cart, isCartLoading, currentUser, authLoading, router, isRedirecting]);

  // Show loading state while auth or cart is loading, or while redirecting
  if (authLoading || isCartLoading || isRedirecting) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">Loading checkout...</p>
      </div>
    );
  }

  // Additional safety check - don't render checkout if conditions aren't met
  if (!currentUser || cart.length === 0) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-headline font-bold text-glow-primary">Secure Checkout</h1>
        <p className="text-lg text-muted-foreground mt-2">Almost there! Complete your purchase.</p>
      </div>
      <CheckoutWizard />
    </div>
  );
}
