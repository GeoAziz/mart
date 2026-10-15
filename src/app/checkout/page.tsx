'use client';

import CheckoutWizard from '@/components/checkout/CheckoutWizard';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
    
    // Allow checkout to stay mounted if an order has just completed or is in checkout
    if (cart.length === 0 && !window.location.search.includes('orderId')) {
      setIsRedirecting(true);
      router.replace('/products');
      return;
    }
  }, [cart, isCartLoading, currentUser, authLoading, router, isRedirecting]);

  // Show loading state while auth or cart is loading, or while redirecting
  if (authLoading || isCartLoading || isRedirecting) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <Skeleton className="h-10 w-48 mx-auto mb-4" />
          <Skeleton className="h-6 w-64 mx-auto" />
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Wizard steps skeleton */}
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
          <div>
            {/* Order summary skeleton */}
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // Additional safety check - don't render checkout if not logged in
  if (!currentUser) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <Skeleton className="h-10 w-48 mx-auto mb-4" />
          <Skeleton className="h-6 w-64 mx-auto" />
        </div>
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
